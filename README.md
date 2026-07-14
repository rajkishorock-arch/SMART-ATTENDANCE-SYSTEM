# Smart Attendance System: Enterprise Multi-Tenant Suite & Desktop Client

An advanced, production-grade **Smart Attendance System** that integrates deep-learning-based face recognition, real-time liveness checks, and a scalable multi-tenant SaaS architecture. The project consists of two core systems:
1. **Enterprise SaaS Web & Mobile Suite**: A robust backend powered by [FastAPI](file:///c:/Users/rajki/Desktop/face_recoginition/backend) and a beautiful dashboard frontend built with [React + Vite](file:///c:/Users/rajki/Desktop/face_recoginition/frontend) and mobile-optimized via [Capacitor](file:///c:/Users/rajki/Desktop/face_recoginition/frontend/capacitor.config.json).
2. **Local Desktop GUI Client**: A standalone desktop dashboard developed using Python's [Tkinter](file:///c:/Users/rajki/Desktop/face_recoginition/main.py) and OpenCV for local campus deployment.

---

## 🛠️ System Architecture

The following diagram illustrates the interaction between the React Web app, Capacitor mobile wrap, FastAPI REST backend, database layers, and third-party integrations:

```mermaid
graph TD
    subgraph Client Layer
        Web["React Single Page App"]
        Mobile["Android App (Capacitor Container)"]
        Desktop["Tkinter Desktop GUI App (Local OpenCV)"]
    end

    subgraph API Layer (FastAPI Backend)
        Router["FastAPI Router"]
        Auth["JWT & SSO Auth Handler"]
        FaceEngine["Face Recognition Engine (YuNet + SFace)"]
        LivenessAPI["Liveness Challenge API"]
        Scheduler["APScheduler (Email & PDF reports)"]
        AICopilot["AI Voice Copilot (Gemini API)"]
        
        Router --> Auth
        Router --> FaceEngine
        Router --> LivenessAPI
        Router --> AICopilot
    end

    subgraph Storage & Cache Layers
        DB["PostgreSQL / MySQL (Aiven)"]
        LocalDB["SQLite Fallback Database"]
        Cache["Redis (Cache Invalidation Layer)"]
        Storage["AWS S3 / Cloud Storage"]
        
        Auth --> DB
        FaceEngine --> Cache
        FaceEngine --> Storage
    end

    subgraph Integrations
        Razorpay["Razorpay (Sub/Billing)"]
        Twilio["Twilio (WhatsApp & SMS)"]
        SSO["SSO (Google & Microsoft)"]
        
        Router --> Razorpay
        Router --> Twilio
        Router --> SSO
    end

    Web --> Router
    Mobile --> Router
    Desktop --> LocalDB
```

---

## ✨ Core Features

### 1. Enterprise SaaS Multi-Tenancy (Logical Row-Level Isolation)
- **Data Isolation**: Multiple schools, colleges, or corporate tenants use the same backend infrastructure. Data is securely isolated using `institution_id` keys in [models.py](file:///c:/Users/rajki/Desktop/face_recoginition/backend/app/models.py).
- **Subdomain Routing & Custom Branding**: The system dynamically loads tenant custom branding configurations (app logo, primary/secondary colors, name) based on subdomain parameters parsed in [App.jsx](file:///c:/Users/rajki/Desktop/face_recoginition/frontend/src/App.jsx).
- **Consented GDPR Compliance**: Real-time biometric consent modals and a complete account deletion workflow (`DELETE /users/students/me/account`) complying with GDPR/DPDP privacy acts.

### 2. Deep Learning Face Recognition
- **SFace & YuNet**: Integrated state-of-the-art OpenCV YuNet for face detection and SFace for generating 128-dimensional facial embeddings.
- **Embedded Cache Layer**: Facial embeddings are cached via [cache_service.py](file:///c:/Users/rajki/Desktop/face_recoginition/backend/app/cache_service.py) on Redis to reduce database hits and accelerate validation matching speed.

### 3. Dual-Shield Liveness Detection
- **Client-Side Eye Blink (EAR)**: Eye Aspect Ratio tracking forces blink detection before sending faces to verify.
- **Server-Side Challenge-Response**: Real-time random movement challenges configured via `/api/v1/liveness` in [liveness.py](file:///c:/Users/rajki/Desktop/face_recoginition/backend/app/liveness.py) to prevent spoofing with printed pictures or screen captures.

### 4. Advanced System & Extreme Security Settings Panel
- **Validation Strictness Slider**: Allows HODs and system administrators to slide verification match confidence between `80%` and `99%` in real-time.
- **Diagnostics Telemetry Exporter**: On-demand download of formatted JSON compile matrices (latencies, states, configurations) for quick system debugging.
- **Voice Copilot chatbot**: Integrates Google Gemini LLM with Text-to-Speech (TTS) voice activation. Auto-listens for wake-words like `"Hey Raj"` and accepts termination commands like `"over"`. The voice engine is strictly bound to active JWT tokens to prevent unauthorized eavesdropping.

---

## 📂 Project Directory Layout

- [main.py](file:///c:/Users/rajki/Desktop/face_recoginition/main.py): Entry point for the local Desktop Tkinter GUI client.
- [student.py](file:///c:/Users/rajki/Desktop/face_recoginition/student.py): Manage student records for local desktop deployment.
- [train.py](file:///c:/Users/rajki/Desktop/face_recoginition/train.py): local face classifier training using OpenCV LBPH.
- [backend/](file:///c:/Users/rajki/Desktop/face_recoginition/backend): FastAPI application workspace.
  - [app/main.py](file:///c:/Users/rajki/Desktop/face_recoginition/backend/app/main.py): Server setup, database schema migration hooks, and CORS initialization.
  - [app/models.py](file:///c:/Users/rajki/Desktop/face_recoginition/backend/app/models.py): Core database models with `institution_id` boundaries.
  - [app/recognition_service.py](file:///c:/Users/rajki/Desktop/face_recoginition/backend/app/recognition_service.py): YuNet & SFace processing and matching.
  - [app/scheduler.py](file:///c:/Users/rajki/Desktop/face_recoginition/backend/app/scheduler.py): Cron configurations for automated PDF reports.
- [frontend/](file:///c:/Users/rajki/Desktop/face_recoginition/frontend): React frontend workspace.
  - [src/App.jsx](file:///c:/Users/rajki/Desktop/face_recoginition/frontend/src/App.jsx): Interactive main client dashboard with roles (Student, Teacher, HOD, Admin, Parent).
  - [capacitor.config.json](file:///c:/Users/rajki/Desktop/face_recoginition/frontend/capacitor.config.json): Android integration configs.

---

## 🚀 Setup & Installation

### Prerequisite Checklist
- **Python 3.10+** (Virtual environments recommended).
- **Node.js 18+** & **npm 9+**.
- **PostgreSQL** or **MySQL** (Optional: SQLite fallback is active by default for fast local prototyping).
- **Redis Server** (Optional: cached token lookup).

---

### 1. Backend Server Setup

Navigate into the backend directory:
```bash
cd backend
```

1. **Create and Activate Python Virtual Environment**:
   ```bash
   python -m venv venv
   # On Windows (PowerShell):
   .\venv\Scripts\Activate.ps1
   # On macOS/Linux:
   source venv/bin/activate
   ```

2. **Install Dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

3. **Configure Environment Variables**:
   Copy `.env` from [.env.example](file:///c:/Users/rajki/Desktop/face_recoginition/.env.example) and fill in the necessary keys:
   ```bash
   cp .env.example .env
   ```

4. **Initialize Database and Start Server**:
   FastAPI automatically migrates tables during startup. Run the server using:
   ```bash
   python -m uvicorn app.main:app --reload --port 8000
   ```
   The backend API docs will be active at: [http://localhost:8000/docs](http://localhost:8000/docs)

---

### 2. Frontend React Web App Setup

Navigate into the frontend directory:
```bash
cd frontend
```

1. **Install NPM Packages**:
   ```bash
   npm install
   ```

2. **Configure Client Environment Variables**:
   Create a `.env.local` file and declare your FastAPI server address:
   ```text
   VITE_API_URL=http://localhost:8000
   ```

3. **Run Dev Server**:
   ```bash
   npm run dev
   ```
   Open your browser to: [http://localhost:5173](http://localhost:5173)

---

### 3. Android Capacitor Build (Mobile Setup)

Build the production web bundle and sync assets into the Android native template project:

```bash
cd frontend
npm run build
npx cap sync android
```

Open the Android project in **Android Studio**:
```bash
npx cap open android
```

Or execute CLI builds directly:
```bash
cd android
./gradlew bundleRelease
```
The resulting `.aab` file will be generated in `android/app/build/outputs/bundle/release/app-release.aab` for direct upload to Google Play Console.

---

### 4. Standalone Desktop GUI Setup

Navigate to the project root directory:
```bash
pip install -r requirements.txt
python main.py
```
*Note: Make sure your webcam is attached, as the Tkinter client tries to initialize your camera immediately upon loading.*

---

## 🔒 Environment Variable Configuration

Create a [backend/.env](file:///c:/Users/rajki/Desktop/face_recoginition/backend/.env) file to configure system settings:

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL or MySQL database URL | SQLite local DB |
| `ALLOW_DATABASE_FALLBACK` | Allows SQLite fallback if main DB connection fails | `true` |
| `ENV` | Environment mode (`development` or `production`) | `development` |
| `JWT_SECRET_KEY` | Key to sign authentication tokens | (Change this) |
| `GOOGLE_GENERATIVE_AI_API_KEY`| Google Gemini API key for Voice Assistant AI | (Required for AI chat) |
| `REDIS_URL` | Cache database server URI | None (in-memory fallback) |
| `STORAGE_BACKEND` | Biometric template storage system (`local` or `s3`) | `local` |
| `S3_BUCKET` | AWS S3 bucket name for face template files | None |
| `RAZORPAY_KEY_ID` | Razorypay billing public key id | None |
| `TWILIO_ACCOUNT_SID` | Twilio SMS notification SID account key | None |

---

## 🌐 Production Deployment Checklist (e.g. Render/AWS)

To ensure maximum security and efficiency on production servers:
1. **Disable SQLite Fallback**: Set `ALLOW_DATABASE_FALLBACK=false` to prevent silent SQLite write fallbacks on ephemeral server disks.
2. **Enforce Strict Keys**: Configure a `DEVELOPER_MASTER_KEY` (minimum 12 characters) and a `BUILD_CALLBACK_TOKEN` in settings.
3. **Configure AWS S3 storage**: Switch `STORAGE_BACKEND=s3` and specify your credentials so face biometric embeddings remain persistent when servers scale down.
4. **Secure Webhooks**: Bind callback parameters so external APIs like Razorpay or Twilio trigger cryptographically signed updates.
