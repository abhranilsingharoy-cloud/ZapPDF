// pdf-to-jpg.js - Convert PDF pages into high-resolution JPG images with JSZip packaging

window.ZapPdfToJpg = {
    state: {
        file: null,
        phase: 'idle',
        results: [], // { name, blob, dataUrl }
        zipBlob: null,
        scale: 2.0,
        quality: 0.92
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

        this.injectOptions();
        this.bindEvents();
    },

    injectOptions() {
        if (document.getElementById('pdf-to-jpg-options')) return;
        const controls = this.els.controls;
        if (!controls) return;

        const optDiv = document.createElement('div');
        optDiv.id = 'pdf-to-jpg-options';
        optDiv.style.cssText = 'margin-bottom: 24px;';
        optDiv.innerHTML = `
            <label style="display:block; font-size:13px; font-weight:600; color:var(--color-text-muted); margin-bottom:8px;">Render Image Resolution</label>
            <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap:12px;">
                <label style="display:flex; align-items:center; gap:8px; padding:12px; background:var(--color-surface-2); border:1px solid var(--color-border); border-radius:8px; cursor:pointer;">
                    <input type="radio" name="jpg-quality" value="high" checked>
                    <div>
                        <div style="font-weight:600; font-size:13px;">High Quality (300 DPI)</div>
                        <div style="font-size:11px; color:var(--color-text-muted);">2x scale, 92% JPEG quality</div>
                    </div>
                </label>
                <label style="display:flex; align-items:center; gap:8px; padding:12px; background:var(--color-surface-2); border:1px solid var(--color-border); border-radius:8px; cursor:pointer;">
                    <input type="radio" name="jpg-quality" value="medium">
                    <div>
                        <div style="font-weight:600; font-size:13px;">Standard (150 DPI)</div>
                        <div style="font-size:11px; color:var(--color-text-muted);">1.5x scale, 82% quality</div>
                    </div>
                </label>
                <label style="display:flex; align-items:center; gap:8px; padding:12px; background:var(--color-surface-2); border:1px solid var(--color-border); border-radius:8px; cursor:pointer;">
                    <input type="radio" name="jpg-quality" value="compact">
                    <div>
                        <div style="font-weight:600; font-size:13px;">Web Compact (72 DPI)</div>
                        <div style="font-size:11px; color:var(--color-text-muted);">1x scale, 75% quality</div>
                    </div>
                </label>
            </div>
        `;
        controls.insertBefore(optDiv, controls.firstChild);

        optDiv.querySelectorAll('input[name="jpg-quality"]').forEach(r => {
            r.addEventListener('change', e => {
                if (e.target.value === 'high') { this.state.scale = 2.0; this.state.quality = 0.92; }
                else if (e.target.value === 'medium') { this.state.scale = 1.5; this.state.quality = 0.82; }
                else { this.state.scale = 1.0; this.state.quality = 0.75; }
            });
        });
    },

    bindEvents() {
        const { els } = this;
        if (!els.uploadZone) return;

        if (els.fileInput) els.fileInput.setAttribute('accept', '.pdf,application/pdf');

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
                this.state = { file: null, phase: 'idle', results: [], zipBlob: null, scale: 2.0, quality: 0.92 };
                if (els.fileInput) els.fileInput.value = '';
                this.render();
            });
        }

        if (els.btnConvert) {
            els.btnConvert.addEventListener('click', () => this.startConversion());
        }
    },

    handleFiles(fileList) {
        const files = Array.from(fileList).filter(f => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf'));
        if (files.length === 0) {
            alert('Please select a valid PDF file.');
            return;
        }
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
            if (els.fileCountText) els.fileCountText.textContent = '1 PDF selected for conversion to JPG';
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
                if (els.btnConvertText) els.btnConvertText.textContent = 'Convert to JPG';
            }
        }

        if (state.phase === 'done' && state.results.length > 0) {
            const isSingle = state.results.length === 1;
            const baseName = state.file.name.replace(/\.pdf$/i, '');

            let topBanner = '';
            if (!isSingle && state.zipBlob) {
                topBanner = `
                    <div style="background:var(--color-surface-2); border:1px solid var(--color-border); border-radius:12px; padding:20px; margin-bottom:20px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:16px;">
                        <div>
                            <div style="font-size:16px; font-weight:700;">${baseName}_images.zip</div>
                            <div style="font-size:13px; color:var(--color-text-muted);">${state.results.length} pages converted (${this.formatBytes(state.zipBlob.size)})</div>
                        </div>
                        <button class="btn btn-primary" id="btn-dl-all-zip">📦 Download All as ZIP</button>
                    </div>
                `;
            }

            const cardsHtml = state.results.map((r, i) => `
                <div style="background:var(--color-surface-2); border:1px solid var(--color-border); border-radius:8px; overflow:hidden; display:flex; flex-direction:column;">
                    <div style="height:140px; display:flex; align-items:center; justify-content:center; background:rgba(0,0,0,0.04); overflow:hidden;">
                        <img src="${r.dataUrl}" style="max-width:100%; max-height:100%; object-fit:contain;">
                    </div>
                    <div style="padding:10px; display:flex; justify-content:space-between; align-items:center;">
                        <div>
                            <div style="font-weight:600; font-size:12px;">${r.name}</div>
                            <div style="font-size:11px; color:var(--color-text-muted);">${this.formatBytes(r.blob.size)}</div>
                        </div>
                        <button class="btn btn-primary btn-sm" onclick="ZapPdfToJpg.downloadSingle(${i})">Download</button>
                    </div>
                </div>
            `).join('');

            if (els.resultsList) {
                els.resultsList.innerHTML = `
                    ${topBanner}
                    <div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap:16px; margin-bottom:20px;">
                        ${cardsHtml}
                    </div>
                    <button class="btn btn-outline" onclick="location.reload()">Convert Another PDF</button>
                `;

                if (document.getElementById('btn-dl-all-zip')) {
                    document.getElementById('btn-dl-all-zip').onclick = () => {
                        const a = document.createElement('a');
                        a.href = URL.createObjectURL(state.zipBlob);
                        a.download = `${baseName}_images.zip`;
                        a.click();
                    };
                }
            }
        }
    },

    downloadSingle(index) {
        const item = this.state.results[index];
        const a = document.createElement('a');
        a.href = URL.createObjectURL(item.blob);
        a.download = item.name;
        a.click();
    },

    updateProgress(pct, msg) {
        const { els } = this;
        if (els.progressContainer) els.progressContainer.classList.remove('hidden');
        if (els.progressFill) els.progressFill.style.width = pct + '%';
        if (els.progressText && msg) els.progressText.textContent = msg;
    },

    async startConversion() {
        const { state, els } = this;
        if (!state.file) return;

        state.phase = 'converting';
        state.results = [];
        state.zipBlob = null;
        if (els.btnConvert) {
            els.btnConvert.disabled = true;
            if (els.btnConvertText) els.btnConvertText.textContent = 'Rendering Pages...';
        }

        this.updateProgress(5, 'Loading PDF document...');

        try {
            const pdfjsLib = window['pdfjs-dist/build/pdf'] || window.pdfjsLib;
            if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
                pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
            }

            const arrayBuffer = await state.file.arrayBuffer();
            const pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            const numPages = pdfDoc.numPages;
            const baseName = state.file.name.replace(/\.pdf$/i, '');

            for (let p = 1; p <= numPages; p++) {
                this.updateProgress(10 + Math.round((p / numPages) * 75), `Rendering page ${p} of ${numPages} to high-res JPG...`);
                const page = await pdfDoc.getPage(p);
                const viewport = page.getViewport({ scale: state.scale });

                const canvas = document.createElement('canvas');
                canvas.width = viewport.width;
                canvas.height = viewport.height;
                const ctx = canvas.getContext('2d');

                // White background for transparent pages
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, canvas.width, canvas.height);

                await page.render({ canvasContext: ctx, viewport: viewport }).promise;

                const dataUrl = canvas.toDataURL('image/jpeg', state.quality);
                const bin = atob(dataUrl.split(',')[1]);
                const bytes = new Uint8Array(bin.length);
                for (let k = 0; k < bin.length; k++) bytes[k] = bin.charCodeAt(k);
                const blob = new Blob([bytes], { type: 'image/jpeg' });

                state.results.push({
                    name: `${baseName}_page_${p}.jpg`,
                    blob,
                    dataUrl
                });
            }

            // If multiple pages and JSZip is available, package into zip
            if (numPages > 1 && window.JSZip) {
                this.updateProgress(90, 'Packaging pages into ZIP archive...');
                const zip = new JSZip();
                for (const r of state.results) {
                    zip.file(r.name, r.blob);
                }
                state.zipBlob = await zip.generateAsync({ type: 'blob' });
            }

            this.updateProgress(100, 'Done!');
            setTimeout(() => {
                state.phase = 'done';
                this.render();
                if (window.confetti) confetti({ particleCount: 120, spread: 70, origin: { y: 0.8 } });
            }, 400);

        } catch (err) {
            console.error('PDF to JPG error:', err);
            alert(`Conversion Error: ${err.message}`);
            state.phase = 'selected';
            if (els.btnConvert) {
                els.btnConvert.disabled = false;
                if (els.btnConvertText) els.btnConvertText.textContent = 'Retry Conversion';
            }
            if (els.progressContainer) els.progressContainer.classList.add('hidden');
        }
    }
};

document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('upload-zone') && document.getElementById('btn-convert')) {
        ZapPdfToJpg.init();
    }
});
