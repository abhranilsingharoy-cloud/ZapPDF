// workflows.js - Multi-action PDF pipeline chain (Merge -> Rotate -> Page Numbers -> Watermark -> Password Protect)

window.ZapWorkflows = {
    state: {
        files: [],
        phase: 'idle',
        resultBlob: null,
        steps: {
            merge: true,
            rotate: 0, // 0, 90, 180, 270
            pageNumbers: false,
            numberPos: 'bottom-center',
            watermark: false,
            watermarkText: 'CONFIDENTIAL',
            protect: false,
            password: ''
        }
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

        this.injectWorkflowBuilder();
        this.bindEvents();
    },

    injectWorkflowBuilder() {
        if (document.getElementById('workflow-pipeline-builder')) return;
        const controls = this.els.controls;
        if (!controls) return;

        const builder = document.createElement('div');
        builder.id = 'workflow-pipeline-builder';
        builder.style.cssText = 'margin-bottom: 24px;';
        builder.innerHTML = `
            <h3 style="font-size:16px; font-weight:700; margin-bottom:12px; color:var(--color-text);">Configure Chained Actions:</h3>
            <div style="display:flex; flex-direction:column; gap:12px;">
                <!-- Action 1: Page Numbers -->
                <div style="background:var(--color-surface-2); border:1px solid var(--color-border); border-radius:8px; padding:14px;">
                    <label style="display:flex; align-items:center; gap:10px; cursor:pointer; font-weight:600; font-size:14px;">
                        <input type="checkbox" id="wf-opt-numbers" style="width:18px; height:18px;">
                        <span>1. Add Page Numbers</span>
                    </label>
                    <div id="wf-numbers-detail" style="display:none; margin-top:10px; padding-left:28px;">
                        <select id="wf-numbers-pos" style="padding:6px 10px; border-radius:6px; border:1px solid var(--color-border); background:var(--color-surface); color:var(--color-text); font-size:13px;">
                            <option value="bottom-center" selected>Bottom Center</option>
                            <option value="bottom-right">Bottom Right</option>
                            <option value="top-right">Top Right</option>
                        </select>
                    </div>
                </div>

                <!-- Action 2: Watermark -->
                <div style="background:var(--color-surface-2); border:1px solid var(--color-border); border-radius:8px; padding:14px;">
                    <label style="display:flex; align-items:center; gap:10px; cursor:pointer; font-weight:600; font-size:14px;">
                        <input type="checkbox" id="wf-opt-watermark" style="width:18px; height:18px;">
                        <span>2. Stamp Watermark</span>
                    </label>
                    <div id="wf-watermark-detail" style="display:none; margin-top:10px; padding-left:28px;">
                        <input type="text" id="wf-watermark-text" value="CONFIDENTIAL" placeholder="Watermark text..." style="width:100%; max-width:280px; padding:6px 10px; border-radius:6px; border:1px solid var(--color-border); background:var(--color-surface); color:var(--color-text); font-size:13px;">
                    </div>
                </div>

                <!-- Action 3: Rotate -->
                <div style="background:var(--color-surface-2); border:1px solid var(--color-border); border-radius:8px; padding:14px;">
                    <label style="display:flex; align-items:center; gap:10px; cursor:pointer; font-weight:600; font-size:14px;">
                        <input type="checkbox" id="wf-opt-rotate" style="width:18px; height:18px;">
                        <span>3. Rotate Pages</span>
                    </label>
                    <div id="wf-rotate-detail" style="display:none; margin-top:10px; padding-left:28px;">
                        <select id="wf-rotate-angle" style="padding:6px 10px; border-radius:6px; border:1px solid var(--color-border); background:var(--color-surface); color:var(--color-text); font-size:13px;">
                            <option value="90">Rotate 90° Clockwise</option>
                            <option value="180">Rotate 180° Flip</option>
                            <option value="270">Rotate 270° (90° Counter-Clockwise)</option>
                        </select>
                    </div>
                </div>

                <!-- Action 4: Password Protection -->
                <div style="background:var(--color-surface-2); border:1px solid var(--color-border); border-radius:8px; padding:14px;">
                    <label style="display:flex; align-items:center; gap:10px; cursor:pointer; font-weight:600; font-size:14px;">
                        <input type="checkbox" id="wf-opt-protect" style="width:18px; height:18px;">
                        <span>4. Protect with Password</span>
                    </label>
                    <div id="wf-protect-detail" style="display:none; margin-top:10px; padding-left:28px;">
                        <input type="password" id="wf-password" placeholder="Enter password..." style="width:100%; max-width:280px; padding:6px 10px; border-radius:6px; border:1px solid var(--color-border); background:var(--color-surface); color:var(--color-text); font-size:13px;">
                    </div>
                </div>
            </div>
        `;
        controls.insertBefore(builder, controls.firstChild);

        // Toggle sub-options visibility
        const bindToggle = (chkId, divId) => {
            const chk = document.getElementById(chkId);
            const div = document.getElementById(divId);
            if (chk && div) {
                chk.addEventListener('change', () => div.style.display = chk.checked ? 'block' : 'none');
            }
        };

        bindToggle('wf-opt-numbers', 'wf-numbers-detail');
        bindToggle('wf-opt-watermark', 'wf-watermark-detail');
        bindToggle('wf-opt-rotate', 'wf-rotate-detail');
        bindToggle('wf-opt-protect', 'wf-protect-detail');
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
                this.state.files = [];
                this.state.phase = 'idle';
                this.state.resultBlob = null;
                if (els.fileInput) els.fileInput.value = '';
                this.render();
            });
        }

        if (els.btnConvert) {
            els.btnConvert.addEventListener('click', () => this.runWorkflow());
        }
    },

    formatBytes(bytes) {
        if (!bytes) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    },

    handleFiles(fileList) {
        const valid = Array.from(fileList).filter(f => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf'));
        if (valid.length === 0) {
            alert('Please select valid PDF files.');
            return;
        }
        this.state.files = this.state.files.concat(valid);
        this.state.phase = 'selected';
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

        if (state.phase === 'selected' && state.files.length > 0) {
            if (els.fileCountText) {
                els.fileCountText.textContent = `${state.files.length} document(s) in workflow`;
            }

            if (els.fileList) {
                els.fileList.innerHTML = state.files.map((f, i) => `
                    <div class="file-card">
                        <div class="file-info">
                            <div class="file-name">${i+1}. ${f.name}</div>
                            <div class="file-meta">${this.formatBytes(f.size)}</div>
                        </div>
                    </div>
                `).join('');
            }

            if (els.btnConvert) {
                els.btnConvert.disabled = false;
                els.btnConvert.style.opacity = '1';
                els.btnConvert.style.cursor = 'pointer';
                if (els.btnConvertText) els.btnConvertText.textContent = `Run Workflow on ${state.files.length} File(s)`;
            }
        }

        if (state.phase === 'done' && state.resultBlob) {
            const outName = 'ZapPDF_Workflow_Output.pdf';
            if (els.resultsList) {
                els.resultsList.innerHTML = `
                    <div class="result-card">
                        <div class="result-info">
                            <div class="result-name">${outName}</div>
                            <div class="result-stats">
                                <span class="stat-pill success">${this.formatBytes(state.resultBlob.size)}</span>
                                <span style="color:var(--color-text-muted); font-size:13px; margin-left:8px;">All chained workflow actions completed!</span>
                            </div>
                        </div>
                        <div class="result-actions">
                            <button class="btn btn-primary btn-sm" id="btn-dl-workflow-pdf">Download Resulting PDF</button>
                            <button class="btn btn-outline btn-sm" onclick="location.reload()" style="margin-left:8px;">New Workflow</button>
                        </div>
                    </div>
                `;
                document.getElementById('btn-dl-workflow-pdf').onclick = () => {
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

    async runWorkflow() {
        const { state, els } = this;
        if (state.files.length === 0) return;

        const doNumbers = document.getElementById('wf-opt-numbers')?.checked || false;
        const numPos = document.getElementById('wf-numbers-pos')?.value || 'bottom-center';

        const doWatermark = document.getElementById('wf-opt-watermark')?.checked || false;
        const watermarkText = document.getElementById('wf-watermark-text')?.value || 'CONFIDENTIAL';

        const doRotate = document.getElementById('wf-opt-rotate')?.checked || false;
        const rotateAngle = doRotate ? parseInt(document.getElementById('wf-rotate-angle')?.value || '90') : 0;

        const doProtect = document.getElementById('wf-opt-protect')?.checked || false;
        const password = document.getElementById('wf-password')?.value || '';

        if (doProtect && !password) {
            alert('Please enter a password for protection, or uncheck the password option.');
            return;
        }

        state.phase = 'running';
        if (els.btnConvert) {
            els.btnConvert.disabled = true;
            if (els.btnConvertText) els.btnConvertText.textContent = 'Executing Workflow...';
        }

        this.updateProgress(10, 'Merging documents into unified pipeline...');

        try {
            const masterDoc = await PDFLib.PDFDocument.create();
            const font = await masterDoc.embedFont(PDFLib.StandardFonts.Helvetica);
            const boldFont = await masterDoc.embedFont(PDFLib.StandardFonts.HelveticaBold);

            // Step 1: Merge all files
            for (let i = 0; i < state.files.length; i++) {
                this.updateProgress(10 + Math.round((i / state.files.length) * 30), `Merging file ${i+1} of ${state.files.length}...`);
                const bytes = await state.files[i].arrayBuffer();
                const srcDoc = await PDFLib.PDFDocument.load(bytes, { ignoreEncryption: true });
                const indices = srcDoc.getPageIndices();
                const pages = await masterDoc.copyPages(srcDoc, indices);
                pages.forEach(p => masterDoc.addPage(p));
            }

            const totalPages = masterDoc.getPageCount();

            // Step 2 & 3: Rotate & Annotate pages
            this.updateProgress(50, 'Applying transformations and overlays...');

            for (let i = 0; i < totalPages; i++) {
                const page = masterDoc.getPage(i);
                const { width, height } = page.getSize();

                // Rotate if requested
                if (rotateAngle > 0) {
                    const currentAngle = page.getRotation().angle;
                    page.setRotation(PDFLib.degrees((currentAngle + rotateAngle) % 360));
                }

                // Page numbering
                if (doNumbers) {
                    const numText = `${i + 1} of ${totalPages}`;
                    const numSize = 10;
                    const textWidth = font.widthOfTextAtSize(numText, numSize);

                    let numX = (width - textWidth) / 2;
                    let numY = 20;

                    if (numPos === 'bottom-right') {
                        numX = width - textWidth - 30;
                        numY = 20;
                    } else if (numPos === 'top-right') {
                        numX = width - textWidth - 30;
                        numY = height - 25;
                    }

                    page.drawText(numText, {
                        x: numX,
                        y: numY,
                        size: numSize,
                        font: font,
                        color: PDFLib.rgb(0.3, 0.3, 0.3)
                    });
                }

                // Watermark
                if (doWatermark && watermarkText) {
                    const wmSize = Math.min(width, height) / 10;
                    const textWidth = boldFont.widthOfTextAtSize(watermarkText, wmSize);

                    page.drawText(watermarkText, {
                        x: (width - textWidth) / 2,
                        y: height / 2,
                        size: wmSize,
                        font: boldFont,
                        color: PDFLib.rgb(0.85, 0.15, 0.15),
                        opacity: 0.18,
                        rotate: PDFLib.degrees(45)
                    });
                }
            }

            // Step 4: Password protection if requested
            if (doProtect && password) {
                this.updateProgress(80, 'Applying AES encryption to document...');
                await masterDoc.encrypt({
                    userPassword: password,
                    ownerPassword: password,
                    permissions: {
                        printing: 'highResolution',
                        modifying: false,
                        copying: false,
                        annotating: false
                    }
                });
            }

            this.updateProgress(95, 'Saving compiled document...');
            const finalBytes = await masterDoc.save();
            state.resultBlob = new Blob([finalBytes], { type: 'application/pdf' });

            this.updateProgress(100, 'Workflow completed successfully!');
            setTimeout(() => {
                state.phase = 'done';
                this.render();
                if (window.confetti) confetti({ particleCount: 150, spread: 80, origin: { y: 0.8 } });
            }, 400);

        } catch (err) {
            console.error('Workflow error:', err);
            alert(`Workflow execution failed: ${err.message}`);
            state.phase = 'selected';
            if (els.btnConvert) {
                els.btnConvert.disabled = false;
                if (els.btnConvertText) els.btnConvertText.textContent = 'Retry Workflow';
            }
            if (els.progressContainer) els.progressContainer.classList.add('hidden');
        }
    }
};

document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('upload-zone') && document.getElementById('btn-convert')) {
        ZapWorkflows.init();
    }
});
