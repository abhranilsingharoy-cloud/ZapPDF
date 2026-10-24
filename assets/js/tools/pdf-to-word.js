// pdf-to-word.js - Real PDF to DOCX conversion using pdf.js text extraction + docx.js

window.ZapPDFToWord = {
  state: { file: null, phase: 'idle', resultBlob: null },

  init() {
    this.els = {
      uploadZone:    document.getElementById('upload-zone'),
      fileInput:     document.getElementById('file-input'),
      uploadCompact: document.getElementById('upload-compact'),
      fileList:      document.getElementById('file-list'),
      controls:      document.getElementById('controls'),
      btnConvert:    document.getElementById('btn-convert'),
      progressContainer: document.getElementById('progress-container'),
      progressFill:  document.getElementById('progress-fill'),
      progressText:  document.getElementById('progress-text'),
      resultsPanel:  document.getElementById('results-panel'),
      resultsList:   document.getElementById('results-list'),
      fileCountText: document.getElementById('file-count-text'),
      btnChangeFiles:document.getElementById('btn-change-files')
    };
    this.bindEvents();
  },

  bindEvents() {
    const { els } = this;
    const lnk = document.querySelector('.upload-link');
    if (lnk) lnk.addEventListener('click', () => els.fileInput.click());
    els.uploadZone.addEventListener('click', () => els.fileInput.click());
    els.uploadZone.addEventListener('dragover', e => { e.preventDefault(); els.uploadZone.classList.add('dragover'); });
    els.uploadZone.addEventListener('dragleave', () => els.uploadZone.classList.remove('dragover'));
    els.uploadZone.addEventListener('drop', e => { e.preventDefault(); els.uploadZone.classList.remove('dragover'); this.handleFiles(e.dataTransfer.files); });
    els.fileInput.addEventListener('change', e => this.handleFiles(e.target.files));
    if (els.btnChangeFiles) els.btnChangeFiles.addEventListener('click', () => { this.state = { file: null, phase: 'idle', resultBlob: null }; els.fileInput.value = ''; this.render(); });
    if (els.btnConvert) els.btnConvert.addEventListener('click', () => this.startConversion());
  },

  handleFiles(fileList) {
    const f = Array.from(fileList).find(f => f.name.toLowerCase().endsWith('.pdf') || f.type === 'application/pdf');
    if (!f) { alert('Please select a PDF file.'); return; }
    this.state.file = f;
    this.state.phase = 'selected';
    this.render();
  },

  fmt(bytes) {
    if (!bytes) return '0 B';
    const k = 1024, sz = ['B','KB','MB','GB'];
    const i = Math.floor(Math.log(bytes)/Math.log(k));
    return (bytes/Math.pow(k,i)).toFixed(2) + ' ' + sz[i];
  },

  render() {
    const { els, state } = this;
    const idle = state.phase === 'idle';
    const done = state.phase === 'done';
    els.uploadZone.classList.toggle('hidden', !idle);
    els.uploadCompact.classList.toggle('hidden', idle);
    els.fileList.classList.toggle('hidden', idle || done);
    els.controls.classList.toggle('hidden', idle || done);
    els.resultsPanel.classList.toggle('hidden', !done);
    if (els.progressContainer) els.progressContainer.classList.add('hidden');

    if (state.phase === 'selected' && state.file) {
      if (els.fileCountText) els.fileCountText.textContent = '1 file selected';
      if (els.fileList) els.fileList.innerHTML = `<div class="file-card"><div class="file-info"><div class="file-name">${state.file.name}</div><div class="file-meta">${this.fmt(state.file.size)}</div></div></div>`;
      if (els.btnConvert) { els.btnConvert.disabled = false; els.btnConvert.innerHTML = '<span>Convert to Word (.docx)</span>'; }
    }
    if (state.phase === 'done' && state.resultBlob) {
      const outName = state.file.name.replace(/\.pdf$/i, '.docx');
      els.resultsList.innerHTML = `
        <div class="result-card">
          <div class="result-info">
            <div class="result-name">${outName}</div>
            <div class="result-stats">
              <span class="stat-pill success">${this.fmt(state.resultBlob.size)}</span>
              <span style="color:var(--color-text-muted);font-size:13px;margin-left:8px;">Converted successfully</span>
            </div>
          </div>
          <div class="result-actions">
            <button class="btn btn-primary btn-sm" id="btn-dl-word">Download DOCX</button>
            <button class="btn btn-outline btn-sm" onclick="location.reload()" style="margin-left:8px;">Convert Another</button>
          </div>
        </div>
        <p style="font-size:12px;color:var(--color-text-muted);margin-top:12px;padding:12px;background:var(--color-surface-2);border-radius:8px;">
          <strong>Note:</strong> Text and paragraph structure are preserved. Complex formatting such as tables, multi-column layouts, and embedded images may not be reproduced exactly.
        </p>`;
      document.getElementById('btn-dl-word').onclick = () => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(state.resultBlob);
        a.download = outName;
        a.click();
      };
    }
  },

  setProgress(pct, txt) {
    const { els } = this;
    if (els.progressContainer) els.progressContainer.classList.remove('hidden');
    if (els.progressFill) els.progressFill.style.width = pct + '%';
    if (els.progressText) els.progressText.textContent = txt || '';
  },

  async startConversion() {
    const { state, els } = this;
    if (!state.file) return;

    state.phase = 'converting';
    if (els.btnConvert) { els.btnConvert.disabled = true; els.btnConvert.innerHTML = '<span>Converting...</span>'; }
    this.setProgress(5, 'Loading PDF...');

    try {
      const pdfjsLib = window['pdfjs-dist/build/pdf'] || window.pdfjsLib;
      if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      }

      const ab = await state.file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: ab }).promise;
      const numPages = pdf.numPages;

      // Extract text from all pages
      const paragraphs = [];
      for (let p = 1; p <= numPages; p++) {
        this.setProgress(5 + Math.round((p / numPages) * 70), `Extracting text from page ${p} of ${numPages}...`);
        const page = await pdf.getPage(p);
        const textContent = await page.getTextContent();

        // Group items into lines based on y-position
        let currentLine = [];
        let lastY = null;
        const lines = [];
        const items = textContent.items.sort((a, b) => {
          const ay = a.transform ? a.transform[5] : 0;
          const by_ = b.transform ? b.transform[5] : 0;
          return by_ - ay; // PDF y is bottom-up
        });

        for (const item of items) {
          const y = item.transform ? Math.round(item.transform[5]) : 0;
          if (lastY !== null && Math.abs(y - lastY) > 5) {
            if (currentLine.length) lines.push(currentLine.join(' ').trim());
            currentLine = [];
          }
          currentLine.push(item.str);
          lastY = y;
        }
        if (currentLine.length) lines.push(currentLine.join(' ').trim());

        // Convert lines to paragraphs
        if (p > 1) paragraphs.push(''); // Page break gap
        for (const line of lines) {
          if (line.trim()) paragraphs.push(line);
        }
      }

      this.setProgress(80, 'Generating DOCX document...');

      // Build DOCX using docx.js
      const { Document, Paragraph, TextRun, HeadingLevel, Packer } = window.docx;

      const docParagraphs = paragraphs.map(text => {
        if (!text) {
          return new Paragraph({ children: [new TextRun('')], spacing: { after: 200 } });
        }
        // Simple heuristic: short lines in ALL CAPS are likely headings
        const isHeading = text.length < 80 && text === text.toUpperCase() && text.trim().length > 3;
        return new Paragraph({
          text: text,
          ...(isHeading ? { heading: HeadingLevel.HEADING_2 } : {}),
          spacing: { after: 120 }
        });
      });

      const doc = new Document({
        creator: 'ZapPDF',
        title: state.file.name.replace(/\.pdf$/i, ''),
        sections: [{ properties: {}, children: docParagraphs }]
      });

      this.setProgress(95, 'Saving DOCX...');
      const blob = await Packer.toBlob(doc);
      state.resultBlob = blob;
      this.setProgress(100, 'Done!');

      setTimeout(() => {
        state.phase = 'done';
        this.render();
        if (window.confetti) confetti({ particleCount: 100, spread: 60, origin: { y: 0.7 } });
      }, 400);

    } catch (err) {
      console.error('PDF to Word failed:', err);
      alert('Conversion failed: ' + err.message);
      state.phase = 'selected';
      if (els.btnConvert) { els.btnConvert.disabled = false; els.btnConvert.innerHTML = '<span>Convert to Word (.docx)</span>'; }
      if (els.progressContainer) els.progressContainer.classList.add('hidden');
    }
  }
};

document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('upload-zone') && document.getElementById('btn-convert')) {
    ZapPDFToWord.init();
  }
});
