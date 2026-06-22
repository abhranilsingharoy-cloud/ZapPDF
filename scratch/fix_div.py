import os
import re

html_files = ["index.html"] + [f"tools/{x}" for x in os.listdir("tools") if x.endswith(".html")]

count = 0
for filepath in html_files:
    full_path = "c:/Users/Abhranil/OneDrive/ドキュメント/GitHub/ZapPDF/" + filepath
    if not os.path.exists(full_path): continue
    
    with open(full_path, "r", encoding="utf-8") as f:
        content = f.read()
    
    # The extra </div> is right after the folder-input tag and right before the upload-zone's end_tag (which is another </div>).
    # Let's search for this specific pattern and remove the extra </div>
    pattern = r'(<input type="file" id="folder-input" webkitdirectory directory multiple class="visually-hidden">\s*)</div>(\s*</div>)'
    
    new_content, num_subs = re.subn(pattern, r'\1\2', content)
    
    if num_subs > 0:
        with open(full_path, "w", encoding="utf-8") as f:
            f.write(new_content)
        count += 1

print(f"Fixed extra </div> in {count} files.")
