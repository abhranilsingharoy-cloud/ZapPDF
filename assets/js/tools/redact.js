// redact.js - Real PDF Redaction via pixel-level page rasterization
// Strategy: render the PDF page to canvas, let user draw redaction boxes on an overlay,
// then flatten the entire page to a JPEG image (permanently destroying text layer),
// and rebuild the PDF from rasterized pages.

(function() {
'use strict';

window.ZapRedact = {
  state: {
    file: null,
    pdfDoc: null,       // pdf.js document
    pdfLibDoc: null,    // pdf-lib document
    pdfBytes: null,
    totalPages: 0,
    currentPage: 1,
    phase: 'idle', // idle | loaded | processing | done
    redactRegions: [],  // [{page, x, y, w, h}] in canvas-local px
    pageScale: 1.5,
    resultBlob: null
  },

  init() {
    this.els = {
      uploadZone:     document.getElementById('upload-zone'),
      fileInput:      document.getElementById('file-input'),
      workspace:      document.getElementById('redact-workspace'),
      canvasContainer:document.getElementById('canvas-container'),
      pageCanvas:     document.getElementById('page-canvas'),
      overlayCanvas:  document.getElementById('overlay-canvas'),
      pageNav:        document.getElementById('page-nav'),
      pageInfo:       document.getElementById('page-info'),
      btnPrev:        document.getElementById('btn-prev-page'),
      btnNext:        document.getElementById('btn-next-page'),
      btnApply:       document.getElementById('btn-apply-redact'),
      btnClear:       document.getElementById('btn-clear-regions'),
      resultsPanel:   document.getElementById('results-panel'),
      resultsList:    document.getElementById('results-list'),
      progressBar:    document.getElementById('progress-container'),
      progressFill:   document.getElementById('progress-fill'),
      progressText:   document.getElementById('progress-text')
    };
    this.bindEvents();
  },

  bindEvents() {
    const { els, state } = this;

    // Upload
    els.uploadZone.addEventListener('click', () => els.fileInput.click());
    els.uploadZone.addEventListener('dragover', e => { e.preventDefault(); els.uploadZone.classList.add('dragover'); });
    els.uploadZone.addEventListener('dragleave', () => els.uploadZone.classList.remove('dragover'));
    els.uploadZone.addEventListener('drop', e => { e.preventDefault(); els.uploadZone.classList.remove('dragover'); this.loadFile(e.dataTransfer.files[0]); });
    els.fileInput.addEventListener('change', e => { if(e.target.files[0]) this.loadFile(e.target.files[0]); });

    // Page navigation
    if (els.btnPrev) els.btnPrev.addEventListener('click', () => { if(state.currentPage > 1) { state.currentPage--; this.renderPage(); } });
    if (els.btnNext) els.btnNext.addEventListener('click', () => { if(state.currentPage < state.totalPages) { state.currentPage++; this.renderPage(); } });

    // Drawing on overlay
    if (els.overlayCanvas) {
      let drawing = false, startX, startY;
      els.overlayCanvas.addEventListener('mousedown', e => {
        drawing = true;
        const r = els.overlayCanvas.getBoundingClientRect();
        startX = (e.clientX - r.left) * (els.overlayCanvas.width / r.width);
        startY = (e.clientY - r.top) * (els.overlayCanvas.height / r.height);
      });
      els.overlayCanvas.addEventListener('mousemove', e => {
        if (!drawing) return;
        const r = els.overlayCanvas.getBoundingClientRect();
        const cx = (e.clientX - r.left) * (els.overlayCanvas.width / r.width);
        const cy = (e.clientY - r.top) * (els.overlayCanvas.height / r.height);
        this.redrawOverlay(startX, startY, cx, cy);
      });
      els.overlayCanvas.addEventListener('mouseup', e => {
        if (!drawing) return;
        drawing = false;
        const r = els.overlayCanvas.getBoundingClientRect();
        const endX = (e.clientX - r.left) * (els.overlayCanvas.width / r.width);
        const endY = (e.clientY - r.top) * (els.overlayCanvas.height / r.height);
        const w = Math.abs(endX - startX), h = Math.abs(endY - startY);
        if (w > 5 && h > 5) {
          state.redactRegions.push({
            page: state.currentPage,
            x: Math.min(startX, endX), y: Math.min(startY, endY),
            w, h,
            canvasW: els.overlayCanvas.width, canvasH: els.overlayCanvas.height
          });
          this.redrawOverlay();
        }
      });
      // Touch support
      els.overlayCanvas.addEventListener('touchstart', e => {
        e.preventDefault();
        const t = e.touches[0];
        const r = els.overlayCanvas.getBoundingClientRect();
        drawing = true;
        startX = (t.clientX - r.left) * (els.overlayCanvas.width / r.width);
        startY = (t.clientY - r.top) * (els.overlayCanvas.height / r.height);
      }, { passive: false });
      els.overlayCanvas.addEventListener('touchend', e => {
        e.preventDefault();
        if (!drawing) return;
        drawing = false;
        const t = e.changedTouches[0];
        const r = els.overlayCanvas.getBoundingClientRect();
        const endX = (t.clientX - r.left) * (els.overlayCanvas.width / r.width);
        const endY = (t.clientY - r.top) * (els.overlayCanvas.height / r.height);
        const w = Math.abs(endX - startX), h = Math.abs(endY - startY);
        if (w > 5 && h > 5) {
          state.redactRegions.push({ page: state.currentPage, x: Math.min(startX, endX), y: Math.min(startY, endY), w, h, canvasW: els.overlayCanvas.width, canvasH: els.overlayCanvas.height });
          this.redrawOverlay();
        }
      }, { passive: false });
    }

    if (els.btnClear) els.btnClear.addEventListener('click', () => {
      state.redactRegions = state.redactRegions.filter(r => r.page !== state.currentPage);
      this.redrawOverlay();
    });

    if (els.btnApply) els.btnApply.addEventListener('click', () => this.applyRedaction());
  },

  async loadFile(file) {
    if (!file || (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf')) {
      alert('Please select a valid PDF file.'); return;
    }
    this.state.file = file;
    this.state.pdfBytes = new Uint8Array(await file.arrayBuffer());
    this.state.redactRegions = [];
    this.state.currentPage = 1;

    const pdfjsLib = window['pdfjs-dist/build/pdf'] || window.pdfjsLib;
    if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
      pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    }
    this.state.pdfDoc = await pdfjsLib.getDocument({ data: this.state.pdfBytes }).promise;
    this.state.totalPages = this.state.pdfDoc.numPages;

    this.els.uploadZone.classList.add('hidden');
    this.els.workspace.classList.remove('hidden');
    this.els.resultsPanel.classList.add('hidden');
    await this.renderPage();
  },

  async renderPage() {
    const { state, els } = this;
    const page = await state.pdfDoc.getPage(state.currentPage);
    const viewport = page.getViewport({ scale: state.pageScale });

    els.pageCanvas.width = viewport.width;
    els.pageCanvas.height = viewport.height;
    els.overlayCanvas.width = viewport.width;
    els.overlayCanvas.height = viewport.height;

    await page.render({ canvasContext: els.pageCanvas.getContext('2d'), viewport }).promise;
    this.redrawOverlay();

    if (els.pageInfo) els.pageInfo.textContent = `Page ${state.currentPage} of ${state.totalPages}`;
    if (els.btnPrev) els.btnPrev.disabled = state.currentPage <= 1;
    if (els.btnNext) els.btnNext.disabled = state.currentPage >= state.totalPages;

    const regionCount = state.redactRegions.filter(r => r.page === state.currentPage).length;
    if (els.btnClear) els.btnClear.disabled = regionCount === 0;
  },

  redrawOverlay(dragX, dragY, dragW, dragH) {
    const { state, els } = this;
    const ctx = els.overlayCanvas.getContext('2d');
    ctx.clearRect(0, 0, els.overlayCanvas.width, els.overlayCanvas.height);

    // Draw committed regions for current page
    state.redactRegions.filter(r => r.page === state.currentPage).forEach(r => {
      // Scale region if canvas size changed
      const scaleX = els.overlayCanvas.width / r.canvasW;
      const scaleY = els.overlayCanvas.height / r.canvasH;
      ctx.fillStyle = 'rgba(0,0,0,0.85)';
      ctx.fillRect(r.x * scaleX, r.y * scaleY, r.w * scaleX, r.h * scaleY);
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2;
      ctx.strokeRect(r.x * scaleX, r.y * scaleY, r.w * scaleX, r.h * scaleY);
    });

    // Draw live drag rect
    if (dragX !== undefined && dragW !== undefined) {
      ctx.fillStyle = 'rgba(239,68,68,0.35)';
      ctx.fillRect(Math.min(dragX, dragW), Math.min(dragY, dragH), Math.abs(dragW - dragX), Math.abs(dragH - dragY));
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2;
      ctx.strokeRect(Math.min(dragX, dragW), Math.min(dragY, dragH), Math.abs(dragW - dragX), Math.abs(dragH - dragY));
    }
  },

  setProgress(pct, txt) {
    const { els } = this;
    if (els.progressBar) els.progressBar.classList.remove('hidden');
    if (els.progressFill) els.progressFill.style.width = pct + '%';
    if (els.progressText) els.progressText.textContent = txt || '';
  },

  async applyRedaction() {
    const { state, els } = this;
    if (state.redactRegions.length === 0) {
      alert('Draw at least one redaction region first.'); return;
    }

    els.btnApply.disabled = true;
    els.btnApply.innerHTML = '<span>Applying redactions...</span>';

    this.setProgress(5, 'Preparing redaction engine...');

    const pdfjsLib = window['pdfjs-dist/build/pdf'] || window.pdfjsLib;
    const newPdf = await PDFLib.PDFDocument.create();

    for (let pageNum = 1; pageNum <= state.totalPages; pageNum++) {
      this.setProgress(5 + Math.round((pageNum / state.totalPages) * 88), `Processing page ${pageNum} of ${state.totalPages}...`);

      const page = await state.pdfDoc.getPage(pageNum);
      const viewport = page.getViewport({ scale: 2.0 }); // 2x for quality

      // Render page to canvas
      const canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext('2d');
      await page.render({ canvasContext: ctx, viewport }).promise;

      // Paint redaction boxes onto the canvas (this is the key step — permanently overwrites pixels)
      const regions = state.redactRegions.filter(r => r.page === pageNum);
      if (regions.length > 0) {
        ctx.fillStyle = '#000000';
        regions.forEach(r => {
          // Scale from preview canvas coords to render coords
          const scaleX = viewport.width / r.canvasW;
          const scaleY = viewport.height / r.canvasH;
          ctx.fillRect(
            Math.floor(r.x * scaleX),
            Math.floor(r.y * scaleY),
            Math.ceil(r.w * scaleX),
            Math.ceil(r.h * scaleY)
          );
        });
      }

      // Convert canvas to JPEG (lossy but good enough, and permanently removes text layer)
      const jpegDataUrl = canvas.toDataURL('image/jpeg', 0.92);
      const jpegResponse = await fetch(jpegDataUrl);
      const jpegArrayBuffer = await jpegResponse.arrayBuffer();

      // Embed as image in new PDF page
      const jpgImage = await newPdf.embedJpg(jpegArrayBuffer);
      const origPage = page.getViewport({ scale: 1.0 });
      const newPage = newPdf.addPage([origPage.width, origPage.height]);
      newPage.drawImage(jpgImage, { x: 0, y: 0, width: origPage.width, height: origPage.height });
    }

    this.setProgress(95, 'Saving redacted document...');
    const outBytes = await newPdf.save();
    state.resultBlob = new Blob([outBytes], { type: 'application/pdf' });

    this.setProgress(100, 'Done!');

    // Show results
    els.workspace.classList.add('hidden');
    els.resultsPanel.classList.remove('hidden');
    const outName = state.file.name.replace('.pdf', '_redacted.pdf');
    els.resultsList.innerHTML = `
      <div class="result-card">
        <div class="result-info">
          <div class="result-name">${outName}</div>
          <div class="result-stats">
            <span class="stat-pill success">${state.redactRegions.length} region(s) redacted</span>
            <span style="color:var(--color-text-muted);font-size:13px;margin-left:8px;">Text permanently removed via pixel-level redaction</span>
          </div>
        </div>
        <div class="result-actions">
          <button class="btn btn-primary btn-sm" id="btn-dl-redact">Download Redacted PDF</button>
          <button class="btn btn-outline btn-sm" onclick="location.reload()" style="margin-left:8px;">Redact Another</button>
        </div>
      </div>
      <p style="font-size:12px;color:var(--color-text-muted);margin-top:12px;padding:12px;background:var(--color-surface-2);border-radius:8px;">
        ⚠️ <strong>Verification:</strong> The redacted pages have been fully rasterized — the original text layer is permanently destroyed.
        Open the downloaded PDF and try to select text in the redacted areas to confirm.
      </p>`;
    document.getElementById('btn-dl-redact').onclick = () => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(state.resultBlob);
      a.download = outName;
      a.click();
    };
    if (window.confetti) confetti({ particleCount: 80, spread: 60, origin: { y: 0.7 } });
  }
};

document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('upload-zone') && document.getElementById('overlay-canvas')) {
    ZapRedact.init();
  }
});
})();
