import re

filepath = "assets/css/navbar.css"
with open(filepath, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Navbar background to white
content = re.sub(
    r'background:\s*rgba\(15,\s*15,\s*15,\s*0\.85\);',
    'background: rgba(255, 255, 255, 0.98);',
    content
)

# 2. Border bottom to a light gray
content = re.sub(
    r'border-bottom:\s*1px solid var\(--color-border\);',
    'border-bottom: 1px solid #eaeaea;',
    content
)

# 3. Logo color to black
content = re.sub(
    r'color:\s*var\(--color-text\);(\s*text-transform:\s*uppercase;)',
    r'color: #111111;\1',
    content
)

# 4. Nav links color to black (insert if missing)
if 'color: #111111;' not in content.split('.nav-links a {')[1].split('}')[0]:
    content = re.sub(
        r'(\.nav-links\s+a\s*\{[^\}]*)',
        r'\1\n  color: #111111;',
        content,
        count=1
    )

# 5. Dropdown menu background to white and text to black
content = re.sub(
    r'background:\s*var\(--color-surface\);',
    'background: #ffffff;',
    content
)
content = re.sub(
    r'border:\s*1px solid var\(--color-border\);',
    'border: 1px solid #eaeaea;',
    content
)

# Force dropdown links to be black
content = re.sub(
    r'(\.mega-link\s*\{\s*[\s\S]*?color:\s*)#[0-9a-fA-F]+(.*?!important;)',
    r'\1#111111\2',
    content
)

with open(filepath, "w", encoding="utf-8") as f:
    f.write(content)

print("navbar.css updated to strictly white theme.")
