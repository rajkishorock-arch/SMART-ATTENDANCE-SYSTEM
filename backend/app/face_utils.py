import cv2
import os
import urllib.request
import numpy as np

FACE_SIZE = (200, 200)
RECOGNITION_DISTANCE_THRESHOLD = 65.0
PREFERRED_CAMERA_INDEX = 0

# Cached ONNX model instances
_detector = None
_recognizer = None

def download_onnx_models():
    """
    Downloads YuNet (Detection) and SFace (Recognition) ONNX weights from the official
    OpenCV model zoo if they do not already exist in the backend/models directory.
    """
    app_dir = os.path.dirname(os.path.abspath(__file__)) # backend/app
    backend_dir = os.path.dirname(app_dir) # backend
    
    models_dir = os.path.join(backend_dir, "models")
    os.makedirs(models_dir, exist_ok=True)
    
    yunet_path = os.path.join(models_dir, "face_detection_yunet_2023mar.onnx")
    sface_path = os.path.join(models_dir, "face_recognition_sface_2021dec.onnx")
    
    yunet_url = "https://github.com/opencv/opencv_zoo/raw/main/models/face_detection_yunet/face_detection_yunet_2023mar.onnx"
    sface_url = "https://github.com/opencv/opencv_zoo/raw/main/models/face_recognition_sface/face_recognition_sface_2021dec.onnx"
    
    if not os.path.exists(yunet_path):
        print(f"Downloading YuNet model to {yunet_path}...")
        try:
            urllib.request.urlretrieve(yunet_url, yunet_path)
            print("YuNet model downloaded successfully.")
        except Exception as e:
            print(f"Error downloading YuNet model: {e}")
            raise e
        
    if not os.path.exists(sface_path):
        print(f"Downloading SFace model to {sface_path}...")
        try:
            urllib.request.urlretrieve(sface_url, sface_path)
            print("SFace model downloaded successfully.")
        except Exception as e:
            print(f"Error downloading SFace model: {e}")
            raise e
        
    return yunet_path, sface_path

def get_face_engines():
    """
    Returns (detector, recognizer) singleton instances. Loads them on first call.
    """
    global _detector, _recognizer
    if _detector is None or _recognizer is None:
        yunet_path, sface_path = download_onnx_models()
        # Initialize detector with a default input size (320x240)
        _detector = cv2.FaceDetectorYN_create(yunet_path, "", (320, 240))
        _recognizer = cv2.FaceRecognizerSF_create(sface_path, "")
    return _detector, _recognizer

def get_face_embedding(image):
    """
    Given a BGR image, detects the face, aligns/crops it, and extracts the 128D SFace embedding vector.
    Returns:
        numpy.ndarray: 128D embedding vector, or None if no face is detected.
    """
    if image is None or image.size == 0:
        return None
        
    try:
        detector, recognizer = get_face_engines()
        
        # Set the input size dynamically based on the image dimensions
        h, w = image.shape[:2]
        detector.setInputSize((w, h))
        
        # Detect faces
        retval, faces = detector.detect(image)
        if not retval or faces is None or len(faces) == 0:
            return None
            
        # Get the face with the highest confidence
        best_face_idx = 0
        if len(faces) > 1:
            best_face_idx = np.argmax(faces[:, 14])
            
        best_face = faces[best_face_idx]
        
        # Align and crop the face crop
        aligned_face = recognizer.alignCrop(image, best_face)
        
        # Extract SFace 128-D vector
        feature = recognizer.feature(aligned_face) # shape: (1, 128)
        
        return feature[0]
    except Exception as e:
        print(f"Failed to extract face embedding: {e}")
        return None

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
