import cv2
from tkinter import Canvas, ARC


FACE_SIZE = (200, 200)
# LBPH distance threshold.
# Lower => more strict recognition.
# You can tune this after retraining.
RECOGNITION_DISTANCE_THRESHOLD = 65.0
PREFERRED_CAMERA_INDEX = 0



def preprocess_face(image):
    if image is None or image.size == 0:
        raise ValueError("Face image is empty")

    if len(image.shape) == 3:
        image = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

    image = cv2.resize(image, FACE_SIZE, interpolation=cv2.INTER_AREA)
    return cv2.equalizeHist(image)


def create_lbph_recognizer():
    return cv2.face.LBPHFaceRecognizer_create(
        radius=1,
        neighbors=8,
        grid_x=8,
        grid_y=8,
    )


def open_camera(preferred_index=PREFERRED_CAMERA_INDEX):
    camera_indexes = [preferred_index, 1, 2, 3]
    checked_indexes = set()

    for camera_index in camera_indexes:
        if camera_index in checked_indexes:
            continue
        checked_indexes.add(camera_index)

        # Open camera using default OS backend first (typically much faster on modern Windows)
        camera = cv2.VideoCapture(camera_index)
        if not camera.isOpened():
            camera.release()
            # Fallback to DirectShow if default fails
            camera = cv2.VideoCapture(camera_index, cv2.CAP_DSHOW)
            if not camera.isOpened():
                camera.release()
                continue

        camera.set(cv2.CAP_PROP_FRAME_WIDTH, 1280)
        camera.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)
        success, frame = camera.read()
        if success and frame is not None:
            return camera, camera_index

        camera.release()

    return None, None


# --- Eye Aspect Ratio (EAR) Blink Detection Constants & Helpers ---
import numpy as np

# Mediapipe Face Mesh indices for eyes: [p1 (inner/outer corner), p2, p3, p4 (opposite corner), p5, p6]
LEFT_EYE_EAR_INDICES = [362, 385, 387, 263, 373, 380]
RIGHT_EYE_EAR_INDICES = [33, 160, 158, 133, 153, 144]
EAR_THRESHOLD = 0.20  # EAR threshold below which the eyes are considered closed

def calculate_ear(landmarks, eye_indices):
    """
    Calculates Eye Aspect Ratio (EAR) for given landmarks.
    landmarks is a list of (x, y) coordinates.
    """
    try:
        p1 = np.array(landmarks[eye_indices[0]])
        p2 = np.array(landmarks[eye_indices[1]])
        p3 = np.array(landmarks[eye_indices[2]])
        p4 = np.array(landmarks[eye_indices[3]])
        p5 = np.array(landmarks[eye_indices[4]])
        p6 = np.array(landmarks[eye_indices[5]])

        # Horizontal distance
        dist_horizontal = np.linalg.norm(p1 - p4)
        # Vertical distances
        dist_vertical_1 = np.linalg.norm(p2 - p6)
        dist_vertical_2 = np.linalg.norm(p3 - p5)

        if dist_horizontal == 0:
            return 0.0

        return (dist_vertical_1 + dist_vertical_2) / (2.0 * dist_horizontal)
    except Exception:
        return 0.0


def get_db_connection():
    """
    Parses DATABASE_URL from .env file and returns a MySQL connection.
    Falls back to local connection if DATABASE_URL is not set or invalid.
    """
    import os
    import mysql.connector
    from urllib.parse import urlparse, unquote
    from dotenv import load_dotenv
    
    # Load .env variables from current or parent directories
    load_dotenv()
    
    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        print("DATABASE_URL environment variable is missing, falling back to local database.")
        return mysql.connector.connect(
            host="localhost",
            username="root",
            password="raj@9211",
            database="face"
        )
        
    try:
        cleaned_url = db_url
        if cleaned_url.startswith("mysql+mysqlconnector://"):
            cleaned_url = cleaned_url.replace("mysql+mysqlconnector://", "mysql://", 1)
        
        parsed = urlparse(cleaned_url)
        username = unquote(parsed.username) if parsed.username else ""
        password = unquote(parsed.password) if parsed.password else ""
        host = parsed.hostname or "localhost"
        port = parsed.port or 3306
        database = parsed.path.lstrip('/') if parsed.path else ""
        
        return mysql.connector.connect(
            host=host,
            port=port,
            user=username,
            password=password,
            database=database
        )
    except Exception as e:
        print(f"Error connecting to Aiven Cloud database: {e}. Falling back to local database.")
        return mysql.connector.connect(
            host="localhost",
            username="root",
            password="raj@9211",
            database="face"
        )


