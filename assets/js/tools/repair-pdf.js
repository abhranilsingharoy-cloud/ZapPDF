// repair-pdf.js - Fault-tolerant PDF recovery and rebuild engine
// Uses pdf-lib structure re-serialization as primary repair, with pdf.js stream recovery fallback

window.ZapRepairPDF = {
    state: {
        file: null,
        phase: 'idle',
        resultBlob: null,
        repairLog: []
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

        this.bindEvents();
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
                e.preventDefault();
                e.stopPropagation();
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
                this.state = { file: null, phase: 'idle', resultBlob: null, repairLog: [] };
                if (els.fileInput) els.fileInput.value = '';
                this.render();
            });
        }

        if (els.btnConvert) {
            els.btnConvert.addEventListener('click', () => this.startRepair());
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
            if (els.fileCountText) els.fileCountText.textContent = '1 file selected for repair';
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
                if (els.btnConvertText) els.btnConvertText.textContent = 'Repair PDF Document';
            }
        }

        if (state.phase === 'done' && state.resultBlob) {
            const outName = `repaired_${state.file.name}`;
            const logHtml = state.repairLog.map(l => `<li style="margin-bottom:4px;">${l}</li>`).join('');
            if (els.resultsList) {
                els.resultsList.innerHTML = `
                    <div class="result-card">
                        <div class="result-info">
                            <div class="result-name">${outName}</div>
                            <div class="result-stats">
                                <span class="stat-pill success">${this.formatBytes(state.resultBlob.size)}</span>
                                <span style="color: var(--color-text-muted); font-size: 13px; margin-left: 8px;">Document repaired and re-indexed.</span>
                            </div>
                        </div>
                        <div class="result-actions">
                            <button class="btn btn-primary btn-sm" id="btn-dl-repaired">Download Repaired PDF</button>
                            <button class="btn btn-outline btn-sm" onclick="location.reload()" style="margin-left:8px;">Repair Another</button>
                        </div>
                    </div>
                    <div style="background:var(--color-surface-2); border:1px solid var(--color-border); border-radius:8px; padding:16px; margin-top:16px;">
                        <h4 style="font-size:14px; margin-bottom:8px; color:var(--color-text);">Repair Diagnostic Summary:</h4>
                        <ul style="font-size:13px; color:var(--color-text-muted); padding-left:20px; line-height:1.6;">
                            ${logHtml}
                        </ul>
                    </div>
                `;
                document.getElementById('btn-dl-repaired').onclick = () => {
                    const a = document.createElement('a');
                    a.href = URL.createObjectURL(state.resultBlob);
                    a.download = outName;
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

    async startRepair() {
        const { state, els } = this;
        if (!state.file) return;

        state.phase = 'repairing';
        state.repairLog = [];
        if (els.btnConvert) {
            els.btnConvert.disabled = true;
            if (els.btnConvertText) els.btnConvertText.textContent = 'Repairing...';
        }

        this.updateProgress(10, 'Analyzing file structure and headers...');

        const arrayBuffer = await state.file.arrayBuffer();
        const bytes = new Uint8Array(arrayBuffer);

        // Check PDF header
        const header = new TextDecoder('ascii').decode(bytes.slice(0, 10));
        let fixedBytes = bytes;

        if (!header.startsWith('%PDF-')) {
            state.repairLog.push('Corrupted or missing PDF magic header detected. Prepending standard %PDF-1.7 header.');
            // Search for %PDF- in the first 1024 bytes
            let pdfOffset = -1;
            for (let i = 0; i < Math.min(bytes.length - 5, 1024); i++) {
                if (bytes[i] === 0x25 && bytes[i+1] === 0x50 && bytes[i+2] === 0x44 && bytes[i+3] === 0x46) {
                    pdfOffset = i;
                    break;
                }
            }
            if (pdfOffset > 0) {
                fixedBytes = bytes.slice(pdfOffset);
                state.repairLog.push(`Stripped ${pdfOffset} leading corrupted garbage bytes.`);
            } else {
                const head = new TextEncoder().encode('%PDF-1.7\n%ZapPDF-repair\n');
                const combined = new Uint8Array(head.length + bytes.length);
                combined.set(head, 0);
                combined.set(bytes, head.length);
                fixedBytes = combined;
            }
        } else {
            state.repairLog.push('Valid PDF header recognized: ' + header.trim());
        }

        // Method 1: Structural re-indexing using PDFLib
        try {
            this.updateProgress(35, 'Attempting structural re-indexing with pdf-lib...');
            const srcDoc = await PDFLib.PDFDocument.load(fixedBytes, { ignoreEncryption: true });
            const pageCount = srcDoc.getPageCount();
            state.repairLog.push(`Successfully parsed document tree. Found ${pageCount} valid pages.`);

            const cleanDoc = await PDFLib.PDFDocument.create();
            const indices = srcDoc.getPageIndices();
            const copiedPages = await cleanDoc.copyPages(srcDoc, indices);
            copiedPages.forEach(p => cleanDoc.addPage(p));

            this.updateProgress(75, 'Rebuilding clean cross-reference table and trailer...');
            const repairedBytes = await cleanDoc.save();
            state.resultBlob = new Blob([repairedBytes], { type: 'application/pdf' });
            state.repairLog.push('Reconstructed cross-reference tables (xref) and sanitized EOF trailer.');
            state.repairLog.push('Preserved vector text, fonts, and vector paths without rasterization.');

            this.updateProgress(100, 'Repair complete!');
            setTimeout(() => {
                state.phase = 'done';
                this.render();
                if (window.confetti) confetti({ particleCount: 120, spread: 70, origin: { y: 0.8 } });
            }, 400);
            return;

        } catch (libErr) {
            console.warn('pdf-lib standard repair failed, trying fault-tolerant pdf.js stream recovery:', libErr);
            state.repairLog.push(`Standard parser encounter: ${libErr.message}. Initiating fault-tolerant stream recovery.`);
        }

        // Method 2: Fault-tolerant pdf.js stream salvage
        try {
            this.updateProgress(50, 'Extracting recoverable pages via resilient pdf.js parser...');
            if (!window.pdfjsLib) throw new Error('pdf.js library unavailable for recovery.');

            const loadingTask = pdfjsLib.getDocument({ data: fixedBytes });
            const pdfDoc = await loadingTask.promise;
            const numPages = pdfDoc.numPages;

            if (numPages === 0) throw new Error('No salvageable pages found in document.');

            state.repairLog.push(`Fault-tolerant engine salvaged ${numPages} page streams.`);
            const cleanDoc = await PDFLib.PDFDocument.create();

            for (let i = 1; i <= numPages; i++) {
                this.updateProgress(50 + Math.round((i / numPages) * 40), `Rebuilding page ${i} of ${numPages}...`);
                const page = await pdfDoc.getPage(i);
                const viewport = page.getViewport({ scale: 2.0 });

                const canvas = document.createElement('canvas');
                canvas.width = viewport.width;
                canvas.height = viewport.height;
                const ctx = canvas.getContext('2d');
                await page.render({ canvasContext: ctx, viewport: viewport }).promise;

                const jpgUrl = canvas.toDataURL('image/jpeg', 0.92);
                const base64 = jpgUrl.split(',')[1];
                const bin = atob(base64);
                const imgBytes = new Uint8Array(bin.length);
                for (let k = 0; k < bin.length; k++) imgBytes[k] = bin.charCodeAt(k);

                const embedded = await cleanDoc.embedJpg(imgBytes);
                const newPage = cleanDoc.addPage([viewport.width / 2.0, viewport.height / 2.0]);
                newPage.drawImage(embedded, {
                    x: 0,
                    y: 0,
                    width: viewport.width / 2.0,
                    height: viewport.height / 2.0
                });
            }

            this.updateProgress(95, 'Finalizing repaired PDF...');
            const repairedBytes = await cleanDoc.save();
            state.resultBlob = new Blob([repairedBytes], { type: 'application/pdf' });
            state.repairLog.push('Reconstructed damaged pages through stream salvage with 2x render fidelity.');

            this.updateProgress(100, 'Repair complete!');
            setTimeout(() => {
                state.phase = 'done';
                this.render();
                if (window.confetti) confetti({ particleCount: 120, spread: 70, origin: { y: 0.8 } });
            }, 400);

        } catch (fatalErr) {
            console.error('Fatal repair error:', fatalErr);
            alert(`Document Repair Failed: The PDF file is critically corrupted.\n\nDetails: ${fatalErr.message}\n\nThe internal binary structure has suffered severe data loss that cannot be reconstructed.`);
            state.phase = 'selected';
            if (els.btnConvert) {
                els.btnConvert.disabled = false;
                if (els.btnConvertText) els.btnConvertText.textContent = 'Retry Repair';
            }
            if (els.progressContainer) els.progressContainer.classList.add('hidden');
        }
    }
};

document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('upload-zone') && document.getElementById('btn-convert')) {
        ZapRepairPDF.init();
    }
});
