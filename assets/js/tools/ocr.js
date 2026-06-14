// ocr.js - OCR Text Extraction logic using Tesseract.js and pdf.js

window.ZapOCR = {
    state: {
        file: null,
        phase: 'idle', // idle, selected, extracting, done
        extractedText: ""
    },

    init() {
        this.els = {
            uploadZone: document.getElementById('upload-zone'),
            fileInput: document.getElementById('file-input'),
            uploadCompact: document.getElementById('upload-compact'),
            fileList: document.getElementById('file-list'),
            controls: document.getElementById('controls'),
            btnExtract: document.getElementById('btn-extract'),
            ocrLanguage: document.getElementById('ocr-language'),
            progressContainer: document.getElementById('progress-container'),
            progressFill: document.getElementById('progress-fill'),
            progressText: document.getElementById('progress-text'),
            resultsPanel: document.getElementById('results-panel'),
            extractedTextArea: document.getElementById('extracted-text-area'),
            btnCopyText: document.getElementById('btn-copy-text'),
            btnDownloadText: document.getElementById('btn-download-text'),
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
            this.state.extractedText = "";
            this.state.phase = 'idle';
            this.els.extractedTextArea.value = "";
            this.render();
        });

        els.btnExtract.addEventListener('click', () => this.startExtraction());
        
        els.btnCopyText.addEventListener('click', () => {
            navigator.clipboard.writeText(this.state.extractedText);
            const originalText = els.btnCopyText.textContent;
            els.btnCopyText.textContent = "Copied!";
            setTimeout(() => els.btnCopyText.textContent = originalText, 2000);
        });

        els.btnDownloadText.addEventListener('click', () => {
            const blob = new Blob([this.state.extractedText], { type: 'text/plain' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = `ZapPDF_OCR_${this.state.file.name.split('.')[0]}.txt`;
            a.click();
        });
    },

    handleFiles(fileList) {
        const validFiles = Array.from(fileList);
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
                
                els.btnExtract.disabled = false;
                els.btnExtract.innerHTML = `<img src="assets/icons/lightning.svg" width="24" height="24"> <span>Extract Text</span>`;
                break;
            case 'extracting':
                els.btnExtract.disabled = true;
                els.btnExtract.innerHTML = `<img src="assets/icons/lightning.svg" class="spinner" width="24" height="24"> <span>Extracting...</span>`;
                els.progressContainer.classList.remove('hidden');
                break;
            case 'done':
                els.controls.classList.add('hidden');
                els.fileList.classList.add('hidden');
                els.resultsPanel.classList.remove('hidden');
                
                els.extractedTextArea.value = state.extractedText;
                break;
        }
    },

    updateProgress(percent, text) {
        this.els.progressFill.style.width = `${percent}%`;
        if (text) this.els.progressText.textContent = text;
    },

    async pdfToImageUrl(file) {
        const arrayBuffer = await file.arrayBuffer();
        const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
        const pdfDoc = await loadingTask.promise;
        const page = await pdfDoc.getPage(1); // Extract from first page
        const viewport = page.getViewport({ scale: 2.0 });
        
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        
        await page.render({ canvasContext: ctx, viewport: viewport }).promise;
        return canvas.toDataURL('image/jpeg');
    },

    async startExtraction() {
        this.state.phase = 'extracting';
        this.render();
        
        try {
            let imageUrl = "";
            if (this.state.file.type === 'application/pdf' || this.state.file.name.toLowerCase().endsWith('.pdf')) {
                this.updateProgress(10, "Converting PDF to image...");
                imageUrl = await this.pdfToImageUrl(this.state.file);
            } else {
                imageUrl = URL.createObjectURL(this.state.file);
            }
            
            const lang = this.els.ocrLanguage.value;
            
            this.updateProgress(20, "Loading Tesseract AI Model...");
            
            const worker = await Tesseract.createWorker(lang, 1, {
                logger: m => {
                    if (m.status === 'recognizing text') {
                        this.updateProgress(20 + (m.progress * 80), `Recognizing text... ${Math.round(m.progress * 100)}%`);
                    } else if (m.status.includes('loading')) {
                        this.updateProgress(20, `Loading language model...`);
                    }
                }
            });
            
            const ret = await worker.recognize(imageUrl);
            this.state.extractedText = ret.data.text;
            await worker.terminate();
            
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
            console.error("OCR failed: ", err);
            alert("Failed to extract text. Ensure it is a valid image or PDF.");
            this.state.phase = 'selected';
            this.render();
        }
    }
};
