import os
from bs4 import BeautifulSoup

html_files = [f"tools/{x}" for x in [
    "ai-summarizer.html", "compare-pdf.html", "excel-to-pdf.html", 
    "html-to-pdf.html", "jpg-to-pdf.html", "pdf-forms.html", 
    "pdf-to-excel.html", "pdf-to-jpg.html", "pdf-to-pdfa.html", 
    "pdf-to-ppt.html", "pdf-to-word.html", "ppt-to-pdf.html", 
    "repair-pdf.html", "scan-to-pdf.html", "translate-pdf.html", 
    "word-to-pdf.html", "workflows.html"
]]

count = 0
for filepath in html_files:
    full_path = "c:/Users/Abhranil/OneDrive/ドキュメント/GitHub/ZapPDF/" + filepath
    if not os.path.exists(full_path): continue
    
    with open(full_path, "r", encoding="utf-8") as f:
        content = f.read()
    
    # Simple replace to try and catch the extra div
    new_content = content.replace(
        '<input type="file" id="folder-input" webkitdirectory directory multiple class="visually-hidden">\n                </div>\n</div>',
        '<input type="file" id="folder-input" webkitdirectory directory multiple class="visually-hidden">\n</div>'
    )
    new_content = new_content.replace(
        '<input type="file" id="folder-input" webkitdirectory directory multiple class="visually-hidden">\n            </div>\n</div>',
        '<input type="file" id="folder-input" webkitdirectory directory multiple class="visually-hidden">\n</div>'
    )

    if new_content != content:
        with open(full_path, "w", encoding="utf-8") as f:
            f.write(new_content)
        count += 1
        continue
        
    # If not fixed by simple replace, we could use BS4, but BS4 reformats everything.
    # Let's check where the mismatch is.
print(f"Fixed {count} files via regex/replace.")
