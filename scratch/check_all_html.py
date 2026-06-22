import os
from html.parser import HTMLParser

class MyHTMLParser(HTMLParser):
    def __init__(self, filepath):
        super().__init__()
        self.tags = []
        self.filepath = filepath
        self.mismatched = False
        
    def handle_starttag(self, tag, attrs):
        if tag not in ['img', 'br', 'hr', 'input', 'link', 'meta', 'source', 'path', 'circle', 'rect', 'polyline', 'defs', 'stop', 'feDropShadow', 'filter', 'linearGradient']:
            self.tags.append(tag)
            
    def handle_endtag(self, tag):
        if tag not in ['img', 'br', 'hr', 'input', 'link', 'meta', 'source', 'path', 'circle', 'rect', 'polyline', 'defs', 'stop', 'feDropShadow', 'filter', 'linearGradient']:
            if self.tags and self.tags[-1] == tag:
                self.tags.pop()
            else:
                print(f"Mismatched tag in {self.filepath}: expected {self.tags[-1] if self.tags else 'None'}, got {tag}")
                self.mismatched = True

html_files = ["index.html"] + [f"tools/{x}" for x in os.listdir("tools") if x.endswith(".html")]

for filepath in html_files:
    full_path = "c:/Users/Abhranil/OneDrive/ドキュメント/GitHub/ZapPDF/" + filepath
    if not os.path.exists(full_path): continue
    
    parser = MyHTMLParser(filepath)
    with open(full_path, "r", encoding="utf-8") as f:
        parser.feed(f.read())
        
    if parser.tags and not parser.mismatched:
        print(f"Unclosed tags in {filepath}:", parser.tags)
