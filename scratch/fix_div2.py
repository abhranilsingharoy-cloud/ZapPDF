import os
import re

html_files = ["index.html"] + [f"tools/{x}" for x in os.listdir("tools") if x.endswith(".html")]

count = 0
for filepath in html_files:
    full_path = "c:/Users/Abhranil/OneDrive/ドキュメント/GitHub/ZapPDF/" + filepath
    if not os.path.exists(full_path): continue
    
    with open(full_path, "r", encoding="utf-8") as f:
        content = f.read()
    
    new_content = content.replace(
        "            </div>\n            </div>\n            <div class=\"tool-feature-row scroll-reveal\"",
        "            </div>\n            <div class=\"tool-feature-row scroll-reveal\""
    )
    
    # Let's also check for the extra </div> after visually-hidden in tool files
    new_content = new_content.replace(
        '<input type="file" id="folder-input" webkitdirectory directory multiple class="visually-hidden">\n</div>\n</div>\n\n            <div id="upload-compact" class="upload-compact hidden">',
        '<input type="file" id="folder-input" webkitdirectory directory multiple class="visually-hidden">\n</div>\n\n            <div id="upload-compact" class="upload-compact hidden">'
    )
    new_content = new_content.replace(
        '<input type="file" id="folder-input" webkitdirectory directory multiple class="visually-hidden">\n                </div>\n</div>\n\n            <div id="upload-compact" class="upload-compact hidden">',
        '<input type="file" id="folder-input" webkitdirectory directory multiple class="visually-hidden">\n</div>\n\n            <div id="upload-compact" class="upload-compact hidden">'
    )

    # Actually, the problem in tool files is an extra </div> near the upload-compact or upload-zone.
    # Let's just fix the mismatched div programmatically using bs4.
    
    if new_content != content:
        with open(full_path, "w", encoding="utf-8") as f:
            f.write(new_content)
        count += 1

print(f"Fixed {count} files")
