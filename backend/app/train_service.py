import os
import cv2
import numpy as np
from .face_utils import create_lbph_recognizer, preprocess_face

def train_model():
    """
    Reads all student face samples in the data folder, preprocesses them,
    applies image augmentations for robust training, trains the LBPH face recognizer,
    and updates 'classifier.xml' in the root directory.
    """
    # Define directories relative to this file (backend/app/train_service.py)
    app_dir = os.path.dirname(os.path.abspath(__file__)) # backend/app
    backend_dir = os.path.dirname(app_dir) # backend
    root_dir = os.path.dirname(backend_dir) # root directory
    
    data_dir = os.path.join(root_dir, "data")
    if not os.path.exists(data_dir):
        raise FileNotFoundError(f"Data folder not found at: {data_dir}")

    # Gather all valid dataset image paths
    image_paths = []
    for file in os.listdir(data_dir):
        if file.startswith("user.") and file.endswith(".jpg"):
            image_paths.append(os.path.join(data_dir, file))
            
    if not image_paths:
        raise ValueError("No valid face samples (user.*.jpg) found in data directory for training.")

    faces = []
    ids = []

    for path in image_paths:
        filename = os.path.basename(path)
        parts = filename.split('.')

        # Expected format: user.{id}.{sample_num}.jpg
        if len(parts) < 4 or parts[0] != "user" or parts[1] == "":
            print(f"Skipping invalid file name format: {filename}")
            continue

        try:
            student_id = int(parts[1])
        except ValueError:
            print(f"Skipping invalid student ID in filename: {filename}")
            continue

        # Read image in grayscale mode
        raw_image = cv2.imread(path, cv2.IMREAD_GRAYSCALE)
        if raw_image is None or raw_image.size == 0:
            print(f"Skipping unreadable image: {filename}")
            continue

        # Preprocess core face (200x200 pixels)
        image_np = preprocess_face(raw_image)

        # Since we already capture 100 dynamic frames from the browser stream,
        # we only add a horizontal flip for symmetry, keeping the dataset size optimal.
        augmented = [image_np, cv2.flip(image_np, 1)]

        faces.extend(augmented)
        ids.extend([student_id] * len(augmented))

    if not faces:
        raise ValueError("No valid face arrays could be parsed for training.")

    ids = np.array(ids, dtype=np.int32)

    # Train LBPH face recognizer
    clf = create_lbph_recognizer()
    clf.train(faces, ids)
    
    # Save the classifier file to the root directory
    classifier_path = os.path.join(root_dir, "classifier.xml")
    clf.write(classifier_path)
    print(f"Classifier saved successfully to: {classifier_path}")

    # Re-load the classifier inside recognition service if it's currently running
    try:
        from .recognition_service import recognition_service
        recognition_service._load_models()
    except Exception as e:
        print(f"Could not automatically reload models in running backend process: {e}")

    return len(image_paths), len(set(ids))
