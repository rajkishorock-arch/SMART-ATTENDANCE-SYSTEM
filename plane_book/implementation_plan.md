# Implementation Plan: Database Multi-Tenancy (Phase 2)

This plan details the backend modifications required to enforce logical tenant isolation across all endpoints and database CRUD operations. Every query, creation, update, and deletion will be restricted to the `institution_id` of the currently authenticated user or student. Face recognition search will also be restricted to the active institution.

---

## User Review Required

Please review the proposed scoping method:
1. **Endpoint-Level Scoping**: We will extract the `institution_id` from the JWT token and pass it to CRUD functions.
2. **Face Recognition Isolation**: We will update the `recognition_service` memory cache matching logic to only compare face embeddings against student profiles belonging to the same `institution_id`.
3. **Database Guardrails**: Standard fallback of `institution_id = 1` (Default Institution) will be used if the token does not contain a tenant ID, or for public/unauthenticated setup endpoints, guaranteeing backwards compatibility.

---

## Open Questions

> [!NOTE]
> 1. For `create_user` (sign up endpoint if any) or seeding, do we default to `institution_id = 1`? (Yes, the default institution will be used if not specified).
> 2. Should students be allowed to see subjects from other institutions? (No, they will be strictly isolated to their own institution's subjects).

---

## Proposed Changes

### Backend

---

#### [MODIFY] [recognition_service.py](file:///c:/Users/rajki/Desktop/face_recoginition/backend/app/recognition_service.py)
- **Update Student Record Cache**:
  Include `institution_id` in `self.student_records` when loading profiles from the database:
  ```python
  self.student_records[s.id] = {
      "name": s.name,
      "roll": s.roll,
      "dep": s.dep,
      "embedding": emb_np,
      "institution_id": s.institution_id
  }
  ```
- **Update `recognize_faces_in_frame`**:
  Add an optional `institution_id: Optional[int] = None` argument and skip matching records that belong to a different institution:
  ```python
  for student_id, record in self.student_records.items():
      if institution_id is not None and record.get("institution_id") != institution_id:
          continue
  ```

---

#### [MODIFY] [crud.py](file:///c:/Users/rajki/Desktop/face_recoginition/backend/app/crud.py)
- Update CRUD functions to accept an optional/required `institution_id` parameter and filter queries by it:
  - `get_students`
  - `create_student`
  - `delete_student`
  - `get_attendance_logs`
  - `get_dashboard_stats`
  - `mark_student_attendance`
  - `get_attendance_report`
  - `get_system_settings`
  - `update_system_settings`
  - `create_subject`
  - `get_subjects`
  - `create_schedule`
  - `get_schedules`
  - `create_feedback`

---

#### [MODIFY] [users.py](file:///c:/Users/rajki/Desktop/face_recoginition/backend/app/users.py)
- Inject `institution_id` dependency from the authenticated user (`current_user`).
- Update the following endpoints to filter/set `institution_id`:
  - `/` (POST: create student/user)
  - `/{id}` (PUT: update details)
  - `/{id}` (DELETE)
  - `/` (GET: list users)
  - `/students` (GET: list students)
  - `/students` (POST: add student)
  - `/students/{id}` (PUT)
  - `/students/{id}` (DELETE)
  - `/students/{id}/upload-sample` (POST)
  - `/students/me/upload-selfie` (POST)

---

#### [MODIFY] [attendance.py](file:///c:/Users/rajki/Desktop/face_recoginition/backend/app/attendance.py)
- Restrict all attendance operations by injecting the authenticated user's/student's `institution_id`.
- Update endpoints:
  - `/logs` (GET)
  - `/stats` (GET)
  - `/recognize-frame` (POST): Pass `current_user.institution_id` to `recognize_faces_in_frame` and `mark_student_attendance`.
  - `/report` (GET)
  - `/my-report` (GET)
  - `/send-absentee-alerts` (POST)
  - `/download-report-pdf` (GET)
  - `/sessions-history` (GET)

---

#### [MODIFY] [settings.py](file:///c:/Users/rajki/Desktop/face_recoginition/backend/app/settings.py)
- Update `/` (GET) and `/` (PUT) endpoints to use the logged-in user's `institution_id`.

---

#### [MODIFY] [subjects.py](file:///c:/Users/rajki/Desktop/face_recoginition/backend/app/subjects.py)
- Scope subjects and schedules endpoints:
  - `/subjects` (POST)
  - `/subjects` (GET)
  - `/schedules` (POST)
  - `/schedules` (GET)

---

#### [MODIFY] [feedback.py](file:///c:/Users/rajki/Desktop/face_recoginition/backend/app/feedback.py)
- Update `get_current_any_user` to decode the token's `institution_id` and pass it down.
- Update `/` (POST) and `/` (GET) to scope feedback creation and retrieval.

---

## Verification Plan

### Automated Tests
- Run startup sequence and ensure schema alterations compile.
- Test endpoint requests via `curl` or python tests with test JWT tokens containing different `institution_id`s, verifying that data from other institutions is completely hidden.

### Manual Verification
- Verify in settings and dashboards that students and logs are correctly scope-limited.
