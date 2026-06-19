# AI Attendance System Roadmap

This document outlines the advanced and pro-level features planned for the **AI-Powered Secure Face Recognition Attendance System**. We will implement these features step-by-step.

---

## Roadmap Phases

### 🟩 Phase 1: Deep Learning Face Recognition (Upgrade from LBPH)
* **Goal**: Replace the outdated LBPH Face Recognizer with state-of-the-art Deep Learning embeddings using OpenCV's native **SFace (SphereFace)** and **YuNet** ONNX models.
* **Key Tasks**:
  * Auto-download YuNet (Detection) and SFace (Recognition) ONNX models.
  * Upgrade registration to extract a 128-dimensional embedding vector from a single reference image (One-Shot Learning).
  * Update database schema to store embedding vectors in the `student` table.
  * Rewrite face recognition logic to calculate Cosine Similarity against database embeddings.
* **Status**: ⏳ *Starting Next*

---

### 🟨 Phase 2: Liveness Detection (Anti-Spoofing)
* **Goal**: Prevent spoofing attacks (e.g., showing a photo of a student on a phone screen).
* **Key Tasks**:
  * Implement **Eye Blink Detection** using facial landmarks (calculating Eye Aspect Ratio - EAR).
  * Implement **Texture/Motion analysis** to check if the face displays natural micro-expressions.
* **Status**: 💤 *Planned*

---

### 🟨 Phase 3: Student Self-Registration (Selfie Upload)
* **Goal**: Offload registration work from administrators to students.
* **Key Tasks**:
  * Allow logged-in students to upload a selfie photo through the student portal.
  * Run automated quality checks (brightness, blurriness, face count = 1).
  * Automatically extract embeddings and update the student profile.
* **Status**: 💤 *Planned*

---

### 🟨 Phase 4: Automated PDF Reports & Scheduled Mailing
* **Goal**: Automatically send weekly/monthly reports to teachers and HODs.
* **Key Tasks**:
  * Build a PDF generator to create beautiful, printable reports of class attendance.
  * Integrate `APScheduler` or a cron task to run weekly reports.
  * Auto-email these PDF reports to administrators.
* **Status**: 💤 *Planned*

---

### 🟨 Phase 5: Geofencing & IP Network Restriction
* **Goal**: Restrict portal access to only be usable inside the campus.
* **Key Tasks**:
  * Restrict attendance actions to a list of allowed campus Wi-Fi IP addresses.
  * Check browser GPS geolocation to verify if the student is within college boundaries.
* **Status**: 💤 *Planned*

---

### 🟨 Phase 6: Telegram/WhatsApp Real-time Notifications
* **Goal**: Send instant notifications to students/parents.
* **Key Tasks**:
  * Create a Telegram Bot and integrate its webhooks.
  * Configure Twilio API for sending instant WhatsApp alerts.
* **Status**: 💤 *Planned*
