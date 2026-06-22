import os
import re

html_files = ["index.html"] + [f"tools/{x}" for x in os.listdir("tools") if x.endswith(".html")]

count = 0
for filepath in html_files:
    full_path = "c:/Users/Abhranil/OneDrive/ドキュメント/GitHub/ZapPDF/" + filepath
    if not os.path.exists(full_path): continue
    
    with open(full_path, "r", encoding="utf-8") as f:
        content = f.read()
    
    # Replace the "I <heart> PDF" with "ZAP <lightning> PDF"
    new_content = re.sub(
        r'I\s*<svg[^>]*>.*?<path d="M12 21\.35l-1\.45-1\.32.*?<\/svg>\s*PDF',
        r'ZAP <svg style="color: #F5C518; width: 24px; height: 24px; margin: 0 2px;" viewBox="0 0 24 24" fill="currentColor"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg> PDF',
        content,
        flags=re.DOTALL
    )
    
    # Just in case, try a more generic replace if the specific one fails
    if new_content == content:
        new_content = re.sub(
            r'I\s*<svg[^>]*>.*?<\/svg>\s*PDF',
            r'ZAP <svg style="color: #F5C518; width: 24px; height: 24px; margin: 0 2px;" viewBox="0 0 24 24" fill="currentColor"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg> PDF',
            content,
            flags=re.DOTALL
        )
    
    if new_content != content:
        with open(full_path, "w", encoding="utf-8") as f:
            f.write(new_content)
        count += 1

print(f"Updated logo in {count} files.")
