// studio.js - Logic for All-In-One Studio Mode

window.ZapStudio = {
    file: null,
    activeTool: '../index.html',
    els: {},

    init() {
        this.els = {
            dropzone: document.getElementById('studio-dropzone'),
            fileInput: document.getElementById('studio-file-input'),
            iframe: document.getElementById('studio-iframe'),
            fileInfo: document.getElementById('studio-file-info'),
            btnDownload: document.getElementById('btn-studio-download'),
            btnUpload: document.getElementById('btn-studio-upload'),
            navBtns: document.querySelectorAll('.studio-tool-btn')
        };

        this.bindEvents();
    },

    bindEvents() {
        const { els } = this;

        // File Uploads
        els.btnUpload.addEventListener('click', () => els.fileInput.click());
        els.dropzone.addEventListener('click', () => els.fileInput.click());
        
        els.fileInput.addEventListener('change', (e) => this.handleFiles(e.target.files));
        
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            els.dropzone.addEventListener(eventName, e => {
                e.preventDefault();
                e.stopPropagation();
            }, false);
        });

        els.dropzone.addEventListener('dragover', () => els.dropzone.classList.add('dragover'));
        els.dropzone.addEventListener('dragleave', () => els.dropzone.classList.remove('dragover'));
        els.dropzone.addEventListener('drop', (e) => {
            els.dropzone.classList.remove('dragover');
            this.handleFiles(e.dataTransfer.files);
        });

        // Navigation
        els.navBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                els.navBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.activeTool = btn.dataset.tool;
                if (this.file) {
                    this.loadTool();
                }
            });
        });

        // Listen for output from iframe (operation chaining)
        window.addEventListener('message', (e) => {
            if (e.data && e.data.type === 'ZAP_STUDIO_OUTPUT') {
                this.file = e.data.file;
                this.updateFileInfo();
                els.btnDownload.disabled = false;
                // Don't auto-reload the tool, keep the UI as is so user can see completion state
            }
        });

        // Download
        els.btnDownload.addEventListener('click', () => {
            if (this.file) {
                const a = document.createElement('a');
                a.href = URL.createObjectURL(this.file);
                a.download = this.file.name;
                a.click();
            }
        });

        // Iframe load listener to inject file
        els.iframe.addEventListener('load', () => {
            if (this.file) {
                // Give the iframe a tiny delay to ensure scripts are ready
                setTimeout(() => {
                    els.iframe.contentWindow.postMessage({
                        type: 'ZAP_STUDIO_LOAD',
                        file: this.file
                    }, '*');
                }, 200);
            }
        });
    },

    handleFiles(files) {
        if (!files || files.length === 0) return;
        this.file = files[0];
        
        // Hide dropzone, show iframe
        this.els.dropzone.classList.add('hidden');
        this.els.iframe.classList.remove('hidden');
        this.els.btnDownload.disabled = false;
        
        this.updateFileInfo();
        this.loadTool();
    },

    updateFileInfo() {
        const sizeStr = (this.file.size / 1024 / 1024).toFixed(2) + ' MB';
        this.els.fileInfo.innerHTML = `📄 <strong>${this.file.name}</strong> <span style="color:var(--color-text-muted);font-size:12px;margin-left:8px">${sizeStr}</span>`;
    },

    loadTool() {
        // Append ?studio=true so the nested tool hides its navbar and footer
        const url = this.activeTool + (this.activeTool.includes('?') ? '&' : '?') + 'studio=true';
        this.els.iframe.src = url;
    }
};

document.addEventListener('DOMContentLoaded', () => ZapStudio.init());
