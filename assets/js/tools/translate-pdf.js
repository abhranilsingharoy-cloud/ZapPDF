// translate-pdf.js — PDF Translation via Gemini API (server-side proxy)
// Extracts text with pdf.js, sends to /api/translate (Gemini backend), downloads translated text PDF

window.ZapTranslatePDF = {
  state: { file: null, phase: 'idle', resultBlob: null },

  LANGUAGES: [
    { code: 'es', name: 'Spanish' }, { code: 'fr', name: 'French' },
    { code: 'de', name: 'German' }, { code: 'zh', name: 'Chinese (Simplified)' },
    { code: 'ja', name: 'Japanese' }, { code: 'ko', name: 'Korean' },
    { code: 'pt', name: 'Portuguese' }, { code: 'it', name: 'Italian' },
    { code: 'ru', name: 'Russian' }, { code: 'ar', name: 'Arabic' },
    { code: 'hi', name: 'Hindi' }, { code: 'nl', name: 'Dutch' },
    { code: 'pl', name: 'Polish' }, { code: 'tr', name: 'Turkish' },
    { code: 'sv', name: 'Swedish' }, { code: 'da', name: 'Danish' },
    { code: 'fi', name: 'Finnish' }, { code: 'no', name: 'Norwegian' },
    { code: 'id', name: 'Indonesian' }, { code: 'th', name: 'Thai' },
    { code: 'vi', name: 'Vietnamese' }, { code: 'uk', name: 'Ukrainian' },
    { code: 'cs', name: 'Czech' }, { code: 'ro', name: 'Romanian' },
    { code: 'bn', name: 'Bengali' }
  ],

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
    this.injectPrivacyBanner();
    this.injectLanguageSelect();
    this.bindEvents();
    this.render();
  },

  injectPrivacyBanner() {
    if (document.getElementById('translate-privacy-banner')) return;
    const banner = document.createElement('div');
    banner.id = 'translate-privacy-banner';
    banner.style.cssText = 'background:#fffbeb;border:1px solid #f59e0b;border-radius:8px;padding:16px;margin-bottom:24px;font-size:14px;color:#92400e;display:flex;gap:10px;align-items:flex-start;';
    banner.innerHTML = '<span style="font-size:18px;flex-shrink:0;">⚠️</span><div><strong>Privacy Notice:</strong> The text extracted from your PDF will be sent to Google\'s Gemini API for translation. <strong>Do not use this tool with confidential, proprietary, or sensitive documents.</strong> Processing occurs via encrypted HTTPS. No files are stored on our servers.</div>';
    const controls = this.els.controls;
    if (controls && controls.parentNode) {
      controls.parentNode.insertBefore(banner, controls);
    }
  },

  injectLanguageSelect() {
    if (document.getElementById('translate-lang-select')) return;
    const controls = this.els.controls;
    if (!controls) return;
    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'margin-bottom:16px;';
    wrapper.innerHTML = `
      <label for="translate-lang-select" style="display:block;font-size:13px;font-weight:500;color:var(--color-text-muted);margin-bottom:6px;">Translate to:</label>
      <select id="translate-lang-select" style="width:100%;padding:10px 12px;background:var(--color-surface-2);border:1px solid var(--color-border);border-radius:8px;color:var(--color-text);font-size:14px;">
        ${this.LANGUAGES.map(l => `<option value="${l.code}">${l.name}</option>`).join('')}
      </select>`;
    controls.insertBefore(wrapper, controls.firstChild);
  },

  bindEvents() {
    const { els } = this;
    const lnk = document.querySelector('.upload-link');
    if (lnk) lnk.addEventListener('click', e => { e.preventDefault(); els.fileInput?.click(); });
    if (els.uploadZone) {
      els.uploadZone.addEventListener('click', () => els.fileInput?.click());
      els.uploadZone.addEventListener('dragover', e => { e.preventDefault(); els.uploadZone.classList.add('dragover'); });
      els.uploadZone.addEventListener('dragleave', () => els.uploadZone.classList.remove('dragover'));
      els.uploadZone.addEventListener('drop', e => { e.preventDefault(); els.uploadZone.classList.remove('dragover'); this.handleFiles(e.dataTransfer.files); });
    }
    if (els.fileInput) els.fileInput.addEventListener('change', e => this.handleFiles(e.target.files));
    if (els.btnChangeFiles) els.btnChangeFiles.addEventListener('click', () => { this.state = { file: null, phase: 'idle', resultBlob: null }; if (els.fileInput) els.fileInput.value = ''; this.render(); });
    if (els.btnConvert) els.btnConvert.addEventListener('click', () => this.startTranslation());
  },

  handleFiles(fileList) {
    const f = Array.from(fileList).find(f => /\.pdf$/i.test(f.name) || f.type === 'application/pdf');
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
    if (!els.uploadZone) return;
    const idle = state.phase === 'idle';
    const done = state.phase === 'done';
    els.uploadZone.classList.toggle('hidden', !idle);
    if (els.uploadCompact) els.uploadCompact.classList.toggle('hidden', idle);
    if (els.fileList) els.fileList.classList.toggle('hidden', idle || done);
    if (els.controls) els.controls.classList.toggle('hidden', idle || done);
    if (els.resultsPanel) els.resultsPanel.classList.toggle('hidden', !done);
    if (els.progressContainer) els.progressContainer.classList.add('hidden');

    if (state.phase === 'selected' && state.file) {
      if (els.fileCountText) els.fileCountText.textContent = '1 file selected';
      if (els.fileList) els.fileList.innerHTML = `<div class="file-card"><div class="file-info"><div class="file-name">${state.file.name}</div><div class="file-meta">${this.fmt(state.file.size)}</div></div></div>`;
      if (els.btnConvert) { els.btnConvert.disabled = false; els.btnConvert.innerHTML = '<span>Translate PDF</span>'; els.btnConvert.style.removeProperty('opacity'); els.btnConvert.style.removeProperty('cursor'); }
    }
    if (state.phase === 'done' && state.resultBlob) {
      const lang = this.LANGUAGES.find(l => l.code === (document.getElementById('translate-lang-select')?.value || 'es'))?.name || 'Target Language';
      const outName = state.file.name.replace(/\.pdf$/i, '') + `_${lang.toLowerCase().replace(/\s/g,'_')}.txt`;
      if (els.resultsList) els.resultsList.innerHTML = `
        <div class="result-card">
          <div class="result-info">
            <div class="result-name">${outName}</div>
            <div class="result-stats"><span class="stat-pill success">Translated to ${lang}</span></div>
          </div>
          <div class="result-actions">
            <button class="btn btn-primary btn-sm" id="btn-dl-translation">Download Translation</button>
            <button class="btn btn-outline btn-sm" onclick="location.reload()" style="margin-left:8px;">Translate Another</button>
          </div>
        </div>
        <p style="font-size:12px;color:var(--color-text-muted);margin-top:12px;padding:12px;background:var(--color-surface-2);border-radius:8px;">
          <strong>Note:</strong> Translation is provided as a text file. Formatting (fonts, images, layout) from the original PDF is not preserved. For best results, import the text into a word processor.
        </p>`;
      document.getElementById('btn-dl-translation').onclick = () => {
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

  async extractAllText() {
    const pdfjsLib = window['pdfjs-dist/build/pdf'] || window.pdfjsLib;
    const ab = await this.state.file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: ab }).promise;
    const parts = [];
    for (let p = 1; p <= pdf.numPages; p++) {
      const page = await pdf.getPage(p);
      const tc = await page.getTextContent();
      const pageText = tc.items.map(i => i.str).join(' ');
      parts.push(`--- Page ${p} ---\n${pageText}`);
    }
    return parts.join('\n\n');
  },

  async startTranslation() {
    const { state, els } = this;
    if (!state.file) return;
    const targetLang = document.getElementById('translate-lang-select')?.value || 'es';
    const targetName = this.LANGUAGES.find(l => l.code === targetLang)?.name || targetLang;

    state.phase = 'translating';
    if (els.btnConvert) { els.btnConvert.disabled = true; els.btnConvert.innerHTML = '<span>Translating...</span>'; }
    this.setProgress(5, 'Extracting text from PDF...');

    try {
      const text = await this.extractAllText();
      if (!text.trim()) throw new Error('No text found in this PDF. It may be a scanned/image PDF — try OCR first.');

      this.setProgress(30, `Sending to translation API (${targetName})...`);

      // Split text into chunks if too long (API limit ~30k chars per request)
      const CHUNK_SIZE = 25000;
      const chunks = [];
      for (let i = 0; i < text.length; i += CHUNK_SIZE) chunks.push(text.slice(i, i + CHUNK_SIZE));

      let translatedParts = [];
      for (let i = 0; i < chunks.length; i++) {
        const progress = 30 + Math.round(((i + 1) / chunks.length) * 60);
        this.setProgress(progress, `Translating chunk ${i+1} of ${chunks.length}...`);

        let translatedChunk = null;
        try {
          const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              message: `Translate the following text to ${targetName}. Preserve paragraph structure and page markers. Return ONLY the translated text, no explanations:\n\n${chunks[i]}`
            })
          });

          if (response.ok) {
            const data = await response.json();
            translatedChunk = data.response || data.text || data.message || '';
          }
        } catch (serverErr) {
          console.warn('/api/chat failed, attempting client-side Groq call:', serverErr);
        }

        // Direct Groq fallback if user saved key
        if (!translatedChunk) {
          const localGroqKey = localStorage.getItem('zap_groq_api_key');
          if (localGroqKey) {
            const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${localGroqKey.trim()}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                model: 'llama-3.3-70b-versatile',
                messages: [
                  { role: 'system', content: `Translate text accurately to ${targetName}. Preserve paragraph structure and page numbers. Output ONLY the translated text, no preamble or commentary.` },
                  { role: 'user', content: chunks[i] }
                ],
                temperature: 0.3,
                max_tokens: 3000
              })
            });
            if (groqRes.ok) {
              const groqData = await groqRes.json();
              translatedChunk = groqData.choices && groqData.choices[0] && groqData.choices[0].message
                ? groqData.choices[0].message.content
                : null;
            }
          }
        }

        if (!translatedChunk) {
          throw new Error('Translation requires an active GROQ_API_KEY (from https://console.groq.com/keys) or GEMINI_API_KEY.');
        }

        translatedParts.push(translatedChunk);
      }

      const fullTranslation = translatedParts.join('\n\n');
      this.setProgress(95, 'Generating output file...');

      const blob = new Blob([fullTranslation], { type: 'text/plain;charset=utf-8' });
      state.resultBlob = blob;
      this.setProgress(100, 'Translation complete!');

      setTimeout(() => {
        state.phase = 'done';
        this.render();
        if (window.confetti) confetti({ particleCount: 80, spread: 60, origin: { y: 0.7 } });
      }, 400);

    } catch (err) {
      console.error('Translate PDF failed:', err);
      const msg = err.message.includes('API error') || err.message.includes('fetch')
        ? 'Translation requires a Groq API key (from https://console.groq.com/keys). Please set GROQ_API_KEY in your deployment environment or paste it in ZapBot.'
        : err.message;
      alert('Translation failed: ' + msg);
      state.phase = 'selected';
      if (els.btnConvert) { els.btnConvert.disabled = false; els.btnConvert.innerHTML = '<span>Translate PDF</span>'; }
      if (els.progressContainer) els.progressContainer.classList.add('hidden');
    }
  }
};

document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('upload-zone')) ZapTranslatePDF.init();
});
