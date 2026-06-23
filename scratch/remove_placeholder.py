import os
import re

tools_dir = "tools"
html_files = [f for f in os.listdir(tools_dir) if f.endswith(".html")]

count = 0
for filename in html_files:
    filepath = os.path.join(tools_dir, filename)
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()
    
    # Use regex to find and remove the entire placeholder control-panel block
    # It starts with <div class="control-panel" ... > and contains 🚧
    # We can match <div class="control-panel"[^>]*>.*?🚧.*?</div>
    
    new_content = re.sub(
        r'<div\s+class="control-panel"[^>]*>[\s\S]*?🚧[\s\S]*?Premium Feature In Development[\s\S]*?</div>',
        '',
        content
    )
    
    # Wait, the inner div has a closing tag, and the h3 has a closing tag. 
    # Let's just match <div class="control-panel" ...> down to the matching </div>?
    # Because there are multiple </div> tags. The block has 1 inner div, 1 h3, 1 p.
    # So the block ends after the </p> closing tag and a </div>.
    
    new_content = re.sub(
        r'<div\s+class="control-panel"\s+style="text-align: center; padding: 40px; margin-top: 20px; border: 1px dashed var\(--color-primary\); background: rgba\(66, 133, 244, 0\.05\); border-radius: var\(--radius-lg\);">\s*<div style="font-size: 48px; margin-bottom: 16px;">🚧</div>\s*<h3 style="color: var\(--color-text\); margin-bottom: 16px;">Premium Feature In Development</h3>\s*<p[^>]*>.*?</p>\s*</div>',
        '',
        content,
        flags=re.DOTALL
    )
    
    if new_content != content:
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(new_content)
        count += 1

print(f"Removed placeholder from {count} files.")
