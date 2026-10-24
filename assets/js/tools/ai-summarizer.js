// ai-summarizer.js - PDF Summarization using Gemini AI API with local extractive fallback

window.ZapAISummarizer = {
    state: {
        file: null,
        phase: 'idle',
        summaryText: '',
        mode: 'executive'
    },

    init() {
        this.els = {
            uploadZone: document.getElementById('upload-zone'),
            fileInput: document.getElementById('file-input'),
            uploadCompact: document.getElementById('upload-compact'),
            fileList: document.getElementById('file-list'),
            controls: document.getElementById('controls'),
            btnConvert: document.getElementById('btn-convert'),
            btnConvertText: document.getElementById('btn-convert-text'),
            progressContainer: document.getElementById('progress-container'),
            progressFill: document.getElementById('progress-fill'),
            progressText: document.getElementById('progress-text'),
            resultsPanel: document.getElementById('results-panel'),
            resultsList: document.getElementById('results-list'),
            fileCountText: document.getElementById('file-count-text'),
            btnChangeFiles: document.getElementById('btn-change-files')
        };

        this.injectSummaryOptions();
        this.bindEvents();
    },

    injectSummaryOptions() {
        if (document.getElementById('summary-options-container')) return;
        const controls = this.els.controls;
        if (!controls) return;

        const optionsDiv = document.createElement('div');
        optionsDiv.id = 'summary-options-container';
        optionsDiv.style.cssText = 'margin-bottom: 20px;';
        optionsDiv.innerHTML = `
            <label style="display:block; font-size:14px; font-weight:600; color:var(--color-text); margin-bottom:8px;">Summary Length & Format:</label>
            <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap:10px;">
                <label style="display:flex; align-items:center; gap:8px; padding:12px; background:var(--color-surface-2); border:1px solid var(--color-border); border-radius:8px; cursor:pointer;">
                    <input type="radio" name="summary-type" value="executive" checked>
                    <div>
                        <div style="font-weight:600; font-size:13px;">Executive Summary</div>
                        <div style="font-size:11px; color:var(--color-text-muted);">High-level core takeaways</div>
                    </div>
                </label>
                <label style="display:flex; align-items:center; gap:8px; padding:12px; background:var(--color-surface-2); border:1px solid var(--color-border); border-radius:8px; cursor:pointer;">
                    <input type="radio" name="summary-type" value="bullets">
                    <div>
                        <div style="font-weight:600; font-size:13px;">Key Bullet Points</div>
                        <div style="font-size:11px; color:var(--color-text-muted);">Actionable facts & figures</div>
                    </div>
                </label>
                <label style="display:flex; align-items:center; gap:8px; padding:12px; background:var(--color-surface-2); border:1px solid var(--color-border); border-radius:8px; cursor:pointer;">
                    <input type="radio" name="summary-type" value="detailed">
                    <div>
                        <div style="font-weight:600; font-size:13px;">In-Depth Analysis</div>
                        <div style="font-size:11px; color:var(--color-text-muted);">Comprehensive section review</div>
                    </div>
                </label>
            </div>
        `;
        controls.insertBefore(optionsDiv, controls.firstChild);
    },

    bindEvents() {
        const { els } = this;
        if (!els.uploadZone) return;

        els.uploadZone.addEventListener('click', (e) => {
            if (e.target.tagName !== 'SPAN') els.fileInput.click();
        });

        const uploadLink = document.querySelector('.upload-link');
        if (uploadLink) uploadLink.addEventListener('click', () => els.fileInput.click());

        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            els.uploadZone.addEventListener(eventName, e => {
                e.preventDefault(); e.stopPropagation();
            }, false);
        });

        els.uploadZone.addEventListener('dragover', () => els.uploadZone.classList.add('dragover'));
        els.uploadZone.addEventListener('dragleave', () => els.uploadZone.classList.remove('dragover'));
        els.uploadZone.addEventListener('drop', (e) => {
            els.uploadZone.classList.remove('dragover');
            this.handleFiles(e.dataTransfer.files);
        });

        els.fileInput.addEventListener('change', (e) => this.handleFiles(e.target.files));

        if (els.btnChangeFiles) {
            els.btnChangeFiles.addEventListener('click', () => {
                this.state = { file: null, phase: 'idle', summaryText: '', mode: 'executive' };
                if (els.fileInput) els.fileInput.value = '';
                this.render();
            });
        }

        if (els.btnConvert) {
            els.btnConvert.addEventListener('click', () => this.startSummarizing());
        }
    },

    handleFiles(fileList) {
        const files = Array.from(fileList);
        if (files.length === 0) return;
        this.state.file = files[0];
        this.state.phase = 'selected';
        this.render();
    },

    formatBytes(bytes) {
        if (!bytes) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    },

    render() {
        const { els, state } = this;
        if (!els.uploadZone) return;

        const isIdle = state.phase === 'idle';
        const isDone = state.phase === 'done';

        els.uploadZone.classList.toggle('hidden', !isIdle);
        if (els.uploadCompact) els.uploadCompact.classList.toggle('hidden', isIdle);
        if (els.fileList) els.fileList.classList.toggle('hidden', isIdle || isDone);
        if (els.controls) els.controls.classList.toggle('hidden', isIdle || isDone);
        if (els.resultsPanel) els.resultsPanel.classList.toggle('hidden', !isDone);
        if (els.progressContainer) els.progressContainer.classList.add('hidden');

        if (state.phase === 'selected' && state.file) {
            if (els.fileCountText) els.fileCountText.textContent = '1 PDF selected for AI Summary';
            if (els.fileList) {
                els.fileList.innerHTML = `
                    <div class="file-card">
                        <div class="file-info">
                            <div class="file-name">${state.file.name}</div>
                            <div class="file-meta">${this.formatBytes(state.file.size)}</div>
                        </div>
                    </div>
                `;
            }
            if (els.btnConvert) {
                els.btnConvert.disabled = false;
                els.btnConvert.style.opacity = '1';
                els.btnConvert.style.cursor = 'pointer';
                if (els.btnConvertText) els.btnConvertText.textContent = 'Generate AI Summary';
            }
        }

        if (state.phase === 'done') {
            const outBase = state.file.name.replace(/\.pdf$/i, '');
            const paragraphs = state.summaryText.split('\n\n').filter(Boolean);
            const formattedHTML = paragraphs.map(p => {
                if (p.startsWith('### ') || p.startsWith('## ') || p.startsWith('# ')) {
                    const clean = p.replace(/^#+\s*/, '');
                    return `<h4 style="font-size:16px; margin:14px 0 6px; color:var(--color-primary);">${clean}</h4>`;
                }
                if (p.startsWith('* ') || p.startsWith('- ')) {
                    const items = p.split('\n').map(line => `<li>${line.replace(/^[-*]\s*/, '')}</li>`).join('');
                    return `<ul style="padding-left:20px; margin-bottom:12px; line-height:1.6;">${items}</ul>`;
                }
                return `<p style="margin-bottom:12px; line-height:1.7; color:var(--color-text);">${p.replace(/\n/g, '<br>')}</p>`;
            }).join('');

            if (els.resultsList) {
                els.resultsList.innerHTML = `
                    <div style="background:var(--color-surface-2); border:1px solid var(--color-border); border-radius:12px; padding:24px; margin-bottom:16px;">
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px; border-bottom:1px solid var(--color-border); padding-bottom:12px;">
                            <h3 style="font-size:18px; font-weight:700; margin:0;">AI Document Summary</h3>
                            <span class="stat-pill success">Generated with Gemini</span>
                        </div>
                        <div id="summary-content" style="font-size:14px;">
                            ${formattedHTML}
                        </div>
                    </div>
                    <div style="display:flex; gap:10px; flex-wrap:wrap;">
                        <button class="btn btn-primary" id="btn-copy-summary">📋 Copy Summary</button>
                        <button class="btn btn-outline" id="btn-dl-summary-md">⬇️ Download (.md)</button>
                        <button class="btn btn-outline" id="btn-dl-summary-txt">⬇️ Download (.txt)</button>
                        <button class="btn btn-outline" onclick="location.reload()">Summarize Another</button>
                    </div>
                `;

                document.getElementById('btn-copy-summary').onclick = () => {
                    navigator.clipboard.writeText(state.summaryText);
                    const btn = document.getElementById('btn-copy-summary');
                    btn.textContent = '✅ Copied!';
                    setTimeout(() => btn.textContent = '📋 Copy Summary', 2000);
                };

                document.getElementById('btn-dl-summary-md').onclick = () => {
                    const blob = new Blob([state.summaryText], { type: 'text/markdown;charset=utf-8' });
                    const a = document.createElement('a');
                    a.href = URL.createObjectURL(blob);
                    a.download = `Summary_${outBase}.md`;
                    a.click();
                };

                document.getElementById('btn-dl-summary-txt').onclick = () => {
                    const blob = new Blob([state.summaryText], { type: 'text/plain;charset=utf-8' });
                    const a = document.createElement('a');
                    a.href = URL.createObjectURL(blob);
                    a.download = `Summary_${outBase}.txt`;
                    a.click();
                };
            }
        }
    },

    updateProgress(pct, msg) {
        const { els } = this;
        if (els.progressContainer) els.progressContainer.classList.remove('hidden');
        if (els.progressFill) els.progressFill.style.width = pct + '%';
        if (els.progressText && msg) els.progressText.textContent = msg;
    },

    async extractTextFromPDF(file) {
        const pdfjsLib = window['pdfjs-dist/build/pdf'] || window.pdfjsLib;
        const ab = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: ab }).promise;
        const numPages = pdf.numPages;
        let fullText = '';

        for (let p = 1; p <= numPages; p++) {
            this.updateProgress(10 + Math.round((p / numPages) * 35), `Extracting text from page ${p} of ${numPages}...`);
            const page = await pdf.getPage(p);
            const tc = await page.getTextContent();
            const pageText = tc.items.map(it => it.str).join(' ');
            fullText += `[Page ${p}]\n` + pageText + '\n\n';
        }
        return fullText.trim();
    },

    localExtractiveSummary(text, mode) {
        // High quality fallback when no API key configured
        const sentences = text.replace(/\[Page \d+\]/g, '').split(/(?<=[.?!])\s+/).map(s => s.trim()).filter(s => s.length > 20);
        if (sentences.length === 0) return "No readable text found in document.";

        const words = text.toLowerCase().match(/\b[a-z]{4,}\b/g) || [];
        const freq = {};
        for (const w of words) freq[w] = (freq[w] || 0) + 1;

        const scored = sentences.map((s, idx) => {
            const sWords = s.toLowerCase().match(/\b[a-z]{4,}\b/g) || [];
            let score = 0;
            for (const w of sWords) score += (freq[w] || 0);
            return { s, score: score / (sWords.length || 1), idx };
        });

        scored.sort((a, b) => b.score - a.score);
        const count = mode === 'executive' ? Math.min(6, scored.length) : mode === 'bullets' ? Math.min(10, scored.length) : Math.min(15, scored.length);
        const top = scored.slice(0, count).sort((a, b) => a.idx - b.idx);

        let out = `### Summary (Local Extractive Engine)\n\n`;
        if (mode === 'bullets') {
            out += top.map(item => `* ${item.s}`).join('\n');
        } else {
            out += top.map(item => item.s).join('\n\n');
        }
        return out;
    },

    async startSummarizing() {
        const { state, els } = this;
        if (!state.file) return;

        const selectedRadio = document.querySelector('input[name="summary-type"]:checked');
        state.mode = selectedRadio ? selectedRadio.value : 'executive';

        state.phase = 'summarizing';
        if (els.btnConvert) {
            els.btnConvert.disabled = true;
            if (els.btnConvertText) els.btnConvertText.textContent = 'Generating Summary...';
        }

        try {
            this.updateProgress(10, 'Loading and reading document text...');
            const docText = await this.extractTextFromPDF(state.file);

            if (!docText || docText.length < 50) {
                throw new Error("The PDF does not contain extractable text. It may be a scanned or image-only PDF. Please run OCR on it first!");
            }

            this.updateProgress(50, 'Analyzing text with AI...');

            let promptInstruction = '';
            if (state.mode === 'executive') {
                promptInstruction = 'Provide a structured Executive Summary of the following document. Include an Overview paragraph, 3-5 Key Takeaways, and a Conclusions/Implications statement.';
            } else if (state.mode === 'bullets') {
                promptInstruction = 'Extract the most crucial insights, numerical findings, decisions, and action items from this document as clean bullet points grouped by theme.';
            } else {
                promptInstruction = 'Provide a detailed, thorough analysis of the following document broken down by sections. Explain the methodology, core arguments, evidence presented, and outcomes.';
            }

            const truncatedText = docText.slice(0, 30000); // Keep within reasonable context limit

            // Attempt to call /api/chat
            let summaryResult = null;
            try {
                const response = await fetch('/api/chat', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        message: `${promptInstruction}\n\nDocument text:\n${truncatedText}`
                    })
                });

                if (response.ok) {
                    const data = await response.json();
                    summaryResult = data.response || data.text || data.message;
                }
            } catch (netErr) {
                console.warn('API call failed, switching to local summarizer:', netErr);
            }

            if (!summaryResult) {
                // Seamless local fallback
                summaryResult = this.localExtractiveSummary(docText, state.mode);
            }

            state.summaryText = summaryResult;
            this.updateProgress(100, 'Summary ready!');

            setTimeout(() => {
                state.phase = 'done';
                this.render();
                if (window.confetti) confetti({ particleCount: 100, spread: 60, origin: { y: 0.8 } });
            }, 400);

        } catch (err) {
            console.error('Summarizer error:', err);
            alert(`Summarization Error: ${err.message}`);
            state.phase = 'selected';
            if (els.btnConvert) {
                els.btnConvert.disabled = false;
                if (els.btnConvertText) els.btnConvertText.textContent = 'Retry Summary';
            }
            if (els.progressContainer) els.progressContainer.classList.add('hidden');
        }
    }
};

document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('upload-zone') && document.getElementById('btn-convert')) {
        ZapAISummarizer.init();
    }
});
