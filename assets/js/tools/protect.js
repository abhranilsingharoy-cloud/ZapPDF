// protect.js - PDF Encryption logic using pdf-lib

window.ZapProtect = {
    state: {
        file: null,
        phase: 'idle', // idle, selected, encrypting, done
        resultBlob: null
    },

    init() {
        this.els = {
            uploadZone: document.getElementById('upload-zone'),
            fileInput: document.getElementById('file-input'),
            uploadCompact: document.getElementById('upload-compact'),
            fileList: document.getElementById('file-list'),
            controls: document.getElementById('controls'),
            btnProtect: document.getElementById('btn-protect'),
            pdfPassword: document.getElementById('pdf-password'),
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
            this.els.pdfPassword.value = '';
            this.render();
        });

        els.btnProtect.addEventListener('click', () => this.startEncryption());
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
                
                els.btnProtect.disabled = false;
                els.btnProtect.innerHTML = `<img src="assets/icons/lightning.svg" width="24" height="24"> <span>Encrypt PDF</span>`;
                break;
            case 'encrypting':
                els.btnProtect.disabled = true;
                els.btnProtect.innerHTML = `<img src="assets/icons/lightning.svg" class="spinner" width="24" height="24"> <span>Encrypting...</span>`;
                els.progressContainer.classList.remove('hidden');
                break;
            case 'done':
                els.controls.classList.add('hidden');
                els.fileList.classList.add('hidden');
                els.resultsPanel.classList.remove('hidden');
                
                els.resultsList.innerHTML = `
                    <div class="result-card">
                        <div class="result-info">
                            <div class="result-name">ZapPDF_Protected.pdf</div>
                            <div class="result-stats">
                                <span class="stat-pill success">Protected</span>
                                <span style="color: var(--color-text-muted); font-size: 13px; margin-left: 8px;">Password successfully applied.</span>
                            </div>
                        </div>
                        <div class="result-actions">
                            <button class="btn btn-primary btn-sm" onclick="ZapProtect.downloadResult()">
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

    async startEncryption() {
        const password = this.els.pdfPassword.value;
        if (!password) {
            alert("Please enter a password.");
            return;
        }
        
        this.state.phase = 'encrypting';
        this.render();
        
        try {
            this.updateProgress(20, "Loading PDF document...");
            const fileBytes = await this.state.file.arrayBuffer();
            const pdfDoc = await PDFLib.PDFDocument.load(fileBytes);
            
            this.updateProgress(60, "Applying encryption algorithms...");
            // Encrypt using AES-256 (standard for pdf-lib >= 1.17)
            pdfDoc.encrypt({
                userPassword: password,
                ownerPassword: password,
                permissions: {
                    printing: 'highResolution',
                    modifying: false,
                    copying: false,
                    annotating: false,
                    fillingForms: false,
                    documentAssembly: false
                }
            });
            
            this.updateProgress(90, "Saving encrypted document...");
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
            console.error("Protection failed: ", err);
            alert("Failed to encrypt PDF. Ensure it is not already encrypted.");
            this.state.phase = 'selected';
            this.render();
        }
    },

    downloadResult() {
        if (!this.state.resultBlob) return;
        const a = document.createElement('a');
        a.href = URL.createObjectURL(this.state.resultBlob);
        a.download = 'ZapPDF_Protected.pdf';
        a.click();
    }
};
