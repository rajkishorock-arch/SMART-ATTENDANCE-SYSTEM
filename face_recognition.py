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
)
from notification_utils import send_telegram_message_async

class Face_Recognition:
    def __init__(self, root):
        self.root = root
        self.screen_width = self.root.winfo_screenwidth()
        self.screen_height = self.root.winfo_screenheight()
        self.root.geometry(f"{self.screen_width}x{self.screen_height}+0+0")
        self.root.state('zoomed')
        self.root.title("Face Recognition System")

        # Set up default states
        self.clf = None
        self.detector = None
        self.recognizer = None
        self.model_loaded = False

        title_lbl = Label(self.root, text="Face Recognition", font=( "times new roman", 35, "bold"), bg="white", fg="red")
        title_lbl.place(x=0, y=0, width=self.screen_width, height=45)

        img_top = Image.open(r"C:\Users\rajki\Desktop\New folder\image\face4.jpg")
        img_top = img_top.resize((650, 750), Image.LANCZOS)
        self.photoimg_top = ImageTk.PhotoImage(img_top) 

        f_lbl = Label(self.root, image=self.photoimg_top)      
        f_lbl.place(x=0, y=45, width=650, height=750)

        #second image
        img_bottom = Image.open(r"C:\Users\rajki\Desktop\New folder\image\eace.jpg")
        img_bottom = img_bottom.resize((950, 750), Image.LANCZOS)
        self.photoimg_bottom = ImageTk.PhotoImage(img_bottom)

        f_lbl = Label(self.root, image=self.photoimg_bottom)
        f_lbl.place(x=650, y=45, width=950, height=750)

        # Status loading label
        self.status_lbl = Label(f_lbl, text="Loading Deep Learning Models... Please wait...", font=("times new roman", 12, "bold"), bg="yellow", fg="black")
        self.status_lbl.place(x=77, y=550, width=300, height=35)

        # Start button is disabled initially
        self.b1 = Button(f_lbl, text="Face Recognition", state=DISABLED, cursor="hand2", command=self.face_recog, font=("times new roman", 30, "bold"), bg="darkgreen", fg="white")
        self.b1.place(x=77, y=600, width=300, height=50)

        # Start the background thread
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
        self.status_lbl.config(text="Deep Learning Models Loaded!", bg="lightgreen", fg="black")
        self.b1.config(state=NORMAL)

    def on_model_load_error(self, err):
        self.status_lbl.config(text=f"Error loading models: {err}", bg="red", fg="white")

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
