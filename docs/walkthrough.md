# System Customizations & Extreme Security Settings Panel Walkthrough

This document outlines the visual adjustments and system feature expansions recently completed and committed to the codebase.

---

## 1. Login Portal Footer Clean Match
- **Font Integration**: The developer credit `"Developed by Rajkishor"` has been completely reformatted to use the `'Outfit', 'Plus Jakarta Sans', sans-serif` typography, matching the role tabs exactly.
- **Casing and Colors**: Removed uppercase transforms to match the sentence-case aesthetic of the dashboard cards. The `"Developed by"` prefix is styled as a subtle natural slate-gray, while `"Rajkishor"` glows with a soft white breathing pulse matching the `Explore Guest Sandbox` button.
- **Precision Spacing**: The margin-top has been reduced to exactly `3px` to keep the footer text positioned directly underneath the login container.

---

## 2. Advanced System & Extreme Security Settings Console
We have added a brand new **"Advanced System & Extreme Security Console"** card inside the settings section (`activeTab === 'settings'`).

### Core Features Added:
1. **Biometric Confidence Slider**:
   - Allows administrators to slide the facial match validation confidence requirement between `80%` and `99%` in real-time.
   - Any facial scanner signature matching below this value is rejected on the client side with alert logs.
2. **Anti-Spoofing EAR Liveness Slider**:
   - Configures eye-aspect-ratio (EAR) blink detection strictness (from `0.15` to `0.30`).
   - Dynamically modifies face mesh blink sensitivity requirements.
3. **AI Copilot Mode Switch**:
   - In **Hyper-Processing Cognitive Mode (Extreme)**, custom prompt instructions are appended to chatbot requests instructing the LLM to output highly dense, analytical, structural, and detailed technical diagrams and text blocks.
4. **Interactive Text-to-Speech Engine**:
   - The AI Assistant chatbot now uses the Web Speech API `speechSynthesis` to speak text aloud in real-time, utilizing selected voice pitch and speed settings if voice feedback is enabled.
5. **Diagnostics Telemetry Exporter**:
   - Added a dropdown selector for diagnostics logging levels (`NONE`, `INFO`, `DEBUG`, `TRACE`).
   - A single-click **📥 Export Core Telemetry & Logs** button triggers an instant client-side download of a formatted JSON file compiling active state variables, current latency metrics, selected configurations, and recent system audit logs.
6. **Hands-free 'Over' Voice Command**:
   - Saying `"over"`, `"stop"`, `"terminate"`, or `"exit"` will immediately terminate the active AI voice assistant, stop Text-to-Speech playback, and recycle the voice state machine back to its idle/wake-word listening state.
7. **Automatic Voice Activation (Wake-Word)**:
   - Configured `botWakeWordEnabled` to be enabled (`true`) by default so that the system immediately listens for `"Hey Raj"` without requiring manual setup.
   - **Security Boundaries**: The voice state machine is strictly bound to the user's active session (`token`). If a user logs out, the microphone and background listener are instantly aborted and disabled on the client side, ensuring no background eavesdropping or security leakage.

---

## 3. Database Multi-Tenancy Migration (Phase 1)
To support multi-tenancy across multiple institutions securely while isolating data, we added the `Institution` model and integrated dynamic schema alterations and seeding.

### Modifications Made:
1. **Database Schema Setup (`models.py`)**:
   - Defined `Institution` model with `id`, `name`, `slug`, `is_active`, and `created_at`.
   - Added `institution_id` foreign keys (referencing `institutions.id`) to the following existing models: `User`, `StudentModel`, `Subject`, `Schedule`, `AttendanceModel`, `AuditLog`, `SystemSettings`, and `Feedback`.

2. **Automatic Schema Alteration & Migration (`main.py`)**:
   - Expanded `update_schema()` during startup to detect if the `institution_id` column is missing from any of the existing tables (`users`, `student`, `subjects`, `schedules`, `attendence`, `audit_logs`, `system_settings`, `feedbacks`).
   - If missing, the system executes SQL `ALTER TABLE <table_name> ADD COLUMN institution_id INT NULL` dynamically (supporting both MySQL and local SQLite deployments).

3. **Backward Compatibility & Backfilling (`main.py`)**:
   - On application startup, the system seeds the default tenant (`id=1`, `name="Default Institution"`, `slug="default"`) if it does not exist.
   - For all pre-existing records across all tables, the migration checks for `institution_id IS NULL` and automatically updates them to point to `institution_id = 1` (Default Institution).
   - This ensures a seamless transition for existing single-tenant deployments with zero data loss.

### Code Verification:
- Ran manual database schema validation queries against the active production Aiven MySQL database.
- Successfully verified that all schema modifications are correct, the `institutions` table has been created, the `institution_id` columns were successfully added, and all pre-existing records (users, students, subjects, attendance logs, and audit logs) have been properly scoped and backfilled to `institution_id = 1`.
- Local verification completed successfully with clean backend server starts.
- Code committed locally (Git push is bypassed as requested until explicit confirmation).
