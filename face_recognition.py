from fileinput import filename
from  tkinter import *
from tkinter import ttk
from tkinter import messagebox
from PIL import Image, ImageTk
import mysql.connector
import cv2
import csv
import os
import numpy as np
import threading
import mediapipe as mp
import mediapipe.python.solutions.face_mesh as mp_face_mesh
from time import strftime
from datetime import datetime
from collections import Counter, deque
from face_utils import (
    get_face_engines,
    open_camera,
    LEFT_EYE_EAR_INDICES,
    RIGHT_EYE_EAR_INDICES,
    EAR_THRESHOLD,
    calculate_ear,
    get_db_connection,
    draw_hud_boundary,
    play_camera_boot_sequence,
    setup_standard_window,
    make_card,
    make_button,
    make_section_label,
    make_status_chip,
    style_button,
    UI_BG, UI_SURFACE, UI_SURFACE_ALT, UI_PRIMARY, UI_ACCENT,
    UI_TEXT, UI_TEXT_MUTED, UI_SUCCESS, UI_DANGER, UI_INFO,
    UI_PAD, UI_PAD_LG, UI_PAD_SM,
    UI_FONT_HEADING, UI_FONT_SUBTITLE, UI_FONT_BODY, UI_FONT_LABEL, UI_FONT_BTN_LG,
)
from notification_utils import send_telegram_message_async

