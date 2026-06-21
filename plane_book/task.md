# Checklist: Multi-Tenancy Expansion

## Phase 2: Database Multi-Tenancy
- [x] Scope `recognition_service.py` student records cache and matching logic.
- [x] Scope `crud.py` database operations to accept and filter by `institution_id`.
- [x] Scope `users.py` endpoints by injecting the user's `institution_id`.
- [x] Scope `attendance.py` endpoints by injecting the user's/student's `institution_id`.
- [x] Scope `settings.py` endpoints by injecting the user's `institution_id`.
- [x] Scope `subjects.py` endpoints by injecting the user's/student's `institution_id`.
- [x] Scope `feedback.py` endpoints by injecting the user's `institution_id`.
- [x] Verify backend compilation and startup.

## Phase 3: Frontend Subdomain & Dynamic Layout Routing
- [x] Define brand retrieval endpoint on backend `/api/v1/institutions/branding/{slug}`.
- [x] Create `tenantConfig.js` utility in `frontend/src/utils/` to parse subdomains.
- [x] Update frontend API requests using global fetch interceptor in `main.jsx` to send the `X-Tenant-Slug` header.
- [x] Add dynamic branding colors (`--color-primary`, `--color-secondary`) and title rendering to React UI.
- [x] Seed test institutions (maroon/goldenrod for DU, teal/amber for IIT Delhi) for easy validation.
- [x] Verify successful compilation and deployment builds of both backend and frontend.

## Phase 4: Multi-Tenant Security & Storage Isolation
- [x] Establish composite unique index `(institution_id, email)` on users table to resolve tenant email conflicts.
- [x] Add dynamic SQL constraint drops and composite index creations in update_schema.
- [x] Scope session verification query fetches in `/me` route by decoded institution ID.
- [x] Isolate raw face reference photo disk storage by subdirectories `data/tenant_{institution_id}/`.
- [x] Verify backend compilation and startup migration tests.
