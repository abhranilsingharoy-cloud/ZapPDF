// scan-to-pdf.js — Scan documents to PDF via device camera or image upload
// Uses getUserMedia for camera, pdf-lib to build the PDF from captured images

window.ZapScanToPDF = {
  state: { images: [], phase: 'idle', stream: null, cameraActive: false },

  init() {
    this.buildUI();
  },

  buildUI() {
    const workspace = document.querySelector('.tool-workspace') || document.querySelector('main') || document.body;
    let toolSection = document.getElementById('scan-pdf-tool');
    if (!toolSection) {
      toolSection = document.createElement('div');
      toolSection.id = 'scan-pdf-tool';
      toolSection.style.cssText = 'max-width:700px;margin:0 auto;padding:0 16px;';
      const uploadZone = document.getElementById('upload-zone');
      if (uploadZone) {
        uploadZone.style.display = 'none';
        uploadZone.parentNode.insertBefore(toolSection, uploadZone.nextSibling);
      } else {
        const h1 = workspace.querySelector('h1');
        if (h1) h1.parentNode.insertBefore(toolSection, h1.nextSibling);
        else workspace.prepend(toolSection);
      }
    }

    toolSection.innerHTML = `
      <div style="display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap;">
        <button id="btn-open-camera" class="btn btn-primary">📷 Open Camera</button>
        <button id="btn-upload-images" class="btn btn-outline">🖼️ Upload Images</button>
        <input type="file" id="image-file-input" accept="image/*" multiple style="display:none;">
      </div>
      
      <!-- Camera panel -->
      <div id="camera-panel" style="display:none;margin-bottom:16px;">
        <div style="position:relative;background:#000;border-radius:12px;overflow:hidden;max-width:100%;">
          <video id="camera-video" autoplay playsinline style="width:100%;max-height:350px;object-fit:contain;display:block;"></video>
          <canvas id="camera-canvas" style="display:none;"></canvas>
        </div>
        <div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap;">
          <button id="btn-capture" class="btn btn-primary" style="flex:1;">📸 Capture Page</button>
          <button id="btn-close-camera" class="btn btn-outline">✕ Close Camera</button>
          <button id="btn-flip-camera" class="btn btn-outline" title="Flip camera">🔄 Flip</button>
        </div>
        <div style="font-size:12px;color:var(--color-text-muted);margin-top:6px;">
          Position your document in the frame and click "Capture Page" for each page.
        </div>
      </div>
      
      <!-- Captured pages -->
      <div id="pages-panel" style="display:none;margin-bottom:16px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
          <span id="pages-count-text" style="font-size:14px;font-weight:500;">0 pages captured</span>
          <button id="btn-clear-pages" class="btn-text" style="font-size:13px;color:var(--color-error);">Clear All</button>
        </div>
        <div id="pages-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:8px;"></div>
        <div style="margin-top:16px;display:flex;gap:8px;flex-wrap:wrap;">
          <button id="btn-create-pdf" class="btn btn-primary">⚡ Create PDF</button>
          <select id="page-orientation" class="btn btn-outline" style="padding:8px 12px;background:var(--color-surface-2);border:1px solid var(--color-border);border-radius:8px;color:var(--color-text);font-size:14px;">
            <option value="portrait">Portrait</option>
            <option value="landscape">Landscape</option>
          </select>
        </div>
      </div>
      
      <!-- Progress -->
      <div id="scan-progress" style="display:none;margin-bottom:16px;">
        <div style="display:flex;justify-content:space-between;margin-bottom:6px;">
          <span id="scan-progress-text" style="font-size:13px;color:var(--color-text-muted);">Creating PDF...</span>
        </div>
        <div style="height:8px;background:var(--color-surface-2);border-radius:4px;overflow:hidden;">
          <div id="scan-progress-fill" style="height:100%;width:0%;background:var(--color-primary);transition:width 0.3s;border-radius:4px;"></div>
        </div>
      </div>
      
      <!-- Result -->
      <div id="scan-result" style="display:none;padding:20px;background:var(--color-surface-2);border-radius:12px;">
        <div style="font-size:16px;font-weight:600;margin-bottom:12px;">✅ PDF Created!</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          <button id="btn-dl-scan-pdf" class="btn btn-primary">⬇️ Download PDF</button>
          <button class="btn btn-outline" onclick="location.reload()">Scan Again</button>
        </div>
      </div>`;

    this.bindUI();
  },

  bindUI() {
    const vid = document.getElementById('camera-video');
    const canvas = document.getElementById('camera-canvas');
    this._facingMode = 'environment';

    document.getElementById('btn-open-camera')?.addEventListener('click', () => this.openCamera());
    document.getElementById('btn-close-camera')?.addEventListener('click', () => this.closeCamera());
    document.getElementById('btn-capture')?.addEventListener('click', () => this.capturePage());
    document.getElementById('btn-flip-camera')?.addEventListener('click', () => this.flipCamera());
    document.getElementById('btn-upload-images')?.addEventListener('click', () => document.getElementById('image-file-input')?.click());
    document.getElementById('image-file-input')?.addEventListener('change', e => this.handleImageFiles(e.target.files));
    document.getElementById('btn-clear-pages')?.addEventListener('click', () => { this.state.images = []; this.renderPages(); });
    document.getElementById('btn-create-pdf')?.addEventListener('click', () => this.createPDF());
  },

  async openCamera() {
    try {
      if (this.state.stream) this.closeCamera();
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: this._facingMode, width: { ideal: 1920 }, height: { ideal: 1080 } }
      });
      this.state.stream = stream;
      const vid = document.getElementById('camera-video');
      if (vid) { vid.srcObject = stream; }
      document.getElementById('camera-panel').style.display = '';
      document.getElementById('btn-open-camera').textContent = '📷 Camera Active';
    } catch (err) {
      alert('Camera access denied or not available: ' + err.message + '\n\nYou can still upload images using the "Upload Images" button.');
    }
  },

  closeCamera() {
    if (this.state.stream) {
      this.state.stream.getTracks().forEach(t => t.stop());
      this.state.stream = null;
    }
    const vid = document.getElementById('camera-video');
    if (vid) vid.srcObject = null;
    document.getElementById('camera-panel').style.display = 'none';
    document.getElementById('btn-open-camera').textContent = '📷 Open Camera';
  },

  async flipCamera() {
    this._facingMode = this._facingMode === 'environment' ? 'user' : 'environment';
    await this.openCamera();
  },

  capturePage() {
    const vid = document.getElementById('camera-video');
    const canvas = document.getElementById('camera-canvas');
    if (!vid || !canvas) return;
    canvas.width = vid.videoWidth || 1280;
    canvas.height = vid.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(vid, 0, 0);
    const dataURL = canvas.toDataURL('image/jpeg', 0.92);
    this.state.images.push({ dataURL, source: 'camera', timestamp: Date.now() });
    this.renderPages();
    // Flash effect
    const flash = document.createElement('div');
    flash.style.cssText = 'position:fixed;inset:0;background:#fff;opacity:0.8;z-index:9999;pointer-events:none;';
    document.body.appendChild(flash);
    setTimeout(() => document.body.removeChild(flash), 150);
  },

  handleImageFiles(files) {
    const imageFiles = Array.from(files).filter(f => f.type.startsWith('image/'));
    if (!imageFiles.length) { alert('Please select image files (JPG, PNG, WEBP, etc.)'); return; }
    let loaded = 0;
    for (const file of imageFiles) {
      const reader = new FileReader();
      reader.onload = e => {
        this.state.images.push({ dataURL: e.target.result, source: 'upload', name: file.name });
        loaded++;
        if (loaded === imageFiles.length) this.renderPages();
      };
      reader.readAsDataURL(file);
    }
  },

  renderPages() {
    const grid = document.getElementById('pages-grid');
    const panel = document.getElementById('pages-panel');
    const countText = document.getElementById('pages-count-text');
    if (!grid) return;

    const n = this.state.images.length;
    panel.style.display = n > 0 ? '' : 'none';
    if (countText) countText.textContent = `${n} page${n !== 1 ? 's' : ''} captured`;

    grid.innerHTML = this.state.images.map((img, i) => `
      <div style="position:relative;border:1px solid var(--color-border);border-radius:8px;overflow:hidden;">
        <img src="${img.dataURL}" style="width:100%;display:block;aspect-ratio:3/4;object-fit:cover;">
        <div style="position:absolute;top:4px;left:4px;background:rgba(0,0,0,0.6);color:#fff;font-size:11px;padding:2px 6px;border-radius:4px;">Page ${i+1}</div>
        <button onclick="ZapScanToPDF.removePage(${i})" style="position:absolute;top:4px;right:4px;background:rgba(220,38,38,0.9);color:#fff;border:none;border-radius:50%;width:22px;height:22px;font-size:13px;cursor:pointer;line-height:1;">✕</button>
      </div>`).join('');
  },

  removePage(i) {
    this.state.images.splice(i, 1);
    this.renderPages();
  },

  async createPDF() {
    if (!this.state.images.length) { alert('No pages captured yet.'); return; }
    if (!window.PDFLib) { alert('pdf-lib not loaded. Please refresh the page.'); return; }

    const orientation = document.getElementById('page-orientation')?.value || 'portrait';
    const progress = document.getElementById('scan-progress');
    const progressFill = document.getElementById('scan-progress-fill');
    const progressText = document.getElementById('scan-progress-text');

    progress.style.display = '';
    document.getElementById('btn-create-pdf').disabled = true;

    const { PDFDocument } = window.PDFLib;
    const doc = await PDFDocument.create();

    for (let i = 0; i < this.state.images.length; i++) {
      const pct = Math.round(((i + 1) / this.state.images.length) * 90);
      progressFill.style.width = pct + '%';
      progressText.textContent = `Embedding page ${i+1} of ${this.state.images.length}...`;

      const imgData = this.state.images[i].dataURL;
      let embeddedImg;
      try {
        if (imgData.includes('data:image/png')) {
          const bytes = this.dataURLtoBytes(imgData);
          embeddedImg = await doc.embedPng(bytes);
        } else {
          const bytes = this.dataURLtoBytes(imgData);
          embeddedImg = await doc.embedJpg(bytes);
        }
      } catch (e) {
        // Fallback: re-encode as JPEG via canvas
        const canvas = document.createElement('canvas');
        const img = new Image();
        await new Promise(res => { img.onload = res; img.src = imgData; });
        canvas.width = img.naturalWidth; canvas.height = img.naturalHeight;
        canvas.getContext('2d').drawImage(img, 0, 0);
        const jpgBytes = this.dataURLtoBytes(canvas.toDataURL('image/jpeg', 0.9));
        embeddedImg = await doc.embedJpg(jpgBytes);
      }

      const { width: iw, height: ih } = embeddedImg;
      let pw, ph;
      if (orientation === 'landscape') {
        pw = Math.max(iw, ih); ph = Math.min(iw, ih);
      } else {
        pw = iw; ph = ih;
      }
      const page = doc.addPage([pw, ph]);
      page.drawImage(embeddedImg, { x: 0, y: 0, width: pw, height: ph });
    }

    progressFill.style.width = '100%';
    progressText.textContent = 'Saving PDF...';
    const bytes = await doc.save();
    this._pdfBytes = bytes;

    setTimeout(() => {
      progress.style.display = 'none';
      document.getElementById('scan-result').style.display = '';
      document.getElementById('btn-dl-scan-pdf').onclick = () => {
        const blob = new Blob([bytes], { type: 'application/pdf' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `scan-${Date.now()}.pdf`;
        a.click();
      };
    }, 400);
  },

  dataURLtoBytes(dataURL) {
    const base64 = dataURL.split(',')[1];
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  }
};

document.addEventListener('DOMContentLoaded', () => {
  ZapScanToPDF.init();
});
