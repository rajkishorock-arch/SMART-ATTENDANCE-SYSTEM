# Multi-Tenancy Scoping & Endpoint Isolation Walkthrough (Phase 2 & 3)

This document summarizes the changes made to isolate database data and route access securely between different institutions.

---

## 1. Scoped Face Recognition
- Updated [recognition_service.py](file:///c:/Users/rajki/Desktop/face_recoginition/backend/app/recognition_service.py) to load `institution_id` into its in-memory face embedding cache.
- Updated `recognize_faces_in_frame` to compare face embeddings ONLY against registered student profiles belonging to the same institution.

---

## 2. Row-Level Tenant Isolation in Database
- Updated [crud.py](file:///c:/Users/rajki/Desktop/face_recoginition/backend/app/crud.py) database functions to filter by the requesting tenant's `institution_id`.
- The following CRUD operations are fully scoped:
  - Users and students list/creation/deletion
  - Attendance logs and reports
  - Timetable schedules and subjects mapping
  - Security and system settings (Geofencing, IP restrictions)
  - System feedbacks and audit logs

---

## 3. Scoped Endpoints and JWT Scoping Dependency
- Scoped all routes under:
  - [users.py](file:///c:/Users/rajki/Desktop/face_recoginition/backend/app/users.py)
  - [attendance.py](file:///c:/Users/rajki/Desktop/face_recoginition/backend/app/attendance.py)
  - [settings.py](file:///c:/Users/rajki/Desktop/face_recoginition/backend/app/settings.py)
  - [subjects.py](file:///c:/Users/rajki/Desktop/face_recoginition/backend/app/subjects.py)
  - [feedback.py](file:///c:/Users/rajki/Desktop/face_recoginition/backend/app/feedback.py)
- Enabled `institution_id` decoding in token verification.
- Passed user's/student's institution ID down to all database fetches and actions.
- Scoped PDF report generator ([pdf_service.py](file:///c:/Users/rajki/Desktop/face_recoginition/backend/app/pdf_service.py)) to restrict report generation to the tenant's data.

---

## 4. Frontend Dynamic Tenant Branding & Routing (Phase 3)
- Created [tenantConfig.js](file:///c:/Users/rajki/Desktop/face_recoginition/frontend/src/utils/tenantConfig.js) to parse subdomain configurations (e.g. `du.attendance.io`) and support dynamic local overrides via `localStorage.getItem('override_tenant')`.
- Registered a Global Fetch Interceptor in [main.jsx](file:///c:/Users/rajki/Desktop/face_recoginition/frontend/src/main.jsx) to automatically inject the `X-Tenant-Slug` header for all backend API endpoints.
- Integrated branding loader hook in [App.jsx](file:///c:/Users/rajki/Desktop/face_recoginition/frontend/src/App.jsx) that retrieves institution colors and logos at startup.
- Configured dynamic theme skinning in [App.jsx](file:///c:/Users/rajki/Desktop/face_recoginition/frontend/src/App.jsx) by injecting CSS Custom Properties (`--color-primary`, `--color-secondary`, `--glow-shadow`) directly onto the document root.
- Made navbar branding title and startup splash headers dynamic using tenant branding payload details.

---

## 5. Security & Storage Isolation (Phase 4)
- **Composite Unique Index**: Updated the `User` model in [models.py](file:///c:/Users/rajki/Desktop/face_recoginition/backend/app/models.py) to remove the global unique constraint on email and replaced it with a composite unique constraint `(institution_id, email)` to avoid cross-tenant teacher/admin email conflicts.
- **Dynamic Database Constraints Alteration**: Enhanced the startup block in [main.py](file:///c:/Users/rajki/Desktop/face_recoginition/backend/app/main.py) to drop the old global unique index on users.email and create the composite unique constraint dynamically on SQLite/MySQL database setups.
- **Strict Session Verification Scoping**: Scoped `/me` route fetching in [auth.py](file:///c:/Users/rajki/Desktop/face_recoginition/backend/app/auth.py) to pass the token's decoded `institution_id` down to student and user verification queries.
- **Isolated Disk Photo Storage**: Set new directories in [users.py](file:///c:/Users/rajki/Desktop/face_recoginition/backend/app/users.py) to isolate face photos and references under tenant subfolders `data/tenant_{institution_id}/` (e.g. `data/tenant_1/`, `data/tenant_2/`), preventing filename ID collisions.

---

## 6. Verification & Testing
- Tested Python compilation across all modified files; all modules compile cleanly.
- Checked FastAPI application startup: tables verify, database index migration alterations compile, default institutions check, and test tenants (`du` maroon/goldenrod theme, `iitd` teal/amber theme) seed successfully on startup.
- Verified frontend build processes compile successfully without errors or warnings.
- Confirmed local verification with Aiven Cloud DB connection responds with 200 OK for branding config requests.
