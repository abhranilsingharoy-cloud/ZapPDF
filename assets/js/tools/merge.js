// merge.js - PDF Merging logic using pdf-lib

window.ZapMerge = {
    state: {
        files: [],
        phase: 'idle', // idle, selected, merging, done
        resultBlob: null
    },

    init() {
        this.els = {
            uploadZone: document.getElementById('upload-zone'),
            fileInput: document.getElementById('file-input'),
            uploadCompact: document.getElementById('upload-compact'),
            fileList: document.getElementById('file-list'),
            controls: document.getElementById('controls'),
            btnMerge: document.getElementById('btn-merge'),
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
            this.state.files = [];
            this.state.resultBlob = null;
            this.state.phase = 'idle';
            this.render();
        });

        els.btnMerge.addEventListener('click', () => this.startMerge());
    },

    handleFiles(fileList) {
        const validFiles = Array.from(fileList).filter(f => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf'));
        if (validFiles.length === 0) return;
        
        this.state.files = this.state.files.concat(validFiles);
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
                els.fileCountText.textContent = `${state.files.length} file(s) selected`;
                
                els.fileList.innerHTML = state.files.map((f, i) => `
                    <div class="file-card">
                        <div class="file-info">
                            <div class="file-name">${i + 1}. ${f.name}</div>
                            <div class="file-meta">${this.formatBytes(f.size)}</div>
                        </div>
                    </div>
                `).join('');
                
                els.btnMerge.disabled = state.files.length < 2;
                els.btnMerge.innerHTML = state.files.length < 2 ? 
                    `<img src="assets/icons/lightning.svg" width="24" height="24"> <span>Need at least 2 files</span>` :
                    `<img src="assets/icons/lightning.svg" width="24" height="24"> <span>Merge ${state.files.length} Files</span>`;
                break;
            case 'merging':
                els.btnMerge.disabled = true;
                els.btnMerge.innerHTML = `<img src="assets/icons/lightning.svg" class="spinner" width="24" height="24"> <span>Merging...</span>`;
                els.progressContainer.classList.remove('hidden');
                break;
            case 'done':
                els.controls.classList.add('hidden');
                els.fileList.classList.add('hidden');
                els.resultsPanel.classList.remove('hidden');
                
                els.resultsList.innerHTML = `
                    <div class="result-card">
                        <div class="result-info">
                            <div class="result-name">ZapPDF_Merged.pdf</div>
                            <div class="result-stats">
                                <span class="stat-pill success">${this.formatBytes(this.state.resultBlob.size)}</span>
                                <span style="color: var(--color-text-muted); font-size: 13px; margin-left: 8px;">Successfully merged ${this.state.files.length} files.</span>
                            </div>
                        </div>
                        <div class="result-actions">
                            <button class="btn btn-primary btn-sm" onclick="ZapMerge.downloadResult()">
                                Download Merged PDF
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

    async startMerge() {
        if (this.state.files.length < 2) return;
        
        this.state.phase = 'merging';
        this.render();
        
        try {
            const mergedPdf = await PDFLib.PDFDocument.create();
            const total = this.state.files.length;
            
            for (let i = 0; i < total; i++) {
                this.updateProgress((i / total) * 100, `Merging file ${i+1} of ${total}...`);
                
                const fileBytes = await this.state.files[i].arrayBuffer();
                const pdfDoc = await PDFLib.PDFDocument.load(fileBytes);
                const copiedPages = await mergedPdf.copyPages(pdfDoc, pdfDoc.getPageIndices());
                
                copiedPages.forEach((page) => mergedPdf.addPage(page));
            }
            
            this.updateProgress(90, "Saving merged document...");
            const mergedBytes = await mergedPdf.save();
            this.state.resultBlob = new Blob([mergedBytes], { type: 'application/pdf' });
            
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
            console.error("Merge failed: ", err);
            alert("Failed to merge PDFs. Make sure they are not encrypted/password-protected.");
            this.state.phase = 'selected';
            this.render();
        }
    },

    downloadResult() {
        if (!this.state.resultBlob) return;
        const a = document.createElement('a');
        a.href = URL.createObjectURL(this.state.resultBlob);
        a.download = 'ZapPDF_Merged.pdf';
        a.click();
    }
};