def draw_hud_boundary(img, x, y, w, h, color, text_label, tracking_info=None):
    """
    Draws a futuristic sci-fi face scanning HUD around the bounding box (x, y, w, h).
    Includes corner brackets, animated scan line, and an overlay info panel.
    """
    import time
    import math

    # 1. Draw a thin boundary rectangle
    cv2.rectangle(img, (x, y), (x + w, y + h), color, 1, lineType=cv2.LINE_AA)

    # 2. Draw futuristic L-shaped corner brackets (thick)
    thickness = 3
    length = int(min(w, h) * 0.15)  # 15% of face size
    
    # Top-Left corner
    cv2.line(img, (x, y), (x + length, y), color, thickness)
    cv2.line(img, (x, y), (x, y + length), color, thickness)
    # Top-Right corner
    cv2.line(img, (x + w, y), (x + w - length, y), color, thickness)
    cv2.line(img, (x + w, y), (x + w, y + length), color, thickness)
    # Bottom-Left corner
    cv2.line(img, (x, y + h), (x + length, y + h), color, thickness)
    cv2.line(img, (x, y + h), (x, y + h - length), color, thickness)
    # Bottom-Right corner
    cv2.line(img, (x + w, y + h), (x + w - length, y + h), color, thickness)
    cv2.line(img, (x + w, y + h), (x + w, y + h - length), color, thickness)

    # 3. Animated horizontal scanning line (oscillating)
    scan_speed = 4.0
    pos = (math.sin(time.time() * scan_speed) + 1.0) / 2.0
    scan_y = int(y + pos * h)
    
    # Draw laser line
    cv2.line(img, (x, scan_y), (x + w, scan_y), color, 2, lineType=cv2.LINE_AA)
    # Edge glowing circles
    cv2.circle(img, (x, scan_y), 4, color, -1)
    cv2.circle(img, (x + w, scan_y), 4, color, -1)

    # 4. Translucent Info Panel (HUD details)
    lines = []
    if tracking_info:
        lines.append(f"NAME: {tracking_info.get('name', 'Unknown')}")
        lines.append(f"ROLL: {tracking_info.get('roll', 'Unknown')}")
        lines.append(f"DEPT: {tracking_info.get('dep', 'Unknown')}")
        lines.append(f"DIST: {tracking_info.get('dist', 0.0):.1f}")
        lines.append(f"LIVENESS: {tracking_info.get('liveness', 'Pending')}")
    else:
        lines.append(f"STATUS: {text_label}")
        lines.append("LIVENESS: PENDING")

    # Determine layout of text box
    panel_padding = 8
    line_height = 16
    panel_w = int(w * 1.1)
    if panel_w < 180:
        panel_w = 180
    panel_h = len(lines) * line_height + (panel_padding * 2)

    # Align panel to the side or top of the scanning box
    panel_x1 = x + w + 10
    panel_y1 = y
    
    # Check if panel goes off-screen right
    frame_h, frame_w, _ = img.shape
    if panel_x1 + panel_w > frame_w:
        # Fallback to drawing above the box
        panel_x1 = x
        panel_y1 = max(10, y - panel_h - 10)
        
    panel_x2 = panel_x1 + panel_w
    panel_y2 = panel_y1 + panel_h

    # Ensure coordinates are within image boundaries
    panel_x1 = max(0, min(panel_x1, frame_w - 1))
    panel_x2 = max(0, min(panel_x2, frame_w - 1))
    panel_y1 = max(0, min(panel_y1, frame_h - 1))
    panel_y2 = max(0, min(panel_y2, frame_h - 1))

    if panel_x2 > panel_x1 and panel_y2 > panel_y1:
        # Draw translucent background panel
        overlay = img.copy()
        cv2.rectangle(overlay, (panel_x1, panel_y1), (panel_x2, panel_y2), (0, 0, 0), -1)
        cv2.addWeighted(overlay, 0.45, img, 0.55, 0, img)
        
        # Draw thin border around panel
        cv2.rectangle(img, (panel_x1, panel_y1), (panel_x2, panel_y2), color, 1, lineType=cv2.LINE_AA)
        
        # Render text list
        current_y = panel_y1 + panel_padding + 10
        # Render text list
        current_y = panel_y1 + panel_padding + 10
        for line in lines:
            cv2.putText(img, line, (panel_x1 + 10, current_y), cv2.FONT_HERSHEY_SIMPLEX, 0.4, (255, 255, 255), 1, cv2.LINE_AA)
            current_y += line_height


