import re
import os
import glob

def search_xt():
    assets_dir = r"c:\Users\rajki\Desktop\face_recoginition\frontend\dist\assets"
    js_files = glob.glob(os.path.join(assets_dir, "index-*.js"))
    if not js_files:
        print("No index-*.js files found!")
        return
    
    # Sort by modification time to get the newest file
    js_files.sort(key=os.path.getmtime, reverse=True)
    bundle_path = js_files[0]
    print(f"Analyzing newest bundle: {os.path.basename(bundle_path)}")

    with open(bundle_path, 'r', encoding='utf-8') as f:
        content = f.read()

    print("Bundle length:", len(content))

    # Look for "const Xt" or "let Xt" or "var Xt" or "function Xt" or "Xt ="
    matches = []
    
    # Let's search for references to Xt in context
    # Find all occurrences of Xt with 60 chars before and after
    for m in re.finditer(r'\bXt\b', content):
        start = max(0, m.start() - 60)
        end = min(len(content), m.end() + 60)
        matches.append(content[start:end])

    print(f"Found {len(matches)} occurrences of Xt:")
    for idx, match in enumerate(matches[:20]):
        print(f"{idx+1}: ... {match} ...")

if __name__ == "__main__":
    search_xt()
