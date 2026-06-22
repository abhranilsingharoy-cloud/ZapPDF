import os
import glob

html_files = ["index.html"] + [f"tools/{x}" for x in os.listdir("tools") if x.endswith(".html")]

count = 0
for filepath in html_files:
    full_path = "c:/Users/Abhranil/OneDrive/ドキュメント/GitHub/ZapPDF/" + filepath
    if not os.path.exists(full_path): continue
    
    with open(full_path, "r", encoding="utf-8") as f:
        content = f.read()
    
    # Replace navbar.css with navbar.css?v=2
    if 'href="assets/css/navbar.css"' in content:
        new_content = content.replace('href="assets/css/navbar.css"', 'href="assets/css/navbar.css?v=2"')
    elif 'href="../assets/css/navbar.css"' in content:
        new_content = content.replace('href="../assets/css/navbar.css"', 'href="../assets/css/navbar.css?v=2"')
    else:
        new_content = content
        
    if new_content != content:
        with open(full_path, "w", encoding="utf-8") as f:
            f.write(new_content)
        count += 1

print(f"Updated cache buster in {count} files.")
