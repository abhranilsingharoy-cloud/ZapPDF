import os
import re

html_files = ["index.html"] + [f"tools/{x}" for x in os.listdir("tools") if x.endswith(".html")]

count = 0
for filepath in html_files:
    full_path = "c:/Users/Abhranil/OneDrive/ドキュメント/GitHub/ZapPDF/" + filepath
    if not os.path.exists(full_path): continue
    
    with open(full_path, "r", encoding="utf-8") as f:
        content = f.read()
    
    # We will replace .css" with .css?v=3" (or .css?v=2" with ?v=3")
    # This regex looks for .css followed optionally by ?v=number and replaces it with ?v=3
    new_content = re.sub(r'\.css(\?v=\d+)?\"', '.css?v=3"', content)
    
    if new_content != content:
        with open(full_path, "w", encoding="utf-8") as f:
            f.write(new_content)
        count += 1

print(f"Updated cache buster to ?v=3 in {count} files.")
