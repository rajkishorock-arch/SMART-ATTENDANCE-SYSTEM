import sys
import re
import json
import os

def update_version(version_str):
    print(f"Updating application version to: {version_str}")
    
    # 1. Update package.json
    package_path = 'package.json'
    if os.path.exists(package_path):
        try:
            with open(package_path, 'r') as f:
                pkg = json.load(f)
            pkg['version'] = version_str
            with open(package_path, 'w') as f:
                json.dump(pkg, f, indent=2)
            print("Successfully updated package.json version field.")
        except Exception as e:
            print(f"Error updating package.json: {e}")
    else:
        print("package.json not found in current directory.")

    # 2. Update android/app/build.gradle
    gradle_path = 'android/app/build.gradle'
    if os.path.exists(gradle_path):
        try:
            with open(gradle_path, 'r') as f:
                content = f.read()

            # Find versionName "1.0.2" -> versionName "{version_str}"
            old_version_name = re.search(r'versionName\s+"([^"]+)"', content)
            if old_version_name:
                print(f"Found old versionName: {old_version_name.group(1)}")
            content = re.sub(r'versionName\s+"[^"]+"', f'versionName "{version_str}"', content)

            # Find versionCode 3 and increment it by 1
            version_code_match = re.search(r'versionCode\s+(\d+)', content)
            if version_code_match:
                old_code = int(version_code_match.group(1))
                new_code = old_code + 1
                content = re.sub(r'versionCode\s+\d+', f'versionCode {new_code}', content)
                print(f"Incremented versionCode from {old_code} to {new_code}.")
            else:
                print("versionCode not found in build.gradle.")

            with open(gradle_path, 'w') as f:
                f.write(content)
            print("Successfully updated android/app/build.gradle version info.")
        except Exception as e:
            print(f"Error updating build.gradle: {e}")
    else:
        print(f"build.gradle not found at {gradle_path}.")

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Usage: python update_version.py <version_string>")
        sys.exit(1)
    update_version(sys.argv[1])
