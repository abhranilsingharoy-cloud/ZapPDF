import re
with open('tools/ai-summarizer.html', encoding='utf-8') as f:
    content = f.read()
m = re.search(r'<meta name="description".*?>', content)
print("Description tag:", m.group(0) if m else "NOT FOUND")
