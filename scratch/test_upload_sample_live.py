import requests
import json

base_url = "https://smart-attendance-system-1-mvwa.onrender.com/api/v1"

# 1. Health check
try:
    r = requests.get(f"{base_url}/health/")
    print(f"Health check status: {r.status_code}, body: {r.text}")
except Exception as e:
    print(f"Health check exception: {e}")

# 2. Login as admin or test endpoint
try:
    r = requests.post(f"{base_url}/auth/token", data={"username": "admin@example.com", "password": "adminpassword"})
    print(f"Login status: {r.status_code}")
    if r.status_code == 200:
        token = r.json().get("access_token")
        print("Logged in successfully. Token received.")
        
        # Test upload-sample with a dummy image (e.g. 100x100 black image or face image)
        import cv2
        import numpy as np
        img = np.zeros((300, 300, 3), dtype=np.uint8)
        _, img_encoded = cv2.imencode('.jpg', img)
        
        files = {'file': ('sample.jpg', img_encoded.tobytes(), 'image/jpeg')}
        headers = {'Authorization': f'Bearer {token}', 'X-Master-Password': 'master'}
        
        r2 = requests.post(f"{base_url}/users/students/655/upload-sample", files=files, headers=headers)
        print(f"Upload sample response: status={r2.status_code}, body={r2.text}")
    else:
        print(f"Login body: {r.text}")
except Exception as e:
    print(f"Exception during test: {e}")