class TechRadarCanvas(Canvas):
    def __init__(self, parent, **kwargs):
        super().__init__(parent, **kwargs)
        self.angle = 0
        self.pulse = 0
        self.draw_radar()
        
    def draw_radar(self):
        try:
            self.delete("all")
            width = int(self.cget("width"))
            height = int(self.cget("height"))
            cx, cy = width // 2, height // 2
            r = min(cx, cy) - 35
            
            # Draw radar background (dark green circular sweeps)
            self.create_oval(cx-r, cy-r, cx+r, cy+r, outline="#003300", width=1)
            self.create_oval(cx-r*0.6, cy-r*0.6, cx+r*0.6, cy+r*0.6, outline="#003300", width=1, dash=(5,5))
            self.create_oval(cx-r*0.3, cy-r*0.3, cx+r*0.3, cy+r*0.3, outline="#003300", width=1, dash=(3,3))
            
            self.create_line(cx-r, cy, cx+r, cy, fill="#003300", width=1)
            self.create_line(cx, cy-r, cx, cy+r, fill="#003300", width=1)
            
            # Draw pulsing ring (neon cyan)
            self.pulse = (self.pulse + 1.5) % r
            pulse_color = "#00ffff"
            self.create_oval(cx-self.pulse, cy-self.pulse, cx+self.pulse, cy+self.pulse, outline=pulse_color, width=2)
            
            # Draw rotating sweep line
            import math
            rad = math.radians(self.angle)
            sx = cx + r * math.cos(rad)
            sy = cy - r * math.sin(rad)
            self.create_line(cx, cy, sx, sy, fill="#00ff00", width=2)
            
            # Draw sweeping arc fading gradient
            self.create_arc(cx-r, cy-r, cx+r, cy+r, start=self.angle, extent=-45, fill="", outline="#00ff00", width=1, style=ARC)
            
            # Core glowing indicator
            self.create_oval(cx-4, cy-4, cx+4, cy+4, fill="#00ffff", outline="")
            
            # Tech HUD labels
            self.create_text(cx, cy - r - 15, text="SYSTEM STATUS: ENGAGED", fill="#00ff00", font=("Courier", 8, "bold"))
            self.create_text(cx, cy + r + 15, text="SCAN RETICLE ACTIVE", fill="#00ffff", font=("Courier", 8, "bold"))
            
            self.angle = (self.angle + 3) % 360
            self.after(30, self.draw_radar)
        except Exception:
            pass


def animate_typewriter(label, text, delay=35, index=0):
    """
    Types text sequentially character by character on a Tkinter Label.
    """
    try:
        if index <= len(text):
            label.config(text=text[:index])
            label.after(delay, lambda: animate_typewriter(label, text, delay, index + 1))
    except Exception:
        pass


def animate_neon_pulse(label, colors=None, delay=1200, index=0):
    """
    Slowly transitions label text color through tech/neon tones.
    """
    if colors is None:
        colors = ["#00ffff", "#00ff00", "#ff00ff", "#ffffff", "#0088ff"]
    try:
        current_color = colors[index % len(colors)]
        label.config(fg=current_color)
        label.after(delay, lambda: animate_neon_pulse(label, colors, delay, index + 1))
    except Exception:
        pass


def bind_button_glow(button, hover_bg="#00ff00", hover_fg="black", normal_bg="darkblue", normal_fg="white"):
    """
    Adds interactive hover glowing effect to any button.
    """
    try:
        button.config(bg=normal_bg, fg=normal_fg, activebackground=hover_bg, activeforeground=hover_fg)
        button.bind("<Enter>", lambda e: button.config(bg=hover_bg, fg=hover_fg))
        button.bind("<Leave>", lambda e: button.config(bg=normal_bg, fg=normal_fg))
    except Exception:
        pass


