<div align="center">

<!-- Header Banner -->
<img width="100%" src="https://capsule-render.vercel.app/api?type=waving&color=gradient&customColorList=FF4B2B,FF416C&height=200&section=header&text=ZapPDF&fontSize=70&fontColor=fff&fontAlignY=35&desc=The%20Production-Grade%20100%25%20Private%20Client-Side%20PDF%20Suite&descAlignY=60&descColor=E0E0E0&animation=fadeIn" alt="ZapPDF Header" />

<br/>

<!-- Badges -->
<p>
  <img src="https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white" alt="HTML5" />
  <img src="https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white" alt="CSS3" />
  <img src="https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black" alt="JavaScript" />
  <img src="https://img.shields.io/badge/WebAssembly-654FF0?style=for-the-badge&logo=webassembly&logoColor=white" alt="WebAssembly" />
</p>

<p>
  <img src="https://img.shields.io/badge/License-MIT-brightgreen?style=flat-square" alt="License" />
  <img src="https://img.shields.io/badge/Processing-100%25%20Local-blue?style=flat-square" alt="Local Processing" />
  <img src="https://img.shields.io/badge/Privacy-First-orange?style=flat-square" alt="Privacy First" />
  <img src="https://img.shields.io/badge/Tools-32%2B%20Functional-success?style=flat-square" alt="32+ Functional Tools" />
</p>

<br/>

> *"All the power and usability of iLovePDF, with zero document uploads and complete client-side data privacy."*

<br/>

<p>
  <a href="#-about-zappdf">About</a> &nbsp;·&nbsp;
  <a href="#-tool-directory--capabilities">Tool Directory</a> &nbsp;·&nbsp;
  <a href="#-technology-stack">Tech Stack</a> &nbsp;·&nbsp;
  <a href="#-honest-browser-limitations">Limitations</a> &nbsp;·&nbsp;
  <a href="#-installation--local-dev">Getting Started</a> &nbsp;·&nbsp;
  <a href="#-security--privacy-architecture">Security & Privacy</a>
</p>

</div>

---

## ✦ About ZapPDF

**ZapPDF** is an open-source, production-ready, client-side PDF utility platform inspired by the usability, tool organization, and workflow quality of major commercial PDF suites (like iLovePDF).

**Core Philosophy:** Every advertised feature performs its actual intended operation in real time. There are no dummy buttons, simulated progress bars, placeholder downloads, or cosmetic-only mockups. Everything runs inside the browser tab using WebAssembly, modern web standards, and trusted client-side processing libraries.

---

## ✦ Tool Directory & Capabilities

| Tool | Category | Implementation Strategy | Status |
| :--- | :--- | :--- | :--- |
| **Compress PDF** | Optimize | ImageMagick WASM + Web Workers memory compression | ✅ 100% Client-side |
| **Merge PDF** | Organize | `pdf-lib` document assembly + `SortableJS` drag-and-drop file reordering | ✅ 100% Client-side |
| **Split PDF** | Organize | `pdf-lib` page extraction into individual or grouped PDFs | ✅ 100% Client-side |
| **Organize PDF** | Organize | `pdf.js` thumbnail rendering, `SortableJS` grid reorder, individual page rotation (↻), page deletion | ✅ 100% Client-side |
| **Remove Pages** | Organize | Visual thumbnail grid selector + `pdf-lib` exclusion copy | ✅ 100% Client-side |
| **Extract Pages** | Organize | Range & custom comma-separated page extraction into clean PDF | ✅ 100% Client-side |
| **Rotate PDF** | Organize | Interactive document or individual 90°/180°/270° angle adjustment | ✅ 100% Client-side |
| **Repair PDF** | Optimize | 2-stage recovery: `pdf-lib` header/xref re-indexing with `pdf.js` fault-tolerant stream salvage | ✅ 100% Client-side |
| **OCR PDF** | Optimize | Multi-page OCR extraction via `Tesseract.js` + `pdf.js` rendering | ✅ 100% Client-side |
| **PDF to Word** | Convert | `pdf.js` text extraction & line heuristic + `docx.js` genuine `.docx` generation | ✅ 100% Client-side |
| **Word to PDF** | Convert | `mammoth.js` DOCX-to-HTML parser + Browser print-to-PDF engine | ✅ 100% Client-side |
| **JPG to PDF** | Convert | Multi-image embedder with custom page geometry (Fit, A4, Letter, Auto orientation, Margins) | ✅ 100% Client-side |
| **PDF to JPG** | Convert | High-res 300 DPI rendering to canvas + multi-page `JSZip` packaging | ✅ 100% Client-side |
| **HTML to PDF** | Convert | Dual input mode (Raw HTML / Web URL) with instant preview and print styling | ✅ 100% Client-side |
| **Scan to PDF** | Organize | Live device camera integration (`getUserMedia`) with frame capture and PDF packaging | ✅ 100% Client-side |
| **Compare PDF** | Intelligence | Dual text-stream extractor with longest common subsequence diff visualizer | ✅ 100% Client-side |
| **PDF to Markdown** | Convert | Structure-aware text item analysis, heading classification, and list conversion | ✅ 100% Client-side |
| **Redact PDF** | Security | **Pixel-level destruction**: Canvas redaction boxes permanently re-rasterized into fresh PDF | ✅ 100% Client-side |
| **Protect PDF** | Security | Real AES-128 encryption with user & owner password locking | ✅ 100% Client-side |
| **Unlock PDF** | Security | Decryption and security permission removal via `pdf-lib` | ✅ 100% Client-side |
| **Watermark PDF** | Edit | Rotated text stamp overlay with custom opacity, position, and font size | ✅ 100% Client-side |
| **Page Numbers** | Edit | Bottom-center, bottom-right, and top-right pagination numbering | ✅ 100% Client-side |
| **Sign PDF** | Security | Smooth canvas signature drawing pad embedded directly into PDF | ✅ 100% Client-side |
| **Crop PDF** | Edit | Interactive visual bounding-box crop adjustment with coordinate recalculation | ✅ 100% Client-side |
| **Edit PDF** | Edit | Freehand drawing, text overlay stamps, and image placement | ✅ 100% Client-side |
| **PDF Forms** | Edit | Interactive AcroForm inspector: reads, renders, fills, and flattens fields | ✅ 100% Client-side |
| **Workflows** | Suite | Chained automated pipelines: Merge → Rotate → Page Numbers → Watermark → Password Protect | ✅ 100% Client-side |
| **AI Summarizer** | Intelligence | Multi-page text extraction + Gemini API structured executive summary | ⚠️ API Connection (HTTPS) |
| **Translate PDF** | Intelligence | Multi-language translation across 25+ languages via Gemini proxy | ⚠️ API Connection (HTTPS) |

