# Security Policy

## Supported Versions

Only the latest `main` branch is actively supported with security updates.

## Privacy First Architecture

ZapPDF is designed from the ground up to be a **100% Client-Side Application**. 
- No files are ever uploaded to a server.
- No file data is sent over the network.
- All processing (compression, conversion, manipulation) happens exclusively in the user's browser via WebAssembly and JavaScript.

## Reporting a Vulnerability

If you discover a security vulnerability within ZapPDF, please do not create a public issue. Instead, please email the maintainer directly or use GitHub's private vulnerability reporting feature.

We take all security issues seriously and will respond promptly to investigate and patch any vulnerabilities.

If the vulnerability relates to third-party dependencies (like `pdf-lib` or `Tesseract.js`), we will work to update our application to the latest patched versions of those libraries immediately.
