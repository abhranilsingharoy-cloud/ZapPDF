import os
import re

html_files = ["index.html"] + [os.path.join("tools", f) for f in os.listdir("tools") if f.endswith(".html")]

count = 0
for filepath in html_files:
    if not os.path.exists(filepath): continue
    
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()
    
    # Bump v=3 to v=4 for CSS
    new_content = re.sub(r'\.css\?v=3', '.css?v=4', content)
    # Bump JS files if they had ?v=3
    new_content = re.sub(r'\.js\?v=3', '.js?v=4', new_content)
    
    # Wait, what if they don't have ?v=3? Let's just do a generic cache bust for navbar.css
    new_content = re.sub(r'navbar\.css(\?v=\d+)?', 'navbar.css?v=5', new_content)
    new_content = re.sub(r'theme\.css(\?v=\d+)?', 'theme.css?v=5', new_content)
    new_content = re.sub(r'style\.css(\?v=\d+)?', 'style.css?v=5', new_content)
    new_content = re.sub(r'main\.css(\?v=\d+)?', 'main.css?v=5', new_content)
    
    if new_content != content:
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(new_content)
        count += 1

print(f"Cache busted {count} files.")
