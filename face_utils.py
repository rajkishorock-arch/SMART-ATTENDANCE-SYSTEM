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

