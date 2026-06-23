with open('seo_generator.py', 'r', encoding='utf-8') as f:
    c = f.read()

c = c.replace(
    r"content = re.sub(r'<div class=\"faq-container scroll-reveal\".*?>.*?</div>\s*</div>\s*</section>', f'<div class=\"faq-container scroll-reveal\" style=\"max-width: 800px; margin: 0 auto;\">{faq_html}\n            </div>\n        </div>\n    </section>', content, flags=re.DOTALL)",
    r"content = re.sub(r'<div class=\"faq-container scroll-reveal\".*?</section>', f'<div class=\"faq-container scroll-reveal\" style=\"max-width: 800px; margin: 0 auto;\">{faq_html}\n            </div>\n        </div>\n    </section>', content, flags=re.DOTALL)"
)

with open('seo_generator.py', 'w', encoding='utf-8') as f:
    f.write(c)
