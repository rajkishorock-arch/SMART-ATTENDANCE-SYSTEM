import os
from PIL import Image

def resize_assets():
    res_dir = r"c:\Users\rajki\Desktop\face_recoginition\frontend\android\app\src\main\res"
    icon_src = r"c:\Users\rajki\Desktop\face_recoginition\frontend\assets\icon.png"
    splash_src = r"c:\Users\rajki\Desktop\face_recoginition\frontend\assets\splash.png"

    if not os.path.exists(icon_src) or not os.path.exists(splash_src):
        print("Source assets not found in frontend/assets/!")
        return

    icon_img = Image.open(icon_src)
    splash_img = Image.open(splash_src)

    print(f"Resizing android assets under: {res_dir}")
    print(f"Source Icon size: {icon_img.size}")
    print(f"Source Splash size: {splash_img.size}")

    updated_count = 0

    for root, dirs, files in os.walk(res_dir):
        for file in files:
            file_lower = file.lower()
            dest_path = os.path.join(root, file)

            # Target app launcher icons
            if file_lower in ["ic_launcher.png", "ic_launcher_round.png", "ic_launcher_foreground.png"]:
                try:
                    with Image.open(dest_path) as current_dest:
                        target_size = current_dest.size
                    
                    # Resize and save icon
                    resized_icon = icon_img.resize(target_size, Image.Resampling.LANCZOS)
                    resized_icon.save(dest_path, "PNG")
                    print(f"Updated icon: {os.path.relpath(dest_path, res_dir)} to {target_size}")
                    updated_count += 1
                except Exception as e:
                    print(f"Failed to update icon {file}: {e}")

            # Target splash screens
            elif file_lower == "splash.png":
                try:
                    with Image.open(dest_path) as current_dest:
                        target_size = current_dest.size
                    
                    # Resize and save splash
                    resized_splash = splash_img.resize(target_size, Image.Resampling.LANCZOS)
                    resized_splash.save(dest_path, "PNG")
                    print(f"Updated splash: {os.path.relpath(dest_path, res_dir)} to {target_size}")
                    updated_count += 1
                except Exception as e:
                    print(f"Failed to update splash: {e}")

    print(f"Done! Successfully updated {updated_count} native Android assets.")

if __name__ == "__main__":
    resize_assets()
