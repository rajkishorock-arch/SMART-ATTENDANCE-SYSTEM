"""
Feature 6: Gamification — Attendance Streaks, Badges & Leaderboard
Awards points and badges for consistent attendance. Leaderboard per department.
"""
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from typing import Optional, List
from datetime import datetime, timezone, timedelta
import json

from . import models, security, crud, schemas
from .database import get_db

IST = timezone(timedelta(hours=5, minutes=30))
router = APIRouter()

# ── Badge Definitions ─────────────────────────────────────────────────────────
BADGE_DEFINITIONS = [
    {"key": "first_day",        "name": "First Step",         "emoji": "👣", "desc": "Attended for the first time",             "streak": 1,  "points": 0},
    {"key": "streak_3",         "name": "3-Day Streak",        "emoji": "🔥", "desc": "Attended 3 consecutive days",             "streak": 3,  "points": 0},
    {"key": "streak_7",         "name": "Week Warrior",        "emoji": "⚡", "desc": "Attended 7 consecutive days",             "streak": 7,  "points": 0},
    {"key": "streak_14",        "name": "Two-Week Champion",   "emoji": "🏆", "desc": "Attended 14 consecutive days",            "streak": 14, "points": 0},
    {"key": "streak_30",        "name": "Monthly Legend",      "emoji": "👑", "desc": "Attended 30 consecutive days",            "streak": 30, "points": 0},
    {"key": "points_100",       "name": "Century Club",        "emoji": "💯", "desc": "Earned 100 attendance points",            "streak": 0,  "points": 100},
    {"key": "points_500",       "name": "Super Achiever",      "emoji": "🌟", "desc": "Earned 500 attendance points",            "streak": 0,  "points": 500},
    {"key": "early_bird",       "name": "Early Bird",          "emoji": "🌅", "desc": "First to be marked present in class",     "streak": 0,  "points": 0},
    {"key": "perfect_week",     "name": "Perfect Week",        "emoji": "✨", "desc": "100% attendance in a calendar week",      "streak": 0,  "points": 0},
]

POINTS_PER_DAY = 10          # Points per attendance day
STREAK_BONUS   = 5           # Bonus per streak day above 3


def _seed_badges(db: Session, institution_id: int):
    """Ensure all badge definitions exist in DB for an institution."""
    for b in BADGE_DEFINITIONS:
        existing = db.query(models.GamificationBadge).filter(
            models.GamificationBadge.badge_key == b["key"]
        ).first()
        if not existing:
            badge = models.GamificationBadge(
                institution_id=institution_id,
                badge_key=b["key"],
                name=b["name"],
                description=b["desc"],
                icon_emoji=b["emoji"],
                points_required=b["points"],
                streak_required=b["streak"],
            )
            db.add(badge)
    db.commit()


def _award_points_and_badges(db: Session, student_id: int, institution_id: int):
    """
    Called after a student is marked present.
    Updates streak, points, and awards any earned badges.
    """
    try:
        student = db.query(models.StudentModel).filter(
            models.StudentModel.id == student_id,
            models.StudentModel.institution_id == institution_id,
        ).first()
        if not student:
            return

        today_str = datetime.now(IST).strftime("%d/%m/%Y")

        # Initialise fields if null
        student.attendance_points = student.attendance_points or 0
        student.streak_days = student.streak_days or 0
        student.longest_streak = student.longest_streak or 0

        # Update streak
        last = student.last_present_date
        yesterday_str = (datetime.now(IST) - timedelta(days=1)).strftime("%d/%m/%Y")

        if last == today_str:
            # Already processed today
            db.commit()
            return

        if last == yesterday_str:
            student.streak_days += 1
        else:
            student.streak_days = 1  # Reset streak

        student.last_present_date = today_str

        if student.streak_days > student.longest_streak:
            student.longest_streak = student.streak_days

        # Award points
        streak = student.streak_days
        bonus = STREAK_BONUS * max(0, streak - 3)
        points_earned = POINTS_PER_DAY + bonus
        student.attendance_points += points_earned

        db.commit()

        # Check and award badges
        _check_and_award_badges(db, student, institution_id)
    except Exception as e:
        db.rollback()
        print(f"[Gamification] Failed to award points: {e}")


def _check_and_award_badges(db: Session, student, institution_id: int):
    """Award all badges the student qualifies for."""
    try:
        existing_badges = set(
            b.badge_key for b in db.query(models.StudentBadge).filter(
                models.StudentBadge.student_id == student.id
            ).all()
        )

        new_badges = []
        for b in BADGE_DEFINITIONS:
            if b["key"] in existing_badges:
                continue
            earned = False
            if b["streak"] > 0 and student.streak_days >= b["streak"]:
                earned = True
            if b["points"] > 0 and student.attendance_points >= b["points"]:
                earned = True
            if b["key"] == "first_day" and student.attendance_points >= POINTS_PER_DAY:
                earned = True
            if earned:
                new_badges.append(b["key"])
                sb = models.StudentBadge(
                    institution_id=institution_id,
                    student_id=student.id,
                    badge_key=b["key"],
                )
                db.add(sb)

        if new_badges:
            db.commit()
            print(f"[Gamification] Student {student.id} earned badges: {new_badges}")
    except Exception as e:
        db.rollback()
        print(f"[Gamification] Badge award failed: {e}")


