# Render Deployment Checklist

If Render shows:

```text
RuntimeError: Configuration error: DEVELOPER_MASTER_KEY must be at least 12 characters. BUILD_CALLBACK_TOKEN is required.
```

open the Render service dashboard, go to **Environment**, and set these variables:

```text
ENV=production
ALLOW_DATABASE_FALLBACK=false
DATABASE_URL=<your Render PostgreSQL external/internal URL>
JWT_SECRET_KEY=<32+ character random secret>
DEVELOPER_MASTER_KEY=<12+ character master password>
BUILD_CALLBACK_TOKEN=<12+ character random token>
SEED_DEFAULT_USERS=false
```

Do not set `PRIMARY_ADMIN_PASSWORD` on production Render services.

You can generate strong values locally with PowerShell:

```powershell
python -c "import secrets; print(secrets.token_urlsafe(48))"
```

Use one generated value for `JWT_SECRET_KEY` and another generated value for `BUILD_CALLBACK_TOKEN`.
Use a memorable but strong `DEVELOPER_MASTER_KEY` because the admin UI asks for it during protected update actions.
