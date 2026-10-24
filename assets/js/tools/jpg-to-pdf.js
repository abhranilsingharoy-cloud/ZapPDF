// jpg-to-pdf.js - Convert JPG, PNG, and WebP images into a single clean PDF with custom page geometry

window.ZapJpgToPdf = {
    state: {
        images: [], // { file, name, dataUrl, width, height }
        phase: 'idle',
        resultBlob: null,
        pageSize: 'fit', // fit, a4, letter
        orientation: 'auto', // auto, portrait, landscape
        margin: 0 // 0, 20, 40
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
        if (document.getElementById('jpg-to-pdf-options')) return;
        const controls = this.els.controls;
        if (!controls) return;

        const optDiv = document.createElement('div');
        optDiv.id = 'jpg-to-pdf-options';
        optDiv.style.cssText = 'margin-bottom: 24px; display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 16px;';
        optDiv.innerHTML = `
            <div>
                <label style="display:block; font-size:13px; font-weight:600; color:var(--color-text-muted); margin-bottom:6px;">Page Size</label>
                <select id="opt-page-size" style="width:100%; padding:10px 12px; border-radius:8px; border:1px solid var(--color-border); background:var(--color-surface-2); color:var(--color-text); font-size:14px;">
                    <option value="fit" selected>Fit to Image Dimensions</option>
                    <option value="a4">A4 (210 × 297 mm)</option>
                    <option value="letter">US Letter (8.5 × 11 in)</option>
                </select>
            </div>
            <div>
                <label style="display:block; font-size:13px; font-weight:600; color:var(--color-text-muted); margin-bottom:6px;">Page Orientation</label>
                <select id="opt-orientation" style="width:100%; padding:10px 12px; border-radius:8px; border:1px solid var(--color-border); background:var(--color-surface-2); color:var(--color-text); font-size:14px;">
                    <option value="auto" selected>Auto (Match Image)</option>
                    <option value="portrait">Portrait</option>
                    <option value="landscape">Landscape</option>
                </select>
            </div>
            <div>
                <label style="display:block; font-size:13px; font-weight:600; color:var(--color-text-muted); margin-bottom:6px;">Page Margin</label>
                <select id="opt-margin" style="width:100%; padding:10px 12px; border-radius:8px; border:1px solid var(--color-border); background:var(--color-surface-2); color:var(--color-text); font-size:14px;">
                    <option value="0" selected>No Margin (Full Bleed)</option>
                    <option value="20">Small Margin (20 pt)</option>
                    <option value="40">Large Margin (40 pt)</option>
                </select>
            </div>
        `;
        controls.insertBefore(optDiv, controls.firstChild);

        document.getElementById('opt-page-size')?.addEventListener('change', e => this.state.pageSize = e.target.value);
        document.getElementById('opt-orientation')?.addEventListener('change', e => this.state.orientation = e.target.value);
        document.getElementById('opt-margin')?.addEventListener('change', e => this.state.margin = parseInt(e.target.value));
    },

    bindEvents() {
        const { els } = this;
        if (!els.uploadZone) return;

        // Ensure file input accepts images
        if (els.fileInput) els.fileInput.setAttribute('accept', 'image/jpeg,image/png,image/webp,image/gif,image/bmp');

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
                this.state.images = [];
                this.state.phase = 'idle';
                this.state.resultBlob = null;
                if (els.fileInput) els.fileInput.value = '';
                this.render();
            });
        }

        if (els.btnConvert) {
            els.btnConvert.addEventListener('click', () => this.startConversion());
        }
    },

    async handleFiles(fileList) {
        const validFiles = Array.from(fileList).filter(f => f.type.startsWith('image/') || /\.(jpg|jpeg|png|webp|bmp)$/i.test(f.name));
        if (validFiles.length === 0) {
            alert('Please select valid image files (JPG, PNG, WebP).');
            return;
        }

        for (const file of validFiles) {
            const dataUrl = await this.readFileAsDataURL(file);
            const dims = await this.getImageDimensions(dataUrl);
            this.state.images.push({
                file,
                name: file.name,
                dataUrl,
                width: dims.width,
                height: dims.height
            });
        }

        this.state.phase = 'selected';
        this.render();
    },

    readFileAsDataURL(file) {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = e => resolve(e.target.result);
            reader.readAsDataURL(file);
        });
    },

    getImageDimensions(dataUrl) {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
            img.src = dataUrl;
        });
    },

    formatBytes(bytes) {
        if (!bytes) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    },

    removeImage(index) {
        this.state.images.splice(index, 1);
        if (this.state.images.length === 0) {
            this.state.phase = 'idle';
        }
        this.render();
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

        if (state.phase === 'selected') {
            if (els.fileCountText) els.fileCountText.textContent = `${state.images.length} image(s) selected (drag cards to reorder)`;
            
            if (els.fileList) {
                els.fileList.innerHTML = `
                    <div id="image-sortable-grid" style="display:grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap:12px; width:100%;">
                        ${state.images.map((img, i) => `
                            <div class="img-card" data-idx="${i}" style="position:relative; background:var(--color-surface-2); border:1px solid var(--color-border); border-radius:8px; overflow:hidden; cursor:grab; text-align:center;">
                                <div style="width:100%; height:110px; display:flex; align-items:center; justify-content:center; background:rgba(0,0,0,0.05); overflow:hidden;">
                                    <img src="${img.dataUrl}" style="max-width:100%; max-height:100%; object-fit:contain;">
                                </div>
                                <div style="padding:6px; font-size:11px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${img.name}">
                                    ${i+1}. ${img.name}
                                </div>
                                <button onclick="ZapJpgToPdf.removeImage(${i})" style="position:absolute; top:4px; right:4px; width:22px; height:22px; background:rgba(220,38,38,0.9); color:white; border:none; border-radius:50%; cursor:pointer; font-size:12px; line-height:1;" title="Remove image">✕</button>
                            </div>
                        `).join('')}
                    </div>
                `;

                // Wire SortableJS for reordering
                const grid = document.getElementById('image-sortable-grid');
                if (window.Sortable && grid) {
                    Sortable.create(grid, {
                        animation: 150,
                        onEnd: (evt) => {
                            const moved = this.state.images.splice(evt.oldIndex, 1)[0];
                            this.state.images.splice(evt.newIndex, 0, moved);
                            this.render();
                        }
                    });
                }
            }

            if (els.btnConvert) {
                els.btnConvert.disabled = false;
                els.btnConvert.style.opacity = '1';
                els.btnConvert.style.cursor = 'pointer';
                if (els.btnConvertText) els.btnConvertText.textContent = `Convert ${state.images.length} Image(s) to PDF`;
            }
        }

        if (state.phase === 'done' && state.resultBlob) {
            const outName = state.images.length === 1 ? state.images[0].name.replace(/\.[^.]+$/, '') + '.pdf' : 'ZapPDF_Images.pdf';
            if (els.resultsList) {
                els.resultsList.innerHTML = `
                    <div class="result-card">
                        <div class="result-info">
                            <div class="result-name">${outName}</div>
                            <div class="result-stats">
                                <span class="stat-pill success">${this.formatBytes(state.resultBlob.size)}</span>
                                <span style="color:var(--color-text-muted); font-size:13px; margin-left:8px;">${state.images.length} image(s) combined into PDF.</span>
                            </div>
                        </div>
                        <div class="result-actions">
                            <button class="btn btn-primary btn-sm" id="btn-dl-jpg-pdf">Download PDF</button>
                            <button class="btn btn-outline btn-sm" onclick="location.reload()" style="margin-left:8px;">Convert More</button>
                        </div>
                    </div>
                `;
                document.getElementById('btn-dl-jpg-pdf').onclick = () => {
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

    async startConversion() {
        const { state, els } = this;
        if (state.images.length === 0) return;

        state.phase = 'converting';
        if (els.btnConvert) {
            els.btnConvert.disabled = true;
            if (els.btnConvertText) els.btnConvertText.textContent = 'Generating PDF...';
        }

        this.updateProgress(10, 'Initializing PDF document...');

        try {
            const pdfDoc = await PDFLib.PDFDocument.create();
            const total = state.images.length;

            for (let i = 0; i < total; i++) {
                this.updateProgress(10 + Math.round((i / total) * 80), `Processing image ${i+1} of ${total}...`);
                const item = state.images[i];

                let embeddedImage;
                const isJpg = item.file.type === 'image/jpeg' || /\.(jpe?g)$/i.test(item.name);
                const isPng = item.file.type === 'image/png' || /\.png$/i.test(item.name);

                if (isJpg) {
                    const bytes = await item.file.arrayBuffer();
                    embeddedImage = await pdfDoc.embedJpg(bytes);
                } else if (isPng) {
                    const bytes = await item.file.arrayBuffer();
                    embeddedImage = await pdfDoc.embedPng(bytes);
                } else {
                    // Convert WebP/GIF/BMP to PNG via canvas
                    const canvas = document.createElement('canvas');
                    canvas.width = item.width;
                    canvas.height = item.height;
                    const ctx = canvas.getContext('2d');
                    const img = new Image();
                    await new Promise(r => { img.onload = r; img.src = item.dataUrl; });
                    ctx.drawImage(img, 0, 0);
                    const pngDataUrl = canvas.toDataURL('image/png');
                    const bin = atob(pngDataUrl.split(',')[1]);
                    const pngBytes = new Uint8Array(bin.length);
                    for (let k = 0; k < bin.length; k++) pngBytes[k] = bin.charCodeAt(k);
                    embeddedImage = await pdfDoc.embedPng(pngBytes);
                }

                // Determine page dimensions
                let pageWidth, pageHeight;
                const margin = state.margin;

                if (state.pageSize === 'a4') {
                    // A4 points: 595.28 x 841.89
                    pageWidth = 595.28;
                    pageHeight = 841.89;
                } else if (state.pageSize === 'letter') {
                    // Letter points: 612 x 792
                    pageWidth = 612;
                    pageHeight = 792;
                } else {
                    // Fit to image
                    pageWidth = item.width + (margin * 2);
                    pageHeight = item.height + (margin * 2);
                }

                // Handle orientation
                if (state.pageSize !== 'fit') {
                    const isImgLandscape = item.width > item.height;
                    if (state.orientation === 'landscape' || (state.orientation === 'auto' && isImgLandscape)) {
                        const temp = pageWidth;
                        pageWidth = Math.max(temp, pageHeight);
                        pageHeight = Math.min(temp, pageHeight);
                    } else if (state.orientation === 'portrait') {
                        const temp = pageWidth;
                        pageWidth = Math.min(temp, pageHeight);
                        pageHeight = Math.max(temp, pageHeight);
                    }
                }

                const page = pdfDoc.addPage([pageWidth, pageHeight]);

                // Calculate drawing dimensions respecting margin
                const availableWidth = pageWidth - (margin * 2);
                const availableHeight = pageHeight - (margin * 2);

                const scale = Math.min(availableWidth / item.width, availableHeight / item.height);
                const drawWidth = item.width * scale;
                const drawHeight = item.height * scale;

                const drawX = margin + (availableWidth - drawWidth) / 2;
                const drawY = margin + (availableHeight - drawHeight) / 2;

                page.drawImage(embeddedImage, {
                    x: drawX,
                    y: drawY,
                    width: drawWidth,
                    height: drawHeight
                });
            }

            this.updateProgress(95, 'Finalizing and compressing PDF...');
            const pdfBytes = await pdfDoc.save();
            state.resultBlob = new Blob([pdfBytes], { type: 'application/pdf' });

            this.updateProgress(100, 'Conversion complete!');
            setTimeout(() => {
                state.phase = 'done';
                this.render();
                if (window.confetti) confetti({ particleCount: 120, spread: 70, origin: { y: 0.8 } });
            }, 400);

        } catch (err) {
            console.error('JPG to PDF error:', err);
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
        ZapJpgToPdf.init();
    }
});
