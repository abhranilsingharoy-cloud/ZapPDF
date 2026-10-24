// word-to-pdf.js — Word DOCX to PDF via mammoth.js + browser print dialog
// Strategy: mammoth converts DOCX to clean HTML → inject into hidden iframe → trigger print

window.ZapWordToPDF = {
  state: { files: [], phase: 'idle' },

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
      btnChangeFiles: document.getElementById('btn-change-files')
    };
    this.bindEvents();
    this.render();
  },

  bindEvents() {
    const { els } = this;
    const lnk = document.querySelector('.upload-link');
    if (lnk) lnk.addEventListener('click', e => { e.preventDefault(); els.fileInput.click(); });
    if (els.uploadZone) {
      els.uploadZone.addEventListener('click', () => els.fileInput.click());
      els.uploadZone.addEventListener('dragover', e => { e.preventDefault(); els.uploadZone.classList.add('dragover'); });
      els.uploadZone.addEventListener('dragleave', () => els.uploadZone.classList.remove('dragover'));
      els.uploadZone.addEventListener('drop', e => { e.preventDefault(); els.uploadZone.classList.remove('dragover'); this.handleFiles(e.dataTransfer.files); });
    }
    if (els.fileInput) els.fileInput.addEventListener('change', e => this.handleFiles(e.target.files));
    if (els.btnChangeFiles) els.btnChangeFiles.addEventListener('click', () => { this.state = { files: [], phase: 'idle' }; if (els.fileInput) els.fileInput.value = ''; this.render(); });
    if (els.btnConvert) els.btnConvert.addEventListener('click', () => this.startConversion());
  },

  handleFiles(fileList) {
    const accepted = Array.from(fileList).filter(f => /\.(docx|doc)$/i.test(f.name));
    if (!accepted.length) { alert('Please select a .docx or .doc file.'); return; }
    this.state.files = accepted;
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
    if (!els.uploadZone) return;
    const idle = state.phase === 'idle';
    const done = state.phase === 'done';
    els.uploadZone.classList.toggle('hidden', !idle);
    if (els.uploadCompact) els.uploadCompact.classList.toggle('hidden', idle);
    if (els.fileList) els.fileList.classList.toggle('hidden', idle || done);
    if (els.controls) els.controls.classList.toggle('hidden', idle || done);
    if (els.resultsPanel) els.resultsPanel.classList.toggle('hidden', !done);
    if (els.progressContainer) els.progressContainer.classList.add('hidden');

    if (state.phase === 'selected' && state.files.length) {
      if (els.fileCountText) els.fileCountText.textContent = `${state.files.length} file(s) selected`;
      if (els.fileList) els.fileList.innerHTML = state.files.map(f =>
        `<div class="file-card"><div class="file-info"><div class="file-name">${f.name}</div><div class="file-meta">${this.fmt(f.size)}</div></div></div>`
      ).join('');
      if (els.btnConvert) { els.btnConvert.disabled = false; els.btnConvert.innerHTML = '<span>Convert to PDF</span>'; els.btnConvert.style.removeProperty('opacity'); els.btnConvert.style.removeProperty('cursor'); }
    }
    if (state.phase === 'done') {
      if (els.resultsList) els.resultsList.innerHTML = `
        <div class="result-card">
          <div class="result-info">
            <div class="result-name">Conversion instructions</div>
          </div>
        </div>
        <div style="background:var(--color-surface-2);border-radius:8px;padding:20px;margin-top:12px;">
          <h4 style="margin:0 0 12px;font-size:15px;">Your browser's Print dialog has opened (or will open shortly)</h4>
          <ol style="margin:0;padding-left:20px;line-height:1.8;font-size:14px;color:var(--color-text-muted);">
            <li>In the print dialog, set <strong>Destination</strong> to <strong>"Save as PDF"</strong></li>
            <li>Click <strong>"Save"</strong> and choose your output location</li>
            <li>The resulting PDF will preserve your document's text and basic structure</li>
          </ol>
          <p style="font-size:13px;color:var(--color-text-muted);margin:12px 0 0;padding-top:12px;border-top:1px solid var(--color-border);">
            <strong>Note:</strong> Complex DOCX features (macros, text boxes, certain table styles) may render differently. For best results, use the Chrome or Edge browser.
          </p>
          <button class="btn btn-primary" onclick="location.reload()" style="margin-top:16px;">Convert Another File</button>
        </div>`;
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
    if (!state.files.length) return;
    if (!window.mammoth) { alert('Mammoth.js library failed to load. Please refresh and try again.'); return; }

    state.phase = 'converting';
    if (els.btnConvert) { els.btnConvert.disabled = true; els.btnConvert.innerHTML = '<span>Converting...</span>'; }
    this.setProgress(10, 'Reading document...');

    try {
      const file = state.files[0];
      const arrayBuffer = await file.arrayBuffer();

      this.setProgress(40, 'Converting to HTML...');
      const result = await mammoth.convertToHtml({ arrayBuffer });

      if (result.messages && result.messages.length) {
        console.info('Mammoth conversion messages:', result.messages);
      }

      this.setProgress(80, 'Preparing print dialog...');

      // Build a print-ready HTML document in a hidden iframe
      const printHTML = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${file.name.replace(/\.(docx|doc)$/i, '')}</title>
  <style>
    body { font-family: 'Times New Roman', serif; font-size: 12pt; line-height: 1.6; margin: 2.54cm; color: #000; }
    h1,h2,h3,h4,h5,h6 { font-weight: bold; }
    h1 { font-size: 18pt; margin: 12pt 0 6pt; }
    h2 { font-size: 16pt; margin: 10pt 0 4pt; }
    h3 { font-size: 14pt; margin: 8pt 0 4pt; }
    p { margin: 0 0 6pt; }
    table { border-collapse: collapse; width: 100%; margin: 6pt 0; }
    td, th { border: 1px solid #000; padding: 4pt; }
    img { max-width: 100%; }
    @media print { body { margin: 0; } }
  </style>
</head>
<body>${result.value}</body>
</html>`;

      // Create iframe, print, then clean up
      const iframe = document.createElement('iframe');
      iframe.style.cssText = 'position:absolute;width:0;height:0;border:none;top:-9999px;left:-9999px;';
      document.body.appendChild(iframe);
      iframe.contentDocument.open();
      iframe.contentDocument.write(printHTML);
      iframe.contentDocument.close();

      iframe.onload = () => {
        setTimeout(() => {
          iframe.contentWindow.focus();
          iframe.contentWindow.print();
          setTimeout(() => {
            document.body.removeChild(iframe);
          }, 2000);
        }, 500);
      };

      this.setProgress(100, 'Done! Use "Save as PDF" in the print dialog.');
      setTimeout(() => {
        state.phase = 'done';
        this.render();
      }, 1000);

    } catch (err) {
      console.error('Word to PDF failed:', err);
      alert('Conversion failed: ' + err.message);
      state.phase = 'selected';
      if (els.btnConvert) { els.btnConvert.disabled = false; els.btnConvert.innerHTML = '<span>Convert to PDF</span>'; }
      if (els.progressContainer) els.progressContainer.classList.add('hidden');
    }
  }
};

document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('upload-zone')) ZapWordToPDF.init();
});
