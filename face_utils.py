import cv2


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
        for line in lines:
            cv2.putText(img, line, (panel_x1 + 10, current_y), cv2.FONT_HERSHEY_SIMPLEX, 0.4, (255, 255, 255), 1, cv2.LINE_AA)
            current_y += line_height



