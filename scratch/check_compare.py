import os
from html.parser import HTMLParser

class MyHTMLParser(HTMLParser):
    def __init__(self, filepath):
        super().__init__()
        self.tags = []
        self.filepath = filepath
        
    def handle_starttag(self, tag, attrs):
        if tag not in ['img', 'br', 'hr', 'input', 'link', 'meta', 'source', 'path', 'circle', 'rect', 'polyline', 'defs', 'stop', 'feDropShadow', 'filter', 'linearGradient']:
            self.tags.append((tag, self.getpos()))
            
    def handle_endtag(self, tag):
        if tag not in ['img', 'br', 'hr', 'input', 'link', 'meta', 'source', 'path', 'circle', 'rect', 'polyline', 'defs', 'stop', 'feDropShadow', 'filter', 'linearGradient']:
            if self.tags and self.tags[-1][0] == tag:
                self.tags.pop()
            else:
                print(f"Mismatched tag in {self.filepath} at line {self.getpos()[0]}: expected {self.tags[-1][0] if self.tags else 'None'} (opened at {self.tags[-1][1] if self.tags else 'None'}), got {tag}")
                
                # Pop out exactly that tag if it exists in stack
                for i in range(len(self.tags)-1, -1, -1):
                    if self.tags[i][0] == tag:
                        self.tags = self.tags[:i]
                        break

html_files = ["tools/compare-pdf.html"]

for filepath in html_files:
    full_path = "c:/Users/Abhranil/OneDrive/ドキュメント/GitHub/ZapPDF/" + filepath
    if not os.path.exists(full_path): continue
    
    parser = MyHTMLParser(filepath)
    with open(full_path, "r", encoding="utf-8") as f:
        parser.feed(f.read())