# ── API Endpoints ─────────────────────────────────────────────────────────────

@router.get("/my-profile")
def get_my_gamification_profile(
    db: Session = Depends(get_db),
    current_student: models.StudentModel = Depends(security.get_current_student),
):
    """Student views their own gamification profile: points, streaks, badges."""
    badges = db.query(models.StudentBadge).filter(
        models.StudentBadge.student_id == current_student.id,
        models.StudentBadge.institution_id == current_student.institution_id,
    ).all()

    badge_details = []
    for b in badges:
        defn = next((d for d in BADGE_DEFINITIONS if d["key"] == b.badge_key), None)
        badge_details.append({
            "key": b.badge_key,
            "name": defn["name"] if defn else b.badge_key,
            "emoji": defn["emoji"] if defn else "🏅",
            "earned_at": b.earned_at,
        })

    return {
        "student_id": current_student.id,
        "name": current_student.name,
        "roll": current_student.roll,
        "points": current_student.attendance_points or 0,
        "streak_days": current_student.streak_days or 0,
        "longest_streak": current_student.longest_streak or 0,
        "badges": badge_details,
        "badges_count": len(badge_details),
    }


@router.get("/leaderboard")
def get_leaderboard(
    department: Optional[str] = None,
    limit: int = 20,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user),
):
    """Department or institution-wide leaderboard ranked by attendance points."""
    query = db.query(models.StudentModel).filter(
        models.StudentModel.institution_id == current_user.institution_id,
        models.StudentModel.attendance_points > 0,
    )
    if department:
        query = query.filter(models.StudentModel.dep == department)

    students = query.order_by(models.StudentModel.attendance_points.desc()).limit(limit).all()

    leaderboard = []
    for rank, s in enumerate(students, 1):
        badge_count = db.query(models.StudentBadge).filter(
            models.StudentBadge.student_id == s.id
        ).count()
        leaderboard.append({
            "rank": rank,
            "student_id": s.id,
            "name": s.name,
            "roll": s.roll,
            "dep": s.dep,
            "points": s.attendance_points or 0,
            "streak": s.streak_days or 0,
            "longest_streak": s.longest_streak or 0,
            "badge_count": badge_count,
        })

    return {"leaderboard": leaderboard, "department": department or "all"}


@router.post("/award-points/{student_id}")
def manually_award_points(
    student_id: int,
    payload: dict,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user),
):
    """Admin can manually award bonus points to a student."""
    if current_user.role not in ("admin", "hod"):
        raise HTTPException(status_code=403, detail="Admin only.")

    student = db.query(models.StudentModel).filter(
        models.StudentModel.id == student_id,
        models.StudentModel.institution_id == current_user.institution_id,
    ).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found.")

    points = int(payload.get("points", 0))
    reason = payload.get("reason", "Manual award")
    student.attendance_points = (student.attendance_points or 0) + points
    db.commit()

    _check_and_award_badges(db, student, current_user.institution_id)

    crud.create_audit_log(
        db,
        log=schemas.AuditLogCreate(
            user_email=current_user.email,
            action=f"Manually awarded {points} points to {student.name} (Roll: {student.roll}). Reason: {reason}"
        ),
        institution_id=current_user.institution_id,
    )
    return {"message": f"Awarded {points} points to {student.name}.", "new_total": student.attendance_points}


@router.get("/badges")
def list_all_badges(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user),
):
    """List all available badges and their requirements."""
    return {"badges": BADGE_DEFINITIONS}


@router.post("/trigger-daily-update")
def trigger_daily_gamification_update(
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user),
):
    """Manually trigger daily gamification points update for all students who attended today."""
    if current_user.role not in ("admin",):
        raise HTTPException(status_code=403, detail="Admin only.")

    today_str = datetime.now(IST).strftime("%d/%m/%Y")
    present_today = db.query(models.AttendanceModel).filter(
        models.AttendanceModel.institution_id == current_user.institution_id,
        models.AttendanceModel.date == today_str,
        models.AttendanceModel.attendance == "Present",
    ).all()

    student_ids = list(set(int(l.id) for l in present_today if l.id and l.id.isdigit()))

    def _batch_award(db: Session, student_ids: list, inst_id: int):
        for sid in student_ids:
            _award_points_and_badges(db, sid, inst_id)

    background_tasks.add_task(_batch_award, db, student_ids, current_user.institution_id)
    return {"message": f"Triggered gamification update for {len(student_ids)} students present today."}
