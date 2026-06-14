const fs = require('fs');
let content = fs.readFileSync('index.html', 'utf8');
content = content.replace('<title>ZapPDF - Fast & Private Browser-Based PDF Compression</title>', '<title>ZapPDF - Fast & Private Browser-Based PDF Tools Suite</title>');
content = content.replace('<meta name="description" content="Reduce your PDF file size in seconds right inside your browser. Private, fast, and completely free.">', '<meta name="description" content="Compress, convert, organize, redact, and edit your PDFs in seconds right inside your browser. Private, fast, and completely free.">');
content = content.replace('<p>Compress, Convert, Merge, Split, OCR, and Encrypt. The ultimate document ecosystem.</p>', '<p>Compress, Convert, Organize, Merge, Split, OCR, and Encrypt. The ultimate document ecosystem.</p>');
fs.writeFileSync('index.html', content);
