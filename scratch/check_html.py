import os
from html.parser import HTMLParser

class MyHTMLParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.tags = []
        
    def handle_starttag(self, tag, attrs):
        if tag not in ['img', 'br', 'hr', 'input', 'link', 'meta', 'source', 'path', 'circle', 'rect', 'polyline', 'defs', 'stop', 'feDropShadow', 'filter']:
            self.tags.append(tag)
            
    def handle_endtag(self, tag):
        if tag not in ['img', 'br', 'hr', 'input', 'link', 'meta', 'source', 'path', 'circle', 'rect', 'polyline', 'defs', 'stop', 'feDropShadow', 'filter']:
            if self.tags and self.tags[-1] == tag:
                self.tags.pop()
            else:
                print(f"Mismatched tag: expected {self.tags[-1] if self.tags else 'None'}, got {tag}")

parser = MyHTMLParser()
with open("c:/Users/Abhranil/OneDrive/ドキュメント/GitHub/ZapPDF/index.html", "r", encoding="utf-8") as f:
    parser.feed(f.read())

if parser.tags:
    print("Unclosed tags:", parser.tags)
else:
    print("All tags matched perfectly!")
