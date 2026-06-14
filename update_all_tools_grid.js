const fs = require('fs');
const path = require('path');

const newGrid = `<div class="features-grid scroll-reveal">
                <!-- Compress -->
                <a href="index.html#tool" class="feature-card" style="text-decoration: none; color: inherit;">
                    <div class="feature-icon-wrapper">⚡</div>
                    <h3>Compress Files</h3>
                    <p>Reduce PDF and Image sizes perfectly with advanced WebAssembly.</p>
                </a>
                <!-- Convert -->
                <a href="convert.html" class="feature-card" style="text-decoration: none; color: inherit;">
                    <div class="feature-icon-wrapper">🔄</div>
                    <h3>Format Converter</h3>
                    <p>Convert PDFs to Images, or convert RAW/PSD to JPG seamlessly.</p>
                </a>
                <!-- Merge -->
                <a href="merge.html" class="feature-card" style="text-decoration: none; color: inherit;">
                    <div class="feature-icon-wrapper">🔗</div>
                    <h3>Merge PDFs</h3>
                    <p>Combine multiple PDFs into a single document in seconds.</p>
                </a>
                <!-- Split -->
                <a href="split.html" class="feature-card" style="text-decoration: none; color: inherit;">
                    <div class="feature-icon-wrapper">✂️</div>
                    <h3>Split PDF</h3>
                    <p>Extract specific pages or split a PDF into individual files.</p>
                </a>
                <!-- Organize -->
                <a href="organize.html" class="feature-card" style="text-decoration: none; color: inherit;">
                    <div class="feature-icon-wrapper">🔀</div>
                    <h3>Organize PDF</h3>
                    <p>Rearrange or delete pages with a visual drag-and-drop interface.</p>
                </a>
                <!-- Redact -->
                <a href="redact.html" class="feature-card" style="text-decoration: none; color: inherit;">
                    <div class="feature-icon-wrapper">⬛</div>
                    <h3>Redact PDF</h3>
                    <p>Permanently remove sensitive information by flattening pages.</p>
                </a>
                <!-- Page Numbers -->
                <a href="number.html" class="feature-card" style="text-decoration: none; color: inherit;">
                    <div class="feature-icon-wrapper">🔢</div>
                    <h3>Page Numbers</h3>
                    <p>Automatically stamp page numbers across your entire document.</p>
                </a>
                <!-- Rotate -->
                <a href="rotate.html" class="feature-card" style="text-decoration: none; color: inherit;">
                    <div class="feature-icon-wrapper">🔄</div>
                    <h3>Rotate PDF</h3>
                    <p>Fix upside-down pages by rotating individual thumbnails.</p>
                </a>
                <!-- OCR -->
                <a href="ocr.html" class="feature-card" style="text-decoration: none; color: inherit;">
                    <div class="feature-icon-wrapper">👁️</div>
                    <h3>OCR Text Extraction</h3>
                    <p>Extract text from scanned PDFs or images instantly.</p>
                </a>
                <!-- Protect -->
                <a href="protect.html" class="feature-card" style="text-decoration: none; color: inherit;">
                    <div class="feature-icon-wrapper">🔒</div>
                    <h3>Protect & Unlock</h3>
                    <p>Add passwords to your PDFs or remove existing protection.</p>
                </a>
            </div>`;

const dir = __dirname;
const files = fs.readdirSync(dir).filter(f => f.endsWith('.html'));

let updatedCount = 0;

files.forEach(file => {
    const filePath = path.join(dir, file);
    let content = fs.readFileSync(filePath, 'utf8');
    
    const regex = /<div class="features-grid scroll-reveal">[\s\S]*?<!-- Protect -->[\s\S]*?<\/div>/;
    if (regex.test(content) && content.includes('The Ultimate ZapPDF Suite')) {
        content = content.replace(regex, newGrid);
        fs.writeFileSync(filePath, content);
        updatedCount++;
        console.log(`Updated grid in ${file}`);
    }
});

console.log(`Updated ${updatedCount} files.`);
