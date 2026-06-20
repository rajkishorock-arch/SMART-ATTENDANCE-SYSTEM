import os
import subprocess
import sys

def main():
    print("Installing backend requirements...")
    # Get the directory where build.py is located (root/backend/)
    backend_dir = os.path.dirname(os.path.abspath(__file__))
    req_path = os.path.join(backend_dir, "requirements.txt")
    
    # Run pip install
    subprocess.check_call([sys.executable, "-m", "pip", "install", "-r", req_path])
    
    print("Downloading and caching ONNX models in the build image...")
    # Add backend directory to sys.path so 'app' can be imported
    if backend_dir not in sys.path:
        sys.path.insert(0, backend_dir)
        
    try:
        from app.face_utils import download_onnx_models
        download_onnx_models()
        print("ONNX models pre-downloaded successfully!")
    except Exception as e:
        print(f"Warning: Failed to pre-download models during build: {e}")
        
    print("Build phase completed successfully!")

if __name__ == "__main__":
    main()
