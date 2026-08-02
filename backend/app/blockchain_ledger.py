"""
Feature 25: Blockchain Attendance Ledger
Tamper-proof attendance records using SHA-256 hash chaining.
Each block contains attendance records. Any tampering breaks the chain.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime, timezone, timedelta
import hashlib, json

from . import models, security, crud, schemas
from .database import get_db

IST = timezone(timedelta(hours=5, minutes=30))
router = APIRouter()


def _compute_hash(index: int, prev_hash: str, payload: dict, nonce: int = 0) -> str:
    data = f"{index}{prev_hash}{json.dumps(payload, sort_keys=True)}{nonce}"
    return hashlib.sha256(data.encode()).hexdigest()


def _get_last_block(db: Session, institution_id: int) -> Optional[models.BlockchainBlock]:
    return db.query(models.BlockchainBlock).filter(
        models.BlockchainBlock.institution_id == institution_id
    ).order_by(models.BlockchainBlock.block_index.desc()).first()


def _compute_merkle_root(records: list) -> str:
    """Simple merkle root from list of records."""
    if not records:
        return hashlib.sha256(b"empty").hexdigest()
    hashes = [hashlib.sha256(json.dumps(r, sort_keys=True).encode()).hexdigest() for r in records]
    while len(hashes) > 1:
        if len(hashes) % 2 != 0:
            hashes.append(hashes[-1])
        hashes = [hashlib.sha256((hashes[i] + hashes[i+1]).encode()).hexdigest()
                  for i in range(0, len(hashes), 2)]
    return hashes[0]


@router.post("/commit")
def commit_attendance_to_blockchain(
    payload: dict,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user),
):
    """
    Commit today's attendance records as a new blockchain block.
    Admin only — typically run at end of day.
    """
    if current_user.role not in ("admin", "hod"):
        raise HTTPException(status_code=403, detail="Admin or HOD access only.")

    date_str = payload.get("date") or datetime.now(IST).strftime("%d/%m/%Y")

    # Fetch attendance records for the date
    logs = db.query(models.AttendanceModel).filter(
        models.AttendanceModel.institution_id == current_user.institution_id,
        models.AttendanceModel.date == date_str,
    ).all()

    if not logs:
        raise HTTPException(status_code=404, detail=f"No attendance records found for {date_str}.")

    records = [
        {
            "id": l.id, "roll": l.roll, "name": l.name,
            "dep": l.department, "time": l.time, "date": l.date,
            "status": l.attendance, "subject_id": l.subject_id,
        }
        for l in logs
    ]

    last_block = _get_last_block(db, current_user.institution_id)
    prev_hash = last_block.block_hash if last_block else "0" * 64
    new_index = (last_block.block_index + 1) if last_block else 0

    merkle = _compute_merkle_root(records)
    block_payload = {
        "date": date_str,
        "institution_id": current_user.institution_id,
        "record_count": len(records),
        "merkle_root": merkle,
        "records": records,
    }
    block_hash = _compute_hash(new_index, prev_hash, block_payload)

    block = models.BlockchainBlock(
        institution_id=current_user.institution_id,
        block_index=new_index,
        block_hash=block_hash,
        prev_hash=prev_hash,
        merkle_root=merkle,
        payload_json=json.dumps(block_payload),
        created_by=current_user.email,
    )
    db.add(block)
    db.commit()

    crud.create_audit_log(
        db,
        log=schemas.AuditLogCreate(
            user_email=current_user.email,
            action=f"Committed {len(records)} attendance records for {date_str} to blockchain (Block #{new_index}, Hash: {block_hash[:16]}...)."
        ),
        institution_id=current_user.institution_id,
    )

    return {
        "message": "Block committed to ledger.",
        "block_index": new_index,
        "block_hash": block_hash,
        "merkle_root": merkle,
        "records_committed": len(records),
        "date": date_str,
    }


@router.get("/chain")
def get_blockchain(
    limit: int = 20,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user),
):
    """View the attendance blockchain for this institution."""
    blocks = db.query(models.BlockchainBlock).filter(
        models.BlockchainBlock.institution_id == current_user.institution_id
    ).order_by(models.BlockchainBlock.block_index.desc()).limit(limit).all()

    return [
        {
            "index": b.block_index,
            "hash": b.block_hash,
            "prev_hash": b.prev_hash,
            "merkle_root": b.merkle_root,
            "created_by": b.created_by,
            "created_at": b.created_at,
            "record_count": json.loads(b.payload_json).get("record_count", 0),
            "date": json.loads(b.payload_json).get("date"),
        }
        for b in blocks
    ]


@router.get("/verify")
def verify_chain_integrity(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user),
):
    """
    Verify the entire blockchain for this institution.
    Returns integrity status and any tampered blocks.
    """
    blocks = db.query(models.BlockchainBlock).filter(
        models.BlockchainBlock.institution_id == current_user.institution_id
    ).order_by(models.BlockchainBlock.block_index.asc()).all()

    if not blocks:
        return {"valid": True, "message": "No blocks in ledger.", "total_blocks": 0}

    issues = []
    prev_hash = "0" * 64

    for b in blocks:
        # Verify prev_hash linkage
        if b.block_index > 0 and b.prev_hash != prev_hash:
            issues.append({
                "block_index": b.block_index,
                "issue": "prev_hash mismatch — chain broken",
                "expected_prev": prev_hash,
                "actual_prev": b.prev_hash,
            })

        # Recompute hash
        payload = json.loads(b.payload_json)
        recomputed = _compute_hash(b.block_index, b.prev_hash, payload)
        if recomputed != b.block_hash:
            issues.append({
                "block_index": b.block_index,
                "issue": "block_hash mismatch — data tampered",
                "stored_hash": b.block_hash,
                "computed_hash": recomputed,
            })

        prev_hash = b.block_hash

    return {
        "valid": len(issues) == 0,
        "total_blocks": len(blocks),
        "issues": issues,
        "message": "Ledger is intact." if not issues else f"{len(issues)} integrity issue(s) found!",
    }


@router.get("/certificate/{date_str}")
def generate_attendance_certificate(
    date_str: str,
    student_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user),
):
    """
    Generate a blockchain-backed attendance certificate for a student on a specific date.
    Returns the block hash as proof.
    """
    block = db.query(models.BlockchainBlock).filter(
        models.BlockchainBlock.institution_id == current_user.institution_id,
        models.BlockchainBlock.payload_json.contains(date_str),
    ).first()

    if not block:
        raise HTTPException(status_code=404, detail=f"No committed block found for date {date_str}.")

    payload = json.loads(block.payload_json)
    student_record = next(
        (r for r in payload.get("records", []) if r.get("id") == str(student_id)), None
    )
    if not student_record:
        raise HTTPException(status_code=404, detail="Student attendance not found in this block.")

    student = db.query(models.StudentModel).filter(
        models.StudentModel.id == student_id
    ).first()

    return {
        "certificate": {
            "student_name": student.name if student else student_record.get("name"),
            "roll": student_record.get("roll"),
            "department": student_record.get("dep"),
            "date": date_str,
            "status": student_record.get("status"),
            "time": student_record.get("time"),
            "block_hash": block.block_hash,
            "block_index": block.block_index,
            "merkle_root": block.merkle_root,
            "issued_at": datetime.now(IST).isoformat(),
            "verify_url": f"/api/v1/blockchain/verify",
        },
        "message": "This certificate is blockchain-backed and tamper-proof.",
    }
