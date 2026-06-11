# ZapPDF ⚡

> Fast. Private. Free. Client-side PDF compression right in your browser.

![ZapPDF Screenshot placeholder](https://via.placeholder.com/800x450/0F0F0F/F5C518?text=ZapPDF+Screenshot)

## Overview

ZapPDF is a modern, privacy-first web application designed to reduce PDF file sizes securely. Unlike traditional PDF compressors that require you to upload sensitive documents to a third-party server, ZapPDF performs all compression completely locally in your browser using modern WebAssembly and JavaScript APIs. 

## Features

- **⚡ Lightning Fast:** No upload/download delays. Compression starts instantly.
- **🔒 Fully Private:** Your files never leave your device.
- **🎯 Target File Size:** Set an exact target size and let the app find the best quality setting.
- **📦 Batch Processing:** Compress up to 5 PDFs simultaneously and download as a ZIP.
- **⚙️ Advanced Controls:** Fine-tune DPI, quality, metadata, and subset fonts for total control.
- **🌍 Works Everywhere:** Any modern browser, any OS. No installation required.

## Tech Stack

ZapPDF is built with a focus on simplicity, performance, and zero backend dependencies:

- **Frontend:** Vanilla HTML5, CSS3, and JavaScript (ES6+). No heavy frameworks.
- **PDF Processing:** [pdf-lib](https://pdf-lib.js.org/) for robust PDF manipulation.
- **Image/PDF Parsing:** [PDF.js](https://mozilla.github.io/pdf.js/) for rendering.
- **Zipping:** [JSZip](https://stuk.github.io/jszip/) for batch downloading.
- **File Saving:** [FileSaver.js](https://github.com/eligrey/FileSaver.js/) for client-side blob saving.

## Getting Started (Local Development)

Because ZapPDF is entirely static, running it locally is incredibly simple.

1. Clone or download the repository.
2. Open the project folder.
3. Serve the directory using any local web server (e.g., using VS Code Live Server, or Python's `http.server`):
   ```bash
   npx serve .
   # or
   python -m http.server 8000
   ```
4. Navigate to `http://localhost:8000` in your browser.
*(Note: Some features like Web Workers may require the files to be served via HTTP rather than just opening `index.html` directly from the filesystem, due to browser security restrictions).*

## Project Structure

```
zappdf/
├── index.html          # Main compression tool
├── about.html          # About & Mission page
├── faq.html            # Frequently Asked Questions
├── privacy.html        # Privacy Policy
├── assets/
│   ├── css/            # Modular CSS files (Main, Hero, Tool, Responsive, etc.)
│   ├── js/             # Modular JS files (UI, Upload, Compress, Worker, Main)
│   └── icons/          # SVG UI icons
└── README.md
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request. For major changes, please open an issue first to discuss what you would like to change.

## License

This project is licensed under the MIT License.