class Face_Recognition:
    def __init__(self, root):
        self.root = root

        # Set up default states
        self.clf = None
        self.detector = None
        self.recognizer = None
        self.model_loaded = False

        # ── Theme bootstrap ─────────────────────────────────────────────
        content = setup_standard_window(
            root,
            "Face Recognition Scanner",
            subtitle_text="Live Biometric Attendance  •  YuNet + SFace + Liveness"
        )

        # ── Top row: Info + Model Status ────────────────────────────────
        top_row = Frame(content, bg=UI_BG)
        top_row.pack(fill="x", pady=(0, UI_PAD_LG))

        # Left: Scanner info card
        info_card = make_card(top_row, padx=UI_PAD_LG, pady=UI_PAD_LG)
        info_card.pack(side="left", fill="both", expand=True, padx=(0, UI_PAD_LG))
        ic = info_card._inner

        hdr = make_section_label(ic, "Live Scanner Overview", color=UI_PRIMARY)
        hdr.pack(anchor="w")

        desc = Label(
            ic,
            text=(
                "This module captures live video from your webcam, detects faces using the YuNet "
                "deep-learning detector, matches identities against SFace 128D embeddings, enforces "
                "a 2-blink liveness challenge, and automatically marks verified attendance in "
                "both CSV and the MySQL database with Telegram notifications."
            ),
            font=UI_FONT_BODY, bg=UI_SURFACE, fg=UI_TEXT_MUTED,
            wraplength=700, justify="left"
        )
        desc.pack(anchor="w", pady=(UI_PAD_SM, UI_PAD))

        # Feature highlights
        features_row = Frame(ic, bg=UI_SURFACE)
        features_row.pack(anchor="w")

        highlights = [
            ("📸", "YuNet Detection"),
            ("🧠", "SFace Matching"),
            ("👁️", "2-Blink Liveness"),
            ("✅", "Auto Attendance"),
        ]
        for icon, label in highlights:
            chip = make_status_chip(features_row, f" {icon}  {label} ", "info")
            chip.pack(side="left", padx=(0, UI_PAD_SM))

        # Right: Status + Control card
        ctrl_card = make_card(top_row, padx=UI_PAD_LG, pady=UI_PAD_LG)
        ctrl_card.pack(side="right", fill="y", padx=(UI_PAD_LG, 0))
        cc = ctrl_card._inner

        st_hdr = make_section_label(cc, "System Status", color=UI_TEXT)
        st_hdr.pack(anchor="w")

        # Status chip (replaces old yellow/red labels)
        self.status_chip = make_status_chip(
            cc, "⏳  Loading Deep Learning Models…  Please wait", "loading"
        )
        self.status_chip.pack(anchor="w", fill="x", pady=(UI_PAD_SM, UI_PAD))

        # Status text (secondary)
        self.status_text_lbl = Label(
            cc,
            text="YuNet + SFace ONNX models are loading in the background.\nThe Start button will become active once models are ready.",
            font=UI_FONT_BODY, bg=UI_SURFACE, fg=UI_TEXT_MUTED, justify="left"
        )
        self.status_text_lbl.pack(anchor="w", pady=(0, UI_PAD_LG))

        # Big primary action button
        self.b1 = Button(
            cc, text="▶  Start Face Recognition", state=DISABLED,
            command=self.face_recog, font=UI_FONT_BTN_LG, pady=12
        )
        style_button(self.b1, variant="success")
        self.b1.pack(fill="x")

        # Hint
        hint_lbl = Label(
            cc,
            text="Press Enter or Esc to close the live camera window during scanning.",
            font=("Segoe UI", 9, "normal"), bg=UI_SURFACE, fg=UI_TEXT_MUTED, justify="left"
        )
        hint_lbl.pack(anchor="w", pady=(UI_PAD, 0))

        # ── Bottom: Workflow steps ──────────────────────────────────────
        steps_card = make_card(content, padx=UI_PAD_LG, pady=UI_PAD_LG)
        steps_card.pack(fill="both", expand=True)
        sc = steps_card._inner

        steps_hdr = make_section_label(sc, "Scanner Workflow", color=UI_PRIMARY)
        steps_hdr.pack(anchor="w", pady=(0, UI_PAD))

        steps = [
            ("1", "Model Initialization", "YuNet face detector and SFace recognizer ONNX models are loaded into memory on a background thread."),
            ("2", "Camera Warmup", "Your webcam is detected, boot animation plays, and the MediaPipe Face Mesh pipeline starts for blink tracking."),
            ("3", "Detection + Matching", "Every frame runs face detection → 128D embedding extraction → cosine match against enrolled records (threshold ≥ 0.43)."),
            ("4", "Liveness Challenge", "Tracked identities must exhibit 2 valid eye-blink cycles (EAR < 0.20) before they are trusted as a live human."),
            ("5", "Attendance Commit", "Once a live identity is confirmed, attendance is appended to attendance.csv, upserted into MySQL, and a Telegram alert is fired asynchronously."),
        ]

        steps_grid = Frame(sc, bg=UI_SURFACE)
        steps_grid.pack(fill="both", expand=True)

        for i, (num, title, desc) in enumerate(steps):
            row = Frame(steps_grid, bg=UI_SURFACE)
            row.pack(fill="x", pady=UI_PAD_SM)

            num_lbl = Label(
                row, text=num, width=3,
                font=("Segoe UI", 14, "bold"),
                bg=UI_PRIMARY, fg="white",
                padx=8, pady=6
            )
            num_lbl.pack(side="left")

            right = Frame(row, bg=UI_SURFACE)
            right.pack(side="left", fill="x", expand=True, padx=UI_PAD)

            t_lbl = Label(right, text=title, font=UI_FONT_HEADING, bg=UI_SURFACE, fg=UI_TEXT)
            t_lbl.pack(anchor="w")

            d_lbl = Label(right, text=desc, font=UI_FONT_BODY, bg=UI_SURFACE, fg=UI_TEXT_MUTED, wraplength=900, justify="left")
            d_lbl.pack(anchor="w")

        # Start the background model-loader thread
        threading.Thread(target=self.load_model_in_background, daemon=True).start()

    def load_model_in_background(self):
        print("Background: Loading YuNet & SFace ONNX models...")
        try:
            detector, recognizer = get_face_engines()
            self.detector = detector
            self.recognizer = recognizer
            self.model_loaded = True
            print("Background: Deep Learning models loaded successfully!")
            self.root.after(0, self.on_model_loaded)
        except Exception as e:
            print("Error loading Deep Learning models in background:", e)
            self.root.after(0, lambda: self.on_model_load_error(e))

    def on_model_loaded(self):
        self.status_chip.config(text="✔  Deep Learning Models Ready — Start scanning",
                                fg=UI_SUCCESS, bg="#d1fae5")
        self.status_text_lbl.config(
            text="All AI models are loaded. Click the button below to begin live recognition."
        )
        self.b1.config(state=NORMAL)

    def on_model_load_error(self, err):
        self.status_chip.config(text=f"✖  Model error — see logs",
                                fg=UI_DANGER, bg="#fee2e2")
        self.status_text_lbl.config(text=f"Model failure: {err}")

    #face recognition
    def face_recog(self):
        face_tracks = {}
        next_track_id = 1
        attendance_marked_ids = set()
        face_mesh = mp_face_mesh.FaceMesh(refine_landmarks=True)

        detector = self.detector
        recognizer = self.recognizer

        if detector is None or recognizer is None:
            messagebox.showerror("Error", "Deep Learning models are not loaded. Cannot run recognition.", parent=self.root)
            return

        def draw_boundary(img):
            nonlocal next_track_id

            # Run Mediapipe Face Mesh on the entire frame for eye tracking / liveness
            rgb_img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
            results = face_mesh.process(rgb_img)

            face_landmarks_list = []
            if results.multi_face_landmarks:
                h_img, w_img, _ = img.shape
                for face_landmarks in results.multi_face_landmarks:
                    landmarks = [
                        (lm.x * w_img, lm.y * h_img)
                        for lm in face_landmarks.landmark
                    ]
                    face_landmarks_list.append(landmarks)

            # Detect faces with YuNet
            h_img, w_img = img.shape[:2]
            detector.setInputSize((w_img, h_img))
            retval, faces = detector.detect(img)

            used_track_ids = set()

            for track in face_tracks.values():
                track["missed"] += 1

            if retval and faces is not None and len(faces) > 0:
                for face in faces:
                    x, y, w, h = int(face[0]), int(face[1]), int(face[2]), int(face[3])
                    if w < 40 or h < 40:
                        continue

                    # Find matching face mesh landmarks closest to YuNet box center
                    center_x = x + w / 2
                    center_y = y + h / 2
                    best_mesh = None
                    min_mesh_dist = float("inf")

                    for landmarks in face_landmarks_list:
                        mesh_xs = [p[0] for p in landmarks]
                        mesh_ys = [p[1] for p in landmarks]
                        mesh_center_x = sum(mesh_xs) / len(mesh_xs)
                        mesh_center_y = sum(mesh_ys) / len(mesh_ys)

                        mesh_dist = ((center_x - mesh_center_x)**2 + (center_y - mesh_center_y)**2)**0.5
                        if mesh_dist < min_mesh_dist and mesh_dist < max(w, h) * 0.5:
                            best_mesh = landmarks
                            min_mesh_dist = mesh_dist

                    # Extract SFace embedding feature vector
                    try:
                        aligned = recognizer.alignCrop(img, face)
                        feat = recognizer.feature(aligned)
                    except Exception as extract_err:
                        print(f"Failed feature extraction: {extract_err}")
                        continue

                    if feat is None:
                        continue

                    # Compare against all cached student embeddings (cosine similarity)
                    best_id = None
                    best_score = -1.0

                    for student_id, record in student_records.items():
                        ref_emb = record["embedding"]
                        score = recognizer.match(feat, ref_emb, cv2.FaceRecognizerSF_FR_COSINE)
                        if score > best_score:
                            best_score = score
                            best_id = student_id

                    # Threshold 0.43
                    candidate_id = best_id if (best_id is not None and best_score >= 0.43) else None

                    # Object Tracking association
                    best_track_id = None
                    best_distance = float("inf")

                    for track_id, track in face_tracks.items():
                        if track_id in used_track_ids:
                            continue

                        old_x, old_y, old_w, old_h = track["box"]
                        old_center_x = old_x + old_w / 2
                        old_center_y = old_y + old_h / 2
                        center_distance = (
                            (center_x - old_center_x) ** 2
                            + (center_y - old_center_y) ** 2
                        ) ** 0.5
                        max_distance = max(w, h, old_w, old_h) * 0.75

                        if center_distance <= max_distance and center_distance < best_distance:
                            best_track_id = track_id
                            best_distance = center_distance

                    if best_track_id is None:
                        best_track_id = next_track_id
                        next_track_id += 1
                        face_tracks[best_track_id] = {
                            "box": (x, y, w, h),
                            "history": deque(maxlen=4),
                            "locked_id": None,
                            "weak_frames": 0,
                            "missed": 0,
                            "last_distance": best_score,
                            "blink_count": 0,
                            "is_eye_closed": False,
                            "liveness_verified": False,
                        }
                    else:
                        track = face_tracks[best_track_id]
                        old_x, old_y, old_w, old_h = track["box"]
                        smoothing = 0.35
                        track["box"] = (
                            round(old_x * (1 - smoothing) + x * smoothing),
                            round(old_y * (1 - smoothing) + y * smoothing),
                            round(old_w * (1 - smoothing) + w * smoothing),
                            round(old_h * (1 - smoothing) + h * smoothing),
                        )
                        face_tracks[best_track_id]["missed"] = 0

                    used_track_ids.add(best_track_id)
                    prediction_history = face_tracks[best_track_id]["history"]

                    track = face_tracks[best_track_id]
                    track["last_distance"] = best_score
                    if candidate_id is not None:
                        prediction_history.append(candidate_id)
                    else:
                        prediction_history.append(None)

                    # Process eye blink detection if landmarks are matched
                    if best_mesh is not None:
                        left_ear = calculate_ear(best_mesh, LEFT_EYE_EAR_INDICES)
                        right_ear = calculate_ear(best_mesh, RIGHT_EYE_EAR_INDICES)
                        avg_ear = (left_ear + right_ear) / 2.0

                        if avg_ear < EAR_THRESHOLD:
                            track["is_eye_closed"] = True
                        else:
                            if track.get("is_eye_closed", False):
                                track["blink_count"] += 1
                                track["is_eye_closed"] = False
                                print(f"Blink count for track {best_track_id}: {track['blink_count']}")
                                if track["blink_count"] >= 2:
                                    track["liveness_verified"] = True

                    valid_predictions = [
                        student_id for student_id in prediction_history
                        if student_id is not None
                    ]

                    if track["locked_id"] is None and valid_predictions:
                        most_common_id, votes = Counter(valid_predictions).most_common(1)[0]
                        if votes >= 2 and candidate_id == most_common_id:
                            track["locked_id"] = most_common_id
                            track["weak_frames"] = 0

                    stable_id = track["locked_id"]
                    if stable_id is not None:
                        if candidate_id == stable_id and best_score >= 0.43:
                            track["weak_frames"] = 0
                        else:
                            track["weak_frames"] += 1

                        if track["weak_frames"] >= 15:
                            track["locked_id"] = None
                            track["history"].clear()
                            track["weak_frames"] = 0
                            stable_id = None
                            # Reset liveness values as well when lock is broken
                            track["blink_count"] = 0
                            track["is_eye_closed"] = False
                            track["liveness_verified"] = False

            # Draw HUD elements for active tracks
            for track in face_tracks.values():
                if track["missed"] > 3:
                    continue

                x, y, w, h = track["box"]
                stable_id = track["locked_id"]

                if stable_id is None:
                    last_score = track.get("last_distance")
                    if last_score is not None and last_score < 0.30:
                        continue

                    draw_hud_boundary(img, x, y, w, h, (0, 0, 255), "SCANNING...")
                    continue

                # Retrieve details of the recognized student
                student = student_records[stable_id]
                n = student["name"]
                r = student["roll"]
                d = student["dep"]
                
                is_verified = track.get("liveness_verified", False)
                blinks = track.get("blink_count", 0)
                last_score = track.get("last_distance", 0.0)

                if is_verified:
                    color = (0, 255, 0)
                    status_str = "Verified"
                else:
                    color = (255, 120, 0)
                    status_str = f"Checking Blinks ({blinks}/2)"

                tracking_info = {
                    "name": n,
                    "roll": r,
                    "dep": d,
                    "dist": last_score * 100.0, # Pass percentage to the HUD
                    "liveness": status_str
                }

                draw_hud_boundary(img, x, y, w, h, color, f"ID: {stable_id}", tracking_info)

                if is_verified and stable_id not in attendance_marked_ids:
                    self.mark_attendance(stable_id, r, n, d)
                    attendance_marked_ids.add(stable_id)

            stale_track_ids = [
                track_id for track_id, track in face_tracks.items()
                if track["missed"] > 3
            ]
            for track_id in stale_track_ids:
                del face_tracks[track_id]

        def recognize(img):
            draw_boundary(img)
            return img

        # Query all students with registered face embeddings
        try:
            import json
            conn = get_db_connection()
            my_cursor = conn.cursor()
            my_cursor.execute("select `id`, `name`, `roll`, `dep`, `face_embedding` from student")
            
            student_records = {}
            for row in my_cursor.fetchall():
                try:
                    s_id = int(row[0])
                    s_name = str(row[1] or "Unknown")
                    s_roll = str(row[2] or "Unknown")
                    s_dep = str(row[3] or "Unknown")
                    if row[4]:
                        emb = json.loads(row[4])
                        emb_np = np.array(emb, dtype=np.float32).reshape(1, -1)
                        student_records[s_id] = {
                            "name": s_name,
                            "roll": s_roll,
                            "dep": s_dep,
                            "embedding": emb_np
                        }
                except Exception as parse_err:
                    print(f"Skipping student ID {row[0]} due to invalid embedding format: {parse_err}")
            conn.close()
            print(f"Loaded {len(student_records)} student embeddings from database for recognition.")
        except Exception as error:
            messagebox.showerror(
                "Database Error",
                f"Unable to load student records:\n{error}",
                parent=self.root,
            )
            return

        if not student_records:
            messagebox.showwarning("Warning", "No registered face database found. Please register student faces first.", parent=self.root)
            return

        video_cap, camera_index = open_camera()
        if video_cap is None:
            messagebox.showerror(
                "Error",
                "External or internal camera could not be opened.",
                parent=self.root,
            )
            return

        print(f"Using camera index for recognition: {camera_index}")

        play_camera_boot_sequence("Welcome to Face Recognition")

        while True:
            ret, img = video_cap.read()
            if not ret:
                continue

            img = cv2.flip(img, 1)
            img = recognize(img)
            cv2.imshow("Welcome to Face Recognition", img)

            key = cv2.waitKey(1)
            if key == 13 or key == 27:
                break

        video_cap.release()
        face_mesh.close()
        cv2.destroyAllWindows()

    def mark_attendance(self, student_id, roll, name, dep):
        script_dir = os.path.dirname(os.path.abspath(__file__))
        attendance_path = os.path.join(script_dir, "attendance.csv")
        now = datetime.now()
        date_string = now.strftime("%d/%m/%Y")
        time_string = now.strftime("%H:%M:%S")
        required_columns = ["ID", "Roll", "Name", "Department", "Time", "Date", "Status"]

        existing_rows = []
        header = []
        if os.path.exists(attendance_path):
            with open(attendance_path, "r", newline="", encoding="utf-8") as f:
                reader = csv.reader(f)
                header = next(reader, [])
                for row in reader:
                    existing_rows.append(row)

        if header != required_columns:
            with open(attendance_path, "w", newline="", encoding="utf-8") as f:
                writer = csv.writer(f)
                writer.writerow(required_columns)
                for row in existing_rows:
                    writer.writerow(row + [""] * (len(required_columns) - len(row)))

        registered = set()
        with open(attendance_path, "r", newline="", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                if row.get("ID") and row.get("Date"):
                    registered.add((row.get("ID").strip(), row.get("Date").strip()))

        current_key = (str(student_id), date_string)
        if current_key in registered:
            print(f"Attendance already exists for {student_id} on {date_string}")
            return

        with open(attendance_path, "a", newline="", encoding="utf-8") as f:
            writer = csv.writer(f)
            writer.writerow([student_id, roll, name, dep, time_string, date_string, "Present"])
            print(f"Attendance written to CSV: {student_id}, {date_string}, {time_string}")

        # Write to MySQL DB
        try:
            conn = get_db_connection()
            my_cursor = conn.cursor()
            my_cursor.execute("select id from attendence where id = %s and date = %s", (str(student_id), date_string))
            existing_db = my_cursor.fetchone()
            if not existing_db:
                my_cursor.execute(
                    "INSERT INTO attendence (id, roll, name, department, time, date, attendance) VALUES (%s, %s, %s, %s, %s, %s, %s)",
                    (str(student_id), str(roll), str(name), str(dep), time_string, date_string, "Present")
                )
                conn.commit()
                print(f"Attendance written to MySQL database: {student_id}")
                send_telegram_message_async(f"✅ Attendance Marked: {name} (ID: {student_id}, Roll: {roll}) at {time_string} on {date_string}")
            conn.close()
        except Exception as error:
            print(f"Unable to save attendance to MySQL database: {error}")



if __name__ == "__main__":

    root = Tk()
    obj = Face_Recognition(root)
    root.mainloop()
