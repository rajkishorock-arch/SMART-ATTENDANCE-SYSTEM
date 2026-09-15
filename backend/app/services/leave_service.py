"""
Leave Service: domain and helper logic for leave management with multi-tenant isolation.
"""
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from fastapi import HTTPException

from app import models


class LeaveService:
    """Encapsulates business operations and query enrichment for leave requests."""

    @staticmethod
    def get_leave_or_404(db: Session, leave_id: int, institution_id: int) -> models.LeaveRequest:
        """Finds leave request by id strictly scoped to the tenant institution."""
        leave = db.query(models.LeaveRequest).filter(
            models.LeaveRequest.id == leave_id,
            models.LeaveRequest.institution_id == institution_id,
        ).first()
        if not leave:
            raise HTTPException(status_code=404, detail="Leave request not found.")
        return leave

    @staticmethod
    def enrich_leave(db: Session, leave: models.LeaveRequest) -> Dict[str, Any]:
        """Enriches a single leave record with student and subject details."""
        res = LeaveService.enrich_leaves_batch(db, [leave])
        return res[0] if res else {}

    @staticmethod
    def enrich_leaves_batch(db: Session, leaves: List[models.LeaveRequest]) -> List[Dict[str, Any]]:
        """Enrich multiple leave records with student and subject names in 2 batch queries."""
        if not leaves:
            return []

        student_ids = list(set([l.student_id for l in leaves if l.student_id]))
        subject_ids = list(set([l.subject_id for l in leaves if l.subject_id]))

        students_map = {
            s.id: s for s in db.query(models.StudentModel).filter(models.StudentModel.id.in_(student_ids)).all()
        } if student_ids else {}

        subjects_map = {
            sub.id: sub for sub in db.query(models.Subject).filter(models.Subject.id.in_(subject_ids)).all()
        } if subject_ids else {}

        enriched = []
        for leave in leaves:
            s = students_map.get(leave.student_id)
            sub = subjects_map.get(leave.subject_id)

            enriched.append({
                "id": leave.id,
                "student_id": leave.student_id,
                "student_name": s.name if s else leave.applicant_name,
                "student_roll": s.roll if s else None,
                "student_dep": s.dep if s else None,
                "subject_id": leave.subject_id,
                "subject_name": sub.name if sub else None,
                "subject_code": sub.code if sub else None,
                "start_date": leave.start_date,
                "end_date": leave.end_date,
                "leave_type": leave.leave_type,
                "reason": leave.reason,
                "status": leave.status,
                "reviewed_by": leave.reviewed_by,
                "reviewed_at": leave.reviewed_at,
                "created_at": leave.created_at,
                "user_email": leave.user_email,
                "role": leave.role,
                "document_url": leave.document_url,
                "approved_by": leave.approved_by,
                "substitute_assigned": leave.substitute_assigned,
            })
        return enriched
