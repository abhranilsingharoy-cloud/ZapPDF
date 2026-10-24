// compare-pdf.js — Real text diff between two PDFs using pdf.js text extraction
// Shows added (green) / removed (red) / unchanged lines in a side-by-side report

window.ZapComparePDF = {
  state: { fileA: null, fileB: null, phase: 'idle' },

  init() {
    this.els = {
      uploadZone:     document.getElementById('upload-zone'),
      fileInput:      document.getElementById('file-input'),
      uploadCompact:  document.getElementById('upload-compact'),
      fileList:       document.getElementById('file-list'),
      controls:       document.getElementById('controls'),
      btnConvert:     document.getElementById('btn-convert'),
      progressContainer: document.getElementById('progress-container'),
      progressFill:   document.getElementById('progress-fill'),
      progressText:   document.getElementById('progress-text'),
      resultsPanel:   document.getElementById('results-panel'),
      resultsList:    document.getElementById('results-list'),
      fileCountText:  document.getElementById('file-count-text'),
      btnChangeFiles: document.getElementById('btn-change-files')
    };
    this.buildSpecialUI();
    this.bindEvents();
    this.render();
  },

  // Inject the two-file upload UI into the upload zone if it only has one input
  buildSpecialUI() {
    const zone = this.els.uploadZone;
    if (!zone) return;
    zone.innerHTML = `
      <div style="display:flex;gap:16px;flex-wrap:wrap;justify-content:center;padding:16px;">
        <div class="compare-drop" id="drop-a" style="flex:1;min-width:220px;border:2px dashed var(--color-border);border-radius:12px;padding:24px;text-align:center;cursor:pointer;transition:border-color 0.2s;">
          <div style="font-size:32px;margin-bottom:8px;">📄</div>
          <div style="font-weight:600;margin-bottom:4px;">Original PDF</div>
          <div id="label-a" style="font-size:13px;color:var(--color-text-muted);">Click or drag to upload</div>
          <input type="file" id="input-a" accept=".pdf" style="display:none">
        </div>
        <div style="display:flex;align-items:center;font-size:20px;color:var(--color-text-muted);">VS</div>
        <div class="compare-drop" id="drop-b" style="flex:1;min-width:220px;border:2px dashed var(--color-border);border-radius:12px;padding:24px;text-align:center;cursor:pointer;transition:border-color 0.2s;">
          <div style="font-size:32px;margin-bottom:8px;">📄</div>
          <div style="font-weight:600;margin-bottom:4px;">Modified PDF</div>
          <div id="label-b" style="font-size:13px;color:var(--color-text-muted);">Click or drag to upload</div>
          <input type="file" id="input-b" accept=".pdf" style="display:none">
        </div>
      </div>`;

    const inputA = document.getElementById('input-a');
    const inputB = document.getElementById('input-b');
    const dropA = document.getElementById('drop-a');
    const dropB = document.getElementById('drop-b');

    dropA.addEventListener('click', () => inputA.click());
    dropB.addEventListener('click', () => inputB.click());

    inputA.addEventListener('change', e => { if (e.target.files[0]) { this.state.fileA = e.target.files[0]; document.getElementById('label-a').textContent = e.target.files[0].name; this.checkReady(); } });
    inputB.addEventListener('change', e => { if (e.target.files[0]) { this.state.fileB = e.target.files[0]; document.getElementById('label-b').textContent = e.target.files[0].name; this.checkReady(); } });

    [dropA, dropB].forEach((drop, i) => {
      drop.addEventListener('dragover', e => { e.preventDefault(); drop.style.borderColor = 'var(--color-primary)'; });
      drop.addEventListener('dragleave', () => { drop.style.borderColor = 'var(--color-border)'; });
      drop.addEventListener('drop', e => {
        e.preventDefault(); drop.style.borderColor = 'var(--color-border)';
        const file = e.dataTransfer.files[0];
        if (!file || !file.name.endsWith('.pdf')) return;
        if (i === 0) { this.state.fileA = file; document.getElementById('label-a').textContent = file.name; }
        else { this.state.fileB = file; document.getElementById('label-b').textContent = file.name; }
        this.checkReady();
      });
    });
  },

  checkReady() {
    if (this.state.fileA && this.state.fileB) {
      this.state.phase = 'selected';
      this.render();
    }
  },

  bindEvents() {
    if (this.els.btnChangeFiles) this.els.btnChangeFiles.addEventListener('click', () => {
      this.state = { fileA: null, fileB: null, phase: 'idle' };
      this.render();
      setTimeout(() => this.buildSpecialUI(), 50);
    });
    if (this.els.btnConvert) this.els.btnConvert.addEventListener('click', () => this.startComparison());
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

    if (state.phase === 'selected') {
      if (els.fileCountText) els.fileCountText.textContent = '2 PDFs ready to compare';
      if (els.fileList) els.fileList.innerHTML = `
        <div class="file-card"><div class="file-info"><div class="file-name">Original: ${state.fileA.name}</div></div></div>
        <div class="file-card"><div class="file-info"><div class="file-name">Modified: ${state.fileB.name}</div></div></div>`;
      if (els.btnConvert) { els.btnConvert.disabled = false; els.btnConvert.innerHTML = '<span>Compare PDFs</span>'; els.btnConvert.style.removeProperty('opacity'); els.btnConvert.style.removeProperty('cursor'); }
    }
  },

  setProgress(pct, txt) {
    if (this.els.progressContainer) this.els.progressContainer.classList.remove('hidden');
    if (this.els.progressFill) this.els.progressFill.style.width = pct + '%';
    if (this.els.progressText) this.els.progressText.textContent = txt || '';
  },

  async extractText(file) {
    const pdfjsLib = window['pdfjs-dist/build/pdf'] || window.pdfjsLib;
    const ab = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: ab }).promise;
    const lines = [];
    for (let p = 1; p <= pdf.numPages; p++) {
      const page = await pdf.getPage(p);
      const tc = await page.getTextContent();
      let line = '';
      let lastY = null;
      const items = tc.items.sort((a, b) => (b.transform?.[5] ?? 0) - (a.transform?.[5] ?? 0));
      for (const item of items) {
        const y = Math.round(item.transform?.[5] ?? 0);
        if (lastY !== null && Math.abs(y - lastY) > 4) {
          if (line.trim()) lines.push(line.trim());
          line = '';
        }
        line += item.str;
        lastY = y;
      }
      if (line.trim()) lines.push(line.trim());
      lines.push(`\n── Page ${p} end ──\n`);
    }
    return lines.filter(l => l.trim());
  },

  // Simple LCS-based diff
  computeDiff(linesA, linesB) {
    const m = linesA.length, n = linesB.length;
    // For large docs, use a simplified approach to avoid O(m*n) memory
    if (m * n > 500000) return this.simpleDiff(linesA, linesB);
    // Build LCS table
    const dp = Array.from({ length: m + 1 }, () => new Int32Array(n + 1));
    for (let i = 1; i <= m; i++)
      for (let j = 1; j <= n; j++)
        dp[i][j] = linesA[i-1] === linesB[j-1] ? dp[i-1][j-1] + 1 : Math.max(dp[i-1][j], dp[i][j-1]);

    // Backtrack
    const diff = [];
    let i = m, j = n;
    while (i > 0 || j > 0) {
      if (i > 0 && j > 0 && linesA[i-1] === linesB[j-1]) { diff.unshift({ type: 'same', text: linesA[i-1] }); i--; j--; }
      else if (j > 0 && (i === 0 || dp[i][j-1] >= dp[i-1][j])) { diff.unshift({ type: 'added', text: linesB[j-1] }); j--; }
      else { diff.unshift({ type: 'removed', text: linesA[i-1] }); i--; }
    }
    return diff;
  },

  simpleDiff(linesA, linesB) {
    const setA = new Set(linesA), setB = new Set(linesB);
    const diff = [];
    for (const l of linesA) diff.push({ type: setB.has(l) ? 'same' : 'removed', text: l });
    for (const l of linesB) if (!setA.has(l)) diff.push({ type: 'added', text: l });
    return diff;
  },

  async startComparison() {
    const { state, els } = this;
    if (!state.fileA || !state.fileB) return;

    state.phase = 'processing';
    if (els.btnConvert) { els.btnConvert.disabled = true; els.btnConvert.innerHTML = '<span>Comparing...</span>'; }
    this.setProgress(5, 'Loading original PDF...');

    try {
      const linesA = await this.extractText(state.fileA);
      this.setProgress(40, 'Loading modified PDF...');
      const linesB = await this.extractText(state.fileB);
      this.setProgress(70, 'Computing differences...');

      const diff = this.computeDiff(linesA, linesB);
      this.setProgress(90, 'Rendering report...');

      const added   = diff.filter(d => d.type === 'added').length;
      const removed = diff.filter(d => d.type === 'removed').length;
      const same    = diff.filter(d => d.type === 'same').length;
      const total   = diff.length;

      const similarity = total ? Math.round((same / total) * 100) : 100;

      // Build download report
      let reportText = `ZapPDF Compare Report\n`;
      reportText += `Original: ${state.fileA.name}\nModified: ${state.fileB.name}\n`;
      reportText += `Similarity: ${similarity}%\nAdded lines: ${added} | Removed lines: ${removed} | Unchanged: ${same}\n\n`;
      reportText += '─'.repeat(60) + '\n\n';
      for (const d of diff) {
        const prefix = d.type === 'added' ? '+ ' : d.type === 'removed' ? '- ' : '  ';
        reportText += prefix + d.text + '\n';
      }
      const reportBlob = new Blob([reportText], { type: 'text/plain' });

      // Build HTML diff view (show first 200 diff items to avoid DOM overload)
      const previewDiff = diff.slice(0, 300);
      const diffHTML = previewDiff.map(d => {
        const bg = d.type === 'added' ? '#d1fae5' : d.type === 'removed' ? '#fee2e2' : 'transparent';
        const color = d.type === 'added' ? '#065f46' : d.type === 'removed' ? '#991b1b' : 'var(--color-text)';
        const prefix = d.type === 'added' ? '+ ' : d.type === 'removed' ? '− ' : '  ';
        const text = d.text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
        return `<div style="padding:2px 8px;background:${bg};color:${color};font-family:monospace;font-size:12px;white-space:pre-wrap;border-bottom:1px solid ${d.type === 'same' ? 'transparent' : 'rgba(0,0,0,0.06)'};">${prefix}${text}</div>`;
      }).join('');

      if (els.resultsList) els.resultsList.innerHTML = `
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:16px;">
          <div style="background:#d1fae5;border-radius:8px;padding:12px;text-align:center;">
            <div style="font-size:22px;font-weight:700;color:#065f46;">${added}</div>
            <div style="font-size:12px;color:#065f46;">Lines Added</div>
          </div>
          <div style="background:#fee2e2;border-radius:8px;padding:12px;text-align:center;">
            <div style="font-size:22px;font-weight:700;color:#991b1b;">${removed}</div>
            <div style="font-size:12px;color:#991b1b;">Lines Removed</div>
          </div>
          <div style="background:var(--color-surface-2);border-radius:8px;padding:12px;text-align:center;">
            <div style="font-size:22px;font-weight:700;">${similarity}%</div>
            <div style="font-size:12px;color:var(--color-text-muted);">Similarity</div>
          </div>
        </div>
        <div style="border:1px solid var(--color-border);border-radius:8px;overflow:hidden;max-height:400px;overflow-y:auto;margin-bottom:16px;">
          <div style="background:var(--color-surface-2);padding:8px 12px;font-size:12px;font-weight:600;border-bottom:1px solid var(--color-border);">
            Diff Preview ${diff.length > 300 ? '(first 300 lines shown)' : ''}
          </div>
          ${diffHTML}
        </div>
        <div style="display:flex;gap:12px;flex-wrap:wrap;">
          <button class="btn btn-primary" id="btn-dl-report">Download Full Report (.txt)</button>
          <button class="btn btn-outline" onclick="location.reload()">Compare Another</button>
        </div>`;

      document.getElementById('btn-dl-report').onclick = () => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(reportBlob);
        a.download = `compare-report-${Date.now()}.txt`;
        a.click();
      };

      this.setProgress(100, 'Comparison complete!');
      setTimeout(() => { state.phase = 'done'; this.render(); }, 500);

    } catch (err) {
      console.error('Compare PDF failed:', err);
      alert('Comparison failed: ' + err.message);
      state.phase = 'selected';
      if (els.btnConvert) { els.btnConvert.disabled = false; els.btnConvert.innerHTML = '<span>Compare PDFs</span>'; }
      if (els.progressContainer) els.progressContainer.classList.add('hidden');
    }
  }
};

document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('upload-zone')) ZapComparePDF.init();
});