def draw_robotic_boot_frame(width, height, progress, status_line, tick=0):
    """Draws a single sci-fi boot frame for camera startup."""
    import math
    import numpy as np

    frame = np.zeros((height, width, 3), dtype=np.uint8)
    frame[:] = (8, 12, 18)

    grid_color = (20, 45, 55)
    for x in range(0, width, 32):
        cv2.line(frame, (x, 0), (x, height), grid_color, 1, lineType=cv2.LINE_AA)
    for y in range(0, height, 32):
        cv2.line(frame, (0, y), (width, y), grid_color, 1, lineType=cv2.LINE_AA)

    cx, cy = width // 2, height // 2 - 40
    for radius in (90, 65, 40):
        cv2.circle(frame, (cx, cy), radius, (0, 180, 200), 1, lineType=cv2.LINE_AA)

    sweep_angle = (tick * 8) % 360
    rad = math.radians(sweep_angle)
    sx = int(cx + 90 * math.cos(rad))
    sy = int(cy - 90 * math.sin(rad))
    cv2.line(frame, (cx, cy), (sx, sy), (0, 255, 180), 2, lineType=cv2.LINE_AA)
    cv2.circle(frame, (cx, cy), 4, (0, 255, 255), -1, lineType=cv2.LINE_AA)

    bracket_len = 28
    margin = 24
    corners = [
        ((margin, margin), (margin + bracket_len, margin), (margin, margin + bracket_len)),
        ((width - margin, margin), (width - margin - bracket_len, margin), (width - margin, margin + bracket_len)),
        ((margin, height - margin), (margin + bracket_len, height - margin), (margin, height - margin - bracket_len)),
        ((width - margin, height - margin), (width - margin - bracket_len, height - margin), (width - margin, height - margin - bracket_len)),
    ]
    for p1, p2, p3 in corners:
        cv2.line(frame, p1, p2, (0, 220, 255), 2, lineType=cv2.LINE_AA)
        cv2.line(frame, p1, p3, (0, 220, 255), 2, lineType=cv2.LINE_AA)

    cv2.putText(frame, "ROBOTIC SCANNER v2.0", (margin, 36), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (0, 220, 255), 1, cv2.LINE_AA)
    cv2.putText(frame, "SEC_CAM_DESKTOP", (width - 220, 36), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 140), 1, cv2.LINE_AA)
    cv2.putText(frame, f"> {status_line}", (margin, height - 90), cv2.FONT_HERSHEY_SIMPLEX, 0.48, (180, 255, 255), 1, cv2.LINE_AA)

    bar_x, bar_y, bar_w, bar_h = margin, height - 52, width - (margin * 2), 12
    cv2.rectangle(frame, (bar_x, bar_y), (bar_x + bar_w, bar_y + bar_h), (30, 60, 70), 1, lineType=cv2.LINE_AA)
    fill_w = int(bar_w * max(0.0, min(progress, 1.0)))
    if fill_w > 0:
        cv2.rectangle(frame, (bar_x, bar_y), (bar_x + fill_w, bar_y + bar_h), (0, 220, 255), -1, lineType=cv2.LINE_AA)
    cv2.putText(frame, f"SYSTEM BOOT {int(progress * 100)}%", (bar_x, bar_y - 8), cv2.FONT_HERSHEY_SIMPLEX, 0.42, (140, 170, 180), 1, cv2.LINE_AA)

    scan_y = int((math.sin(tick * 0.18) + 1) * 0.5 * (height - 40)) + 20
    cv2.line(frame, (margin, scan_y), (width - margin, scan_y), (0, 180, 220), 1, lineType=cv2.LINE_AA)

    return frame


def play_camera_boot_sequence(window_name="Welcome to Face Recognition", duration_sec=2.8):
    """Shows a short robotic boot animation before live camera feed."""
    boot_lines = [
        "INITIALIZING OPTICAL FEED...",
        "CALIBRATING BIOMETRIC SENSORS...",
        "LOADING LBPH NEURAL ENGINE...",
        "ACTIVATING LIVENESS PROTOCOL...",
        "SEC_CAM ONLINE — AWAITING SUBJECT",
    ]
    width, height = 960, 540
    total_frames = max(30, int(duration_sec * 30))
    cv2.namedWindow(window_name, cv2.WINDOW_NORMAL)

    for tick in range(total_frames):
        progress = tick / float(total_frames - 1)
        line_idx = min(len(boot_lines) - 1, int(progress * len(boot_lines)))
        frame = draw_robotic_boot_frame(width, height, progress, boot_lines[line_idx], tick)
        cv2.imshow(window_name, frame)
        if cv2.waitKey(33) in (13, 27):
            break

    for glitch_tick in range(6):
        frame = draw_robotic_boot_frame(width, height, 1.0, boot_lines[-1], tick + glitch_tick)
        if glitch_tick % 2 == 0:
            frame = cv2.convertScaleAbs(frame, alpha=1.2, beta=20)
        cv2.imshow(window_name, frame)
        cv2.waitKey(40)


