import sys
import re
import json
import os

def update_version(version_str=None):
    script_dir = os.path.dirname(os.path.abspath(__file__))
    package_path = os.path.join(script_dir, 'package.json')
    current_pkg_version = '1.0.0'
    if os.path.exists(package_path):
        try:
            with open(package_path, 'r', encoding='utf-8') as f:
                pkg = json.load(f)
            current_pkg_version = pkg.get('version', '1.0.0')
        except Exception as e:
            print(f"Error reading package.json: {e}")

    # Auto-bump patch version (e.g. 1.0.16 -> 1.0.17) if version_str is omitted, empty, or 'auto'
    if not version_str or version_str.strip() == '' or version_str.strip().lower() == 'auto':
        parts = current_pkg_version.lstrip('vV').split('.')
        if len(parts) == 3 and parts[2].isdigit():
            parts[2] = str(int(parts[2]) + 1)
            version_str = '.'.join(parts)
        else:
            version_str = current_pkg_version

    version_str = version_str.strip().lstrip('vV')
    print(f"Updating application version to: {version_str}")
    
    # 1. Update package.json
    if os.path.exists(package_path):
        try:
            with open(package_path, 'r', encoding='utf-8') as f:
                pkg = json.load(f)
            pkg['version'] = version_str
            with open(package_path, 'w', encoding='utf-8') as f:
                json.dump(pkg, f, indent=2)
            print("Successfully updated package.json version field.")
        except Exception as e:
            print(f"Error updating package.json: {e}")
    else:
        print("package.json not found in frontend directory.")

    # 2. Update android/app/build.gradle
    gradle_path = os.path.join(script_dir, 'android', 'app', 'build.gradle')
    if os.path.exists(gradle_path):
        try:
            with open(gradle_path, 'r', encoding='utf-8') as f:
                content = f.read()

            # Find versionName "1.0.2" -> versionName "{version_str}"
            old_version_name = re.search(r'versionName\s+"([^"]+)"', content)
            if old_version_name:
                print(f"Found old versionName: {old_version_name.group(1)}")
            content = re.sub(r'versionName\s+"[^"]+"', f'versionName "{version_str}"', content)

            # Find versionCode and increment it by 1
            version_code_match = re.search(r'versionCode\s+(\d+)', content)
            if version_code_match:
                old_code = int(version_code_match.group(1))
                new_code = old_code + 1
                content = re.sub(r'versionCode\s+\d+', f'versionCode {new_code}', content)
                print(f"Incremented versionCode from {old_code} to {new_code}.")
            else:
                print("versionCode not found in build.gradle.")

            with open(gradle_path, 'w', encoding='utf-8') as f:
                f.write(content)
            print("Successfully updated android/app/build.gradle version info.")
        except Exception as e:
            print(f"Error updating build.gradle: {e}")
    else:
        print(f"build.gradle not found at {gradle_path}.")

    return version_str

if __name__ == '__main__':
    arg = sys.argv[1] if len(sys.argv) > 1 else None
    update_version(arg)

