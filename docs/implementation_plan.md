# Implementation Plan: Database Multi-Tenancy (Phase 1)

This plan details the backend modifications required to enable database-level multi-tenancy. We will add the `Institution` (tenant) model, alter existing tables to support `institution_id`, and write startup migration scripts to automatically seed a default tenant (`Default Institution`) and link all existing logs, users, and students to it. This guarantees zero downtime and zero data loss.

> [!WARNING]
> These changes are local. Git push is disabled as requested by the user, and will only be executed after verification and explicit confirmation.

---

## User Review Required

Please review the proposed schema alteration method:
1. **Dynamic Schema Migration**: Since standard SQLAlchemy `create_all()` does not add columns to existing tables, we write `ALTER TABLE` operations in `backend/app/main.py:update_schema()` for SQLite/MySQL.
2. **Backwards Compatibility**: All new `institution_id` columns will be added as `NULLABLE` first, seeded with `id=1` (Default Institution), and then logically handled to avoid breaking older deployments.

---

## Open Questions

> [!NOTE]
> 1. Should we name the default institution slug `'default'` or something else (e.g. `'main'`)? (Currently planning `'default'`).
> 2. Are there any other custom database tables currently in deployment that are not in the standard `models.py`?

---

## Proposed Changes

### Backend

#### [MODIFY] [models.py](file:///c:/Users/rajki/Desktop/face_recoginition/backend/app/models.py)
- **Define `Institution` Model**:
  ```python
  class Institution(Base):
      __tablename__ = "institutions"
      id = Column(Integer, primary_key=True, index=True)
      name = Column(String(150), unique=True, nullable=False)
      slug = Column(String(100), unique=True, index=True, nullable=False)
      is_active = Column(Boolean, default=True)
      created_at = Column(DateTime(timezone=True), server_default=func.now())
  ```
- **Add Foreign Keys**: Add `institution_id = Column(Integer, ForeignKey("institutions.id", ondelete="CASCADE"), nullable=True)` to:
  - `User`
  - `StudentModel`
  - `Subject`
  - `AttendanceModel`
  - `AuditLog`
  - `SystemSettings`
  - `Feedback`

#### [MODIFY] [main.py](file:///c:/Users/rajki/Desktop/face_recoginition/backend/app/main.py)
- **Expand `update_schema()`**: Add checks to detect if `institution_id` column is missing in the following tables, and execute the SQL `ALTER TABLE` if needed:
  - `users`
  - `student`
  - `subjects`
  - `attendence`
  - `audit_logs`
  - `system_settings`
  - `feedbacks`
- **Add Seeding Logic**:
  - In `on_startup()`, verify if `Institution` with `id=1` exists. If not, insert `Institution(id=1, name="Default Institution", slug="default")`.
  - Execute migration query: set `institution_id = 1` for all records in the above tables where `institution_id` is currently null.

---

## Verification Plan

### Automated Tests
- Run backend server and check if logs output `Schema update: added institution_id...` and SQLite/MySQL alters successfully.
- Verify through SQL client or custom python debug scripts that the `institutions` table was created and the `institution_id` column contains `1` for all old records.
