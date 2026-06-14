// split.js - PDF Splitting logic using pdf-lib

window.ZapSplit = {
    state: {
        file: null,
        pdfDoc: null,
        numPages: 0,
        phase: 'idle', // idle, selected, splitting, done
        resultBlob: null
    },

    init() {
        this.els = {
            uploadZone: document.getElementById('upload-zone'),
            fileInput: document.getElementById('file-input'),
            uploadCompact: document.getElementById('upload-compact'),
            fileList: document.getElementById('file-list'),
            controls: document.getElementById('controls'),
            btnSplit: document.getElementById('btn-split'),
            pageRanges: document.getElementById('page-ranges'),
            pageCountHint: document.getElementById('page-count-hint'),
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
            this.state.pdfDoc = null;
            this.state.resultBlob = null;
            this.state.phase = 'idle';
            this.els.pageRanges.value = '';
            this.render();
        });

        els.btnSplit.addEventListener('click', () => this.startSplit());
    },

    async handleFiles(fileList) {
        const validFiles = Array.from(fileList).filter(f => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf'));
        if (validFiles.length === 0) return;
        
        // Only take the first file
        this.state.file = validFiles[0];
        this.state.phase = 'selected';
        this.render();
        
        // Load document to get page count
        this.els.pageCountHint.textContent = "Loading PDF metadata...";
        try {
            const fileBytes = await this.state.file.arrayBuffer();
            this.state.pdfDoc = await PDFLib.PDFDocument.load(fileBytes);
            this.state.numPages = this.state.pdfDoc.getPageCount();
            this.els.pageCountHint.textContent = `Document has ${this.state.numPages} pages.`;
        } catch (err) {
            console.error(err);
            this.els.pageCountHint.textContent = "Failed to read PDF. Ensure it is not encrypted.";
            this.els.btnSplit.disabled = true;
        }
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
                
                els.btnSplit.disabled = false;
                els.btnSplit.innerHTML = `<img src="assets/icons/lightning.svg" width="24" height="24"> <span>Split PDF</span>`;
                break;
            case 'splitting':
                els.btnSplit.disabled = true;
                els.btnSplit.innerHTML = `<img src="assets/icons/lightning.svg" class="spinner" width="24" height="24"> <span>Splitting...</span>`;
                els.progressContainer.classList.remove('hidden');
                break;
            case 'done':
                els.controls.classList.add('hidden');
                els.fileList.classList.add('hidden');
                els.resultsPanel.classList.remove('hidden');
                
                els.resultsList.innerHTML = `
                    <div class="result-card">
                        <div class="result-info">
                            <div class="result-name">ZapPDF_Split.pdf</div>
                            <div class="result-stats">
                                <span class="stat-pill success">${this.formatBytes(this.state.resultBlob.size)}</span>
                                <span style="color: var(--color-text-muted); font-size: 13px; margin-left: 8px;">Extracted successfully.</span>
                            </div>
                        </div>
                        <div class="result-actions">
                            <button class="btn btn-primary btn-sm" onclick="ZapSplit.downloadResult()">
                                Download Extracted PDF
                            </button>
                        </div>
                    </div>
                `;
                break;
        }
    },

    parseRanges(str, maxPages) {
        const pages = new Set();
        const parts = str.split(',').map(s => s.trim());
        for(const part of parts) {
            if (!part) continue;
            if(part.includes('-')) {
                const [start, end] = part.split('-').map(Number);
                if(start && end && start <= end && start >= 1 && end <= maxPages) {
                    for(let i = start; i <= end; i++) pages.add(i - 1); // 0-indexed
                }
            } else {
                const page = Number(part);
                if(page && page >= 1 && page <= maxPages) pages.add(page - 1);
            }
        }
        return Array.from(pages).sort((a,b)=>a-b);
    },

    updateProgress(percent, text) {
        this.els.progressFill.style.width = `${percent}%`;
        if (text) this.els.progressText.textContent = text;
    },

    async startSplit() {
        if (!this.state.pdfDoc) return;
        
        const rangeStr = this.els.pageRanges.value;
        if (!rangeStr) {
            alert("Please enter a page range to extract.");
            return;
        }
        
        const pageIndicesToExtract = this.parseRanges(rangeStr, this.state.numPages);
        if (pageIndicesToExtract.length === 0) {
            alert("Invalid page range. Please check your input and try again.");
            return;
        }

        this.state.phase = 'splitting';
        this.render();
        
        try {
            this.updateProgress(20, "Creating new document...");
            const newPdf = await PDFLib.PDFDocument.create();
            
            this.updateProgress(50, `Copying ${pageIndicesToExtract.length} pages...`);
            const copiedPages = await newPdf.copyPages(this.state.pdfDoc, pageIndicesToExtract);
            copiedPages.forEach((page) => newPdf.addPage(page));
            
            this.updateProgress(90, "Saving extracted document...");
            const splitBytes = await newPdf.save();
            this.state.resultBlob = new Blob([splitBytes], { type: 'application/pdf' });
            
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
            console.error("Split failed: ", err);
            alert("Failed to split PDF.");
            this.state.phase = 'selected';
            this.render();
        }
    },

    downloadResult() {
        if (!this.state.resultBlob) return;
        const a = document.createElement('a');
        a.href = URL.createObjectURL(this.state.resultBlob);
        a.download = 'ZapPDF_Split.pdf';
        a.click();
    }
};
