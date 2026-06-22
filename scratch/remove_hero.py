import os
import re

html_files = [f"tools/{x}" for x in os.listdir("tools") if x.endswith(".html")]

count = 0
for filepath in html_files:
    full_path = "c:/Users/Abhranil/OneDrive/ドキュメント/GitHub/ZapPDF/" + filepath
    if not os.path.exists(full_path): continue
    
    with open(full_path, "r", encoding="utf-8") as f:
        content = f.read()
    
    # Remove the hero section from the tool pages
    new_content, num_subs = re.subn(r'<!-- Hero -->\s*<section id="hero" class="hero">.*?</section>\s*<!-- Main Tool -->', '<!-- Main Tool -->', content, flags=re.DOTALL)
    
    if num_subs > 0:
        with open(full_path, "w", encoding="utf-8") as f:
            f.write(new_content)
        count += 1

print(f"Removed hero section from {count} tool pages.")
