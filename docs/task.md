# Multi-Tenancy Database Migration Checklist (Phase 1)

- [x] Define the `Institution` model and foreign keys in `backend/app/models.py`.
- [x] Expand the `update_schema` function in `backend/app/main.py` to auto-alter existing tables to add the `institution_id` column.
- [x] Implement default institution seeding and back-fill logic in `backend/app/main.py`'s startup event.
- [x] Run backend local startup tests to verify database migrations execute without errors.
- [x] Verify that existing data matches the seeded default institution (`ID: 1`).
- [x] Commit locally (do NOT push to Git).

## Phase 5: Production CORS & Preflight Checks
- [x] Add `X-Tenant-Slug` to backend CORS `allow_headers`.
- [x] Add root Vercel domain to CORS origin regex to support the base production app.
- [x] Add trailing slash to the frontend connection check API endpoint `/health/` to prevent browser redirect blockages.
- [x] Run production verification logs check.
