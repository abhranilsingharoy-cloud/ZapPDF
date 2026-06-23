import os
import glob
import re

files_to_check = glob.glob('tools/*.html') + ['index.html']

# The block starts at <!-- NEW: ZapPDF Studio -->
# And ends at the closing </div> of that tool-feature-row
pattern = r'<!-- NEW: ZapPDF Studio -->\s*<div class="tool-feature-row scroll-reveal".*?</div>\s*</div>\s*</div>'

for filepath in files_to_check:
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    if '<!-- NEW: ZapPDF Studio -->' in content:
        new_content = re.sub(pattern, '', content, flags=re.DOTALL)
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"Removed studio block from {filepath}")