---

## ✦ Technology Stack

- **Core Framework**: Vanilla HTML5, Modern CSS3 with Custom Properties (Dark/Light cinematic themes), Vanilla ES6+ JavaScript.
- **PDF Manipulation & Generation**: [`pdf-lib`](https://pdf-lib.js.org/) (Page copying, document encryption, form filling, vector embedding).
- **PDF Rendering & Text Extraction**: [`pdf.js`](https://mozilla.github.io/pdf.js/) (Worker-based multi-threaded page rendering).
- **OCR Engine**: [`Tesseract.js`](https://tesseract.projectnaptha.com/) (WebAssembly OCR with multi-language models).
- **Office Document Processing**: [`mammoth.js`](https://github.com/mwilliamson/mammoth.js) (DOCX HTML translation) & [`docx.js`](https://docx.js.org/) (DOCX builder).
- **Image & WASM Processing**: `@magickwasm/magick-wasm`, `browser-image-compression`.
- **Drag-and-Drop & Interactions**: [`SortableJS`](https://sortablejs.github.io/Sortable/) (Touch-friendly reordering).
- **Packaging & Archives**: [`JSZip`](https://stuk.github.io/jszip/) (Client-side ZIP creation for batch outputs).
- **AI Intelligence Backend**: Google Gemini API via Vercel Serverless Function (`api/chat.js`).

---

## ✦ Honest Browser Limitations

In accordance with our core engineering principles, ZapPDF explicitly discloses operations that cannot be reliably performed purely within browser memory without a native server-side engine (such as LibreOffice or Ghostscript CLI):

1. **PDF to PowerPoint (PPT) & PDF to Excel (XLS)**: Full reverse-engineering of arbitrary vector tables, shapes, and layouts into Microsoft Office presentation and spreadsheet binaries requires proprietary desktop libraries.
2. **PowerPoint/Excel to PDF**: Accurately compiling complex `.pptx` or `.xlsx` files with charts and macros requires LibreOffice in headless server mode.
3. **PDF/A Archival Validation**: Genuine PDF/A compliance requires embedded ICC color profile verification, font glyph embedding checks, and ISO 19005-1 XMP metadata stamping.

*Pages corresponding to these tools display clear informational limitation notices.*

---

## ✦ Security & Privacy Architecture

- **100% In-Memory Processing**: For all core utilities (Merge, Split, Compress, Redact, Sign, Protect, Unlock, Convert), documents are read directly from `File` objects into browser memory (ArrayBuffers and Blobs). No file is ever transmitted over the network or saved to a server disk.
- **True Pixel-Level Redaction**: Unlike cosmetic PDF editors that merely place a black rectangle element over the text layer (which leaves the underlying text extractable via copy-paste), ZapPDF re-rasterizes the redacted page at 2x resolution, burning the black pixels permanently into the image and destroying all underlying text layers.
- **AI Tool Privacy**: For AI Summarization and Translation, extracted document text is transmitted over encrypted HTTPS to Google's Gemini API via `api/chat.js`. Clear warning banners are prominently displayed advising users not to submit proprietary or confidential documents.

---

## ✦ Installation & Local Dev

ZapPDF requires no complex build step and runs out-of-the-box in any modern browser:

### Option 1: Live Server / Node
```bash
# Clone the repository
git clone https://github.com/abhranilsingharoy-cloud/ZapPDF.git
cd ZapPDF

# Install dependencies (optional dev server)
npm install

# Start local dev server
npm run dev
# Or: npx live-server --port=3000
```

### Option 2: Python Simple Server
```bash
python -m http.server 3000
```

Open your browser and navigate to:
```text
http://localhost:3000
```

### Configuring AI Capabilities (Optional)
If you wish to use the AI Summarizer or Translate PDF features with Gemini:
1. Copy `.env.example` to `.env`.
2. Add your Google Gemini API key:
   ```env
   GEMINI_API_KEY=your_gemini_api_key_here
   ```
3. Deploy to Vercel or run with the Vercel CLI (`vercel dev`).

---

## ✦ License

Distributed under the MIT License. See `LICENSE` for more information.

Designed and developed by **Abhranil Singha Roy**.
