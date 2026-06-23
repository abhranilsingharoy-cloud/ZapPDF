import os
import re

tools_dir = "tools"
generic_tools = [
    "ai-summarizer.html", "compare-pdf.html", "excel-to-pdf.html", "html-to-pdf.html",
    "jpg-to-pdf.html", "pdf-forms.html", "pdf-to-excel.html", "pdf-to-jpg.html",
    "pdf-to-pdfa.html", "pdf-to-ppt.html", "pdf-to-word.html", "ppt-to-pdf.html",
    "repair-pdf.html", "scan-to-pdf.html", "translate-pdf.html", "word-to-pdf.html",
    "workflows.html"
]

count = 0
for filename in generic_tools:
    filepath = os.path.join(tools_dir, filename)
    if not os.path.exists(filepath): continue
    
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()
    
    tool_type = filename.replace('.html', '')
    
    # Replace <script src="../assets/js/tools/convert.js"></script> 
    # with <script src="../assets/js/tools/universal_fallback.js"></script>
    new_content = re.sub(
        r'<script src="\.\./assets/js/tools/convert\.js"></script>',
        r'<script src="../assets/js/tools/universal_fallback.js"></script>',
        content
    )
    
    # Replace ZapConvert.init(); with ZapUniversal.init('tool_type');
    new_content = re.sub(
        r'ZapConvert\.init\(\);',
        f"ZapUniversal.init('{tool_type}');",
        new_content
    )
    
    if new_content != content:
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(new_content)
        count += 1

print(f"Applied universal fallback to {count} generic tools.")
