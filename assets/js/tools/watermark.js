// watermark.js - Add Watermark to PDF

window.ZapWatermark = {
    state: {
        file: null,
        phase: 'idle', // idle, selected, stamping, done
        resultBlob: null
    },

    init() {
        this.els = {
            uploadZone: document.getElementById('upload-zone'),
            fileInput: document.getElementById('file-input'),
            uploadCompact: document.getElementById('upload-compact'),
            fileList: document.getElementById('file-list'),
            controls: document.getElementById('controls'),
            btnWatermark: document.getElementById('btn-watermark'),
            wmText: document.getElementById('wm-text'),
            wmColor: document.getElementById('wm-color'),
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
        
        els.uploadZone.addEventListener('click', (e) => {
            if (e.target.tagName !== 'SPAN') els.fileInput.click();
        });
        
        document.querySelector('.upload-link').addEventListener('click', () => els.fileInput.click());
        
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

        els.fileInput.addEventListener('change', (e) => {
            this.handleFiles(e.target.files);
        });

        els.btnChangeFiles.addEventListener('click', () => {
            this.state.file = null;
            this.state.resultBlob = null;
            this.state.phase = 'idle';
            this.render();
        });

        els.btnWatermark.addEventListener('click', () => this.startWatermark());
    },

    handleFiles(fileList) {
        const validFiles = Array.from(fileList).filter(f => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf'));
        if (validFiles.length === 0) return;
        
        this.state.file = validFiles[0];
        this.state.phase = 'selected';
        this.render();
    },

    formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    },

    render() {
        const { els, state } = this;
        
        switch(state.phase) {
            case 'idle':
                els.uploadZone.classList.remove('hidden');
                els.uploadCompact.classList.add('hidden');
                els.fileList.classList.add('hidden');
                els.controls.classList.add('hidden');
                els.resultsPanel.classList.add('hidden');
                break;
            case 'selected':
                els.uploadZone.classList.add('hidden');
                els.uploadCompact.classList.remove('hidden');
                els.fileList.classList.remove('hidden');
                els.controls.classList.remove('hidden');
                els.resultsPanel.classList.add('hidden');
                els.progressContainer.classList.add('hidden');
                
                els.fileList.innerHTML = `
                    <div class="file-card">
                        <div class="file-info">
                            <div class="file-name">${state.file.name}</div>
                            <div class="file-meta">${this.formatBytes(state.file.size)}</div>
                        </div>
                    </div>
                `;
                
                els.btnWatermark.disabled = false;
                els.btnWatermark.innerHTML = `<img src="assets/icons/lightning.svg" width="24" height="24"> <span>Apply Watermark</span>`;
                break;
            case 'stamping':
                els.btnWatermark.disabled = true;
                els.btnWatermark.innerHTML = `<img src="assets/icons/lightning.svg" class="spinner" width="24" height="24"> <span>Stamping...</span>`;
                els.progressContainer.classList.remove('hidden');
                break;
            case 'done':
                els.controls.classList.add('hidden');
                els.fileList.classList.add('hidden');
                els.resultsPanel.classList.remove('hidden');
                
                els.resultsList.innerHTML = `
                    <div class="result-card">
                        <div class="result-info">
                            <div class="result-name">ZapPDF_Watermarked.pdf</div>
                            <div class="result-stats">
                                <span class="stat-pill success">${this.formatBytes(this.state.resultBlob.size)}</span>
                                <span style="color: var(--color-text-muted); font-size: 13px; margin-left: 8px;">Watermark applied successfully.</span>
                            </div>
                        </div>
                        <div class="result-actions">
                            <button class="btn btn-primary btn-sm" onclick="ZapWatermark.downloadResult()">
                                Download PDF
                            </button>
                        </div>
                    </div>
                `;
                break;
        }
    },

    updateProgress(percent, text) {
        this.els.progressFill.style.width = `${percent}%`;
        if (text) this.els.progressText.textContent = text;
    },

    async startWatermark() {
        this.state.phase = 'stamping';
        this.render();
        
        try {
            const fileBytes = await this.state.file.arrayBuffer();
            this.updateProgress(20, "Loading PDF document...");
            const pdfDoc = await PDFLib.PDFDocument.load(fileBytes);
            
            const text = this.els.wmText.value || "CONFIDENTIAL";
            const colorVals = this.els.wmColor.value.split(',').map(Number);
            const color = PDFLib.rgb(colorVals[0], colorVals[1], colorVals[2]);
            
            const pages = pdfDoc.getPages();
            this.updateProgress(50, `Stamping ${pages.length} pages...`);
            
            const font = await pdfDoc.embedFont(PDFLib.StandardFonts.HelveticaBold);
            const textSize = 60;
            const textWidth = font.widthOfTextAtSize(text, textSize);
            
            pages.forEach((page) => {
                const { width, height } = page.getSize();
                page.drawText(text, {
                    x: width / 2 - textWidth / 2,
                    y: height / 2 - textSize / 2,
                    size: textSize,
                    font: font,
                    color: color,
                    opacity: 0.3,
                    rotate: PDFLib.degrees(45),
                });
            });
            
            this.updateProgress(90, "Saving watermarked document...");
            const modifiedBytes = await pdfDoc.save();
            this.state.resultBlob = new Blob([modifiedBytes], { type: 'application/pdf' });
            
            this.updateProgress(100, "Done!");
            setTimeout(() => {
                this.state.phase = 'done';
                this.render();
                if (window.confetti) {
                    confetti({
                        particleCount: 150,
                        spread: 80,
                        origin: { y: 0.9 },
                        colors: ['#f5c518', '#ffffff', '#000000']
                    });
                }
            }, 500);
            
        } catch (err) {
            console.error("Watermark failed: ", err);
            alert("Failed to apply watermark. Ensure the PDF is not encrypted.");
            this.state.phase = 'selected';
            this.render();
        }
    },

    downloadResult() {
        if (!this.state.resultBlob) return;
        const a = document.createElement('a');
        a.href = URL.createObjectURL(this.state.resultBlob);
        a.download = 'ZapPDF_Watermarked.pdf';
        a.click();
    }
};
