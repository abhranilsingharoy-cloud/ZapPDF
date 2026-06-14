// convert.js - Format conversion logic

window.ZapConvert = {
    state: {
        files: [],
        phase: 'idle', // idle, selected, converting, done
        results: []
    },

    init() {
        this.els = {
            uploadZone: document.getElementById('upload-zone'),
            fileInput: document.getElementById('file-input'),
            uploadCompact: document.getElementById('upload-compact'),
            fileList: document.getElementById('file-list'),
            controls: document.getElementById('controls'),
            outputFormat: document.getElementById('output-format'),
            optCompress: document.getElementById('opt-compress'),
            btnConvert: document.getElementById('btn-convert'),
            btnConvertText: document.getElementById('btn-convert-text'),
            progressContainer: document.getElementById('progress-container'),
            progressFill: document.getElementById('progress-fill'),
            progressText: document.getElementById('progress-text'),
            resultsPanel: document.getElementById('results-panel'),
            resultsList: document.getElementById('results-list'),
            batchDownloadBar: document.getElementById('batch-download-bar'),
            btnDownloadZip: document.getElementById('btn-download-zip'),
            fileCountText: document.getElementById('file-count-text'),
            btnChangeFiles: document.getElementById('btn-change-files')
        };

        this.bindEvents();
    },

    bindEvents() {
        const { els } = this;
        
        // File Upload handlers
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
            this.state.results = [];
            this.state.phase = 'idle';
            this.render();
        });

        els.btnConvert.addEventListener('click', () => this.startConversion());
        
        els.btnDownloadZip.addEventListener('click', () => this.downloadZip());
    },

    handleFiles(fileList) {
        const validFiles = Array.from(fileList);
        if (validFiles.length === 0) return;
        
        this.state.files = validFiles.map(file => ({
            originalFile: file,
            name: file.name,
            size: file.size,
            type: file.type || this.getExtensionType(file.name)
        }));
        
        this.state.phase = 'selected';
        this.render();
    },

    getExtensionType(name) {
        const ext = name.split('.').pop().toLowerCase();
        if (['jpg', 'jpeg'].includes(ext)) return 'image/jpeg';
        if (ext === 'png') return 'image/png';
        if (ext === 'pdf') return 'application/pdf';
        if (['cr2', 'nef', 'raw'].includes(ext)) return 'image/x-raw';
        if (['psd'].includes(ext)) return 'image/vnd.adobe.photoshop';
        return 'application/octet-stream';
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
                els.fileCountText.textContent = `${state.files.length} file(s) ready for conversion`;
                
                // Render list
                els.fileList.innerHTML = state.files.map(f => `
                    <div class="file-card">
                        <div class="file-info">
                            <div class="file-name">${f.name}</div>
                            <div class="file-meta">${this.formatBytes(f.size)}</div>
                        </div>
                    </div>
                `).join('');
                
                els.btnConvert.disabled = false;
                els.btnConvert.innerHTML = `<img src="assets/icons/lightning.svg" width="24" height="24"> <span>Convert ${state.files.length} File(s)</span>`;
                break;
            case 'converting':
                els.btnConvert.disabled = true;
                els.btnConvert.innerHTML = `<img src="assets/icons/lightning.svg" class="spinner" width="24" height="24"> <span>Converting...</span>`;
                els.progressContainer.classList.remove('hidden');
                break;
            case 'done':
                els.controls.classList.add('hidden');
                els.fileList.classList.add('hidden');
                els.resultsPanel.classList.remove('hidden');
                
                // Render results
                els.resultsList.innerHTML = state.results.map((r, i) => `
                    <div class="result-card">
                        <div class="result-info">
                            <div class="result-name">${r.name}</div>
                            <div class="result-stats">
                                <span class="stat-pill">${this.formatBytes(r.originalSize)}</span> → 
                                <span class="stat-pill success">${this.formatBytes(r.size)}</span>
                            </div>
                        </div>
                        <div class="result-actions">
                            <button class="btn btn-primary btn-sm" onclick="ZapConvert.downloadSingle(${i})">
                                Download
                            </button>
                        </div>
                    </div>
                `).join('');
                
                if (state.results.length > 1) {
                    els.batchDownloadBar.classList.remove('hidden');
                }
                break;
        }
    },

    updateProgress(percent, text) {
        this.els.progressFill.style.width = `${percent}%`;
        if (text) this.els.progressText.textContent = text;
    },

    async startConversion() {
        this.state.phase = 'converting';
        this.state.results = [];
        this.render();
        
        const outMime = this.els.outputFormat.value;
        const doCompress = this.els.optCompress.checked;
        const extMap = {
            'image/jpeg': 'jpg',
            'image/png': 'png',
            'image/webp': 'webp',
            'application/pdf': 'pdf'
        };
        
        const total = this.state.files.length;
        
        for (let i = 0; i < total; i++) {
            const fileObj = this.state.files[i];
            this.updateProgress((i / total) * 100, `Converting ${fileObj.name}...`);
            
            try {
                let outBlob = null;
                
                // Strategy 1: Using browser-image-compression for standard images to images
                if (fileObj.originalFile.type.startsWith('image/') && outMime.startsWith('image/')) {
                    const options = {
                        maxSizeMB: doCompress ? 2 : 50,
                        maxWidthOrHeight: 4096,
                        useWebWorker: true,
                        fileType: outMime
                    };
                    outBlob = await imageCompression(fileObj.originalFile, options);
                } 
                // Strategy 2: Using PDF-lib for Image to PDF
                else if (outMime === 'application/pdf' && fileObj.originalFile.type.startsWith('image/')) {
                    const pdfDoc = await PDFLib.PDFDocument.create();
                    const page = pdfDoc.addPage();
                    
                    const imgBytes = await fileObj.originalFile.arrayBuffer();
                    let pdfImage;
                    if (fileObj.originalFile.type === 'image/jpeg') {
                        pdfImage = await pdfDoc.embedJpg(imgBytes);
                    } else if (fileObj.originalFile.type === 'image/png') {
                        pdfImage = await pdfDoc.embedPng(imgBytes);
                    } else {
                        // Fallback conversion to PNG first via canvas
                        const canvas = document.createElement('canvas');
                        const ctx = canvas.getContext('2d');
                        const bmp = await createImageBitmap(fileObj.originalFile);
                        canvas.width = bmp.width;
                        canvas.height = bmp.height;
                        ctx.drawImage(bmp, 0, 0);
                        const pngDataUrl = canvas.toDataURL('image/png');
                        pdfImage = await pdfDoc.embedPng(pngDataUrl);
                    }
                    
                    const dims = pdfImage.scale(1);
                    page.setSize(dims.width, dims.height);
                    page.drawImage(pdfImage, {
                        x: 0, y: 0, width: dims.width, height: dims.height
                    });
                    
                    const pdfBytes = await pdfDoc.save();
                    outBlob = new Blob([pdfBytes], { type: 'application/pdf' });
                }
                // Strategy 3: PDF to Image
                else if (fileObj.originalFile.type === 'application/pdf' && outMime.startsWith('image/')) {
                    const pdfBytes = await fileObj.originalFile.arrayBuffer();
                    const loadingTask = pdfjsLib.getDocument({ data: pdfBytes });
                    const pdfDoc = await loadingTask.promise;
                    
                    // For simplicity, we just convert the first page. A full implementation could loop over pdfDoc.numPages
                    const page = await pdfDoc.getPage(1);
                    const viewport = page.getViewport({ scale: 2.0 }); // Scale 2.0 for higher quality
                    
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    canvas.width = viewport.width;
                    canvas.height = viewport.height;
                    
                    await page.render({ canvasContext: ctx, viewport: viewport }).promise;
                    
                    let dataUrl;
                    if (outMime === 'image/jpeg') {
                        dataUrl = canvas.toDataURL('image/jpeg', doCompress ? 0.7 : 0.95);
                    } else {
                        dataUrl = canvas.toDataURL(outMime);
                    }
                    
                    // Convert dataUrl to Blob
                    const res = await fetch(dataUrl);
                    outBlob = await res.blob();
                }
                else {
                     throw new Error("Unsupported format combination.");
                }

                const outName = fileObj.name.substring(0, fileObj.name.lastIndexOf('.')) + '.' + extMap[outMime];
                
                this.state.results.push({
                    blob: outBlob,
                    name: outName,
                    size: outBlob.size,
                    originalSize: fileObj.size
                });
                
            } catch (err) {
                console.error("Conversion failed for ", fileObj.name, err);
            }
        }
        
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
    },

    downloadSingle(index) {
        const r = this.state.results[index];
        const a = document.createElement('a');
        a.href = URL.createObjectURL(r.blob);
        a.download = r.name;
        a.click();
    },

    downloadZip() {
        if (typeof JSZip === 'undefined') return;
        const zip = new JSZip();
        this.state.results.forEach(r => {
            zip.file(r.name, r.blob);
        });
        zip.generateAsync({ type: 'blob' }).then(content => {
            const a = document.createElement('a');
            a.href = URL.createObjectURL(content);
            a.download = 'ZapPDF_Converted.zip';
            a.click();
        });
    }
};
