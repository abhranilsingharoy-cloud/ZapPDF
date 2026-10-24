// pdf-forms.js - Interactive PDF Form inspector, filler, and flattener using pdf-lib

window.ZapPdfForms = {
    state: {
        file: null,
        pdfBytes: null,
        phase: 'idle',
        fields: [], // { name, type, value, options }
        resultBlob: null
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

        this.bindEvents();
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
                this.state = { file: null, pdfBytes: null, phase: 'idle', fields: [], resultBlob: null };
                if (els.fileInput) els.fileInput.value = '';
                this.render();
            });
        }

        if (els.btnConvert) {
            els.btnConvert.addEventListener('click', () => this.applyFormValues());
        }
    },

    formatBytes(bytes) {
        if (!bytes) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    },

    async handleFiles(fileList) {
        const files = Array.from(fileList).filter(f => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf'));
        if (files.length === 0) {
            alert('Please select a valid PDF file.');
            return;
        }

        this.state.file = files[0];
        this.state.phase = 'analyzing';
        this.render();

        try {
            const ab = await this.state.file.arrayBuffer();
            this.state.pdfBytes = new Uint8Array(ab);

            const pdfDoc = await PDFLib.PDFDocument.load(this.state.pdfBytes, { ignoreEncryption: true });
            const form = pdfDoc.getForm();
            const rawFields = form.getFields();

            this.state.fields = [];
            for (const f of rawFields) {
                const name = f.getName();
                const type = f.constructor.name;
                let val = '';
                let options = [];

                try {
                    if (type === 'PDFTextField') {
                        val = f.getText() || '';
                    } else if (type === 'PDFCheckBox') {
                        val = f.isChecked();
                    } else if (type === 'PDFDropdown') {
                        val = f.getSelected() || '';
                        options = f.getOptions() || [];
                    } else if (type === 'PDFRadioGroup') {
                        val = f.getSelected() || '';
                        options = f.getOptions() || [];
                    }
                } catch (e) {
                    console.warn(`Could not read value of field ${name}:`, e);
                }

                this.state.fields.push({ name, type, value: val, options, ref: f });
            }

            this.state.phase = 'selected';
            this.render();

        } catch (err) {
            console.error('Form parse error:', err);
            alert(`Could not parse form fields: ${err.message}`);
            this.state.phase = 'idle';
            this.render();
        }
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
            const fieldCount = state.fields.length;
            if (els.fileCountText) {
                els.fileCountText.textContent = `${state.file.name} (${fieldCount} fillable field${fieldCount !== 1 ? 's' : ''} detected)`;
            }

            if (els.fileList) {
                if (fieldCount === 0) {
                    els.fileList.innerHTML = `
                        <div style="background:#fffbeb; border:1px solid #f59e0b; border-radius:8px; padding:20px; text-align:center;">
                            <div style="font-size:24px; margin-bottom:8px;">ℹ️</div>
                            <div style="font-weight:700; font-size:15px; color:#92400e; margin-bottom:6px;">No Interactive Form Fields Detected</div>
                            <div style="font-size:13px; color:#b45309; line-height:1.6; max-width:500px; margin:0 auto 16px;">
                                This PDF does not have interactive AcroForm text fields or checkboxes. It may be a scanned document or standard flattened PDF.
                            </div>
                            <div style="display:flex; justify-content:center; gap:12px;">
                                <a href="edit.html" class="btn btn-primary btn-sm">Use PDF Editor to Add Text</a>
                                <a href="sign.html" class="btn btn-outline btn-sm">Use Sign PDF</a>
                            </div>
                        </div>
                    `;
                } else {
                    const fieldsHtml = state.fields.map((f, i) => {
                        let inputHtml = '';
                        if (f.type === 'PDFCheckBox') {
                            inputHtml = `
                                <label style="display:flex; align-items:center; gap:8px; cursor:pointer;">
                                    <input type="checkbox" id="field-input-${i}" ${f.value ? 'checked' : ''} style="width:18px; height:18px;">
                                    <span style="font-size:13px; font-weight:500;">Checked</span>
                                </label>
                            `;
                        } else if (f.type === 'PDFDropdown') {
                            const opts = f.options.map(opt => `<option value="${opt}" ${opt === f.value ? 'selected' : ''}>${opt}</option>`).join('');
                            inputHtml = `<select id="field-input-${i}" style="width:100%; padding:8px 12px; background:var(--color-surface); border:1px solid var(--color-border); border-radius:6px; color:var(--color-text); font-size:13px;">${opts}</select>`;
                        } else if (f.type === 'PDFRadioGroup') {
                            const opts = f.options.map(opt => `
                                <label style="display:inline-flex; align-items:center; gap:6px; margin-right:12px; cursor:pointer;">
                                    <input type="radio" name="radio-group-${i}" value="${opt}" ${opt === f.value ? 'checked' : ''}>
                                    <span style="font-size:13px;">${opt}</span>
                                </label>
                            `).join('');
                            inputHtml = `<div>${opts}</div>`;
                        } else {
                            // Text field
                            inputHtml = `<input type="text" id="field-input-${i}" value="${f.value}" placeholder="Enter text..." style="width:100%; padding:8px 12px; background:var(--color-surface); border:1px solid var(--color-border); border-radius:6px; color:var(--color-text); font-size:13px;">`;
                        }

                        return `
                            <div style="background:var(--color-surface-2); border:1px solid var(--color-border); border-radius:8px; padding:14px; margin-bottom:10px;">
                                <div style="display:flex; justify-content:space-between; margin-bottom:6px;">
                                    <label for="field-input-${i}" style="font-weight:600; font-size:13px; color:var(--color-text);">${f.name || `Field #${i+1}`}</label>
                                    <span style="font-size:11px; color:var(--color-text-muted); background:rgba(0,0,0,0.05); padding:2px 6px; border-radius:4px;">${f.type.replace('PDF', '')}</span>
                                </div>
                                ${inputHtml}
                            </div>
                        `;
                    }).join('');

                    els.fileList.innerHTML = `
                        <div style="margin-bottom:16px;">
                            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
                                <h4 style="margin:0; font-size:15px; font-weight:700;">Fill Form Fields</h4>
                                <label style="display:flex; align-items:center; gap:6px; font-size:13px; cursor:pointer;">
                                    <input type="checkbox" id="opt-flatten" style="cursor:pointer;">
                                    <span>Flatten form (make read-only)</span>
                                </label>
                            </div>
                            ${fieldsHtml}
                        </div>
                    `;
                }
            }

            if (els.btnConvert) {
                els.btnConvert.disabled = fieldCount === 0;
                els.btnConvert.style.opacity = fieldCount === 0 ? '0.5' : '1';
                els.btnConvert.style.cursor = fieldCount === 0 ? 'not-allowed' : 'pointer';
                if (els.btnConvertText) els.btnConvertText.textContent = 'Save & Export Filled PDF';
            }
        }

        if (state.phase === 'done' && state.resultBlob) {
            const outName = `filled_${state.file.name}`;
            if (els.resultsList) {
                els.resultsList.innerHTML = `
                    <div class="result-card">
                        <div class="result-info">
                            <div class="result-name">${outName}</div>
                            <div class="result-stats">
                                <span class="stat-pill success">${this.formatBytes(state.resultBlob.size)}</span>
                                <span style="color:var(--color-text-muted); font-size:13px; margin-left:8px;">Form values embedded successfully.</span>
                            </div>
                        </div>
                        <div class="result-actions">
                            <button class="btn btn-primary btn-sm" id="btn-dl-filled-pdf">Download Filled PDF</button>
                            <button class="btn btn-outline btn-sm" onclick="location.reload()" style="margin-left:8px;">Fill Another</button>
                        </div>
                    </div>
                `;
                document.getElementById('btn-dl-filled-pdf').onclick = () => {
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

    async applyFormValues() {
        const { state, els } = this;
        if (!state.pdfBytes || state.fields.length === 0) return;

        state.phase = 'saving';
        if (els.btnConvert) {
            els.btnConvert.disabled = true;
            if (els.btnConvertText) els.btnConvertText.textContent = 'Embedding Values...';
        }

        this.updateProgress(20, 'Loading document structure...');

        try {
            const pdfDoc = await PDFLib.PDFDocument.load(state.pdfBytes, { ignoreEncryption: true });
            const form = pdfDoc.getForm();

            const flatten = document.getElementById('opt-flatten')?.checked || false;

            this.updateProgress(50, 'Applying form field values...');

            state.fields.forEach((f, i) => {
                try {
                    const field = form.getField(f.name);
                    if (f.type === 'PDFTextField') {
                        const val = document.getElementById(`field-input-${i}`)?.value || '';
                        field.setText(val);
                    } else if (f.type === 'PDFCheckBox') {
                        const checked = document.getElementById(`field-input-${i}`)?.checked || false;
                        if (checked) field.check();
                        else field.uncheck();
                    } else if (f.type === 'PDFDropdown') {
                        const val = document.getElementById(`field-input-${i}`)?.value;
                        if (val) field.select(val);
                    } else if (f.type === 'PDFRadioGroup') {
                        const selectedRadio = document.querySelector(`input[name="radio-group-${i}"]:checked`);
                        if (selectedRadio) field.select(selectedRadio.value);
                    }
                } catch (fieldErr) {
                    console.warn(`Could not set value for field ${f.name}:`, fieldErr);
                }
            });

            if (flatten) {
                this.updateProgress(75, 'Flattening form to permanent print visual...');
                form.flatten();
            }

            this.updateProgress(90, 'Saving filled document...');
            const outBytes = await pdfDoc.save();
            state.resultBlob = new Blob([outBytes], { type: 'application/pdf' });

            this.updateProgress(100, 'Done!');
            setTimeout(() => {
                state.phase = 'done';
                this.render();
                if (window.confetti) confetti({ particleCount: 120, spread: 70, origin: { y: 0.8 } });
            }, 400);

        } catch (err) {
            console.error('Save form error:', err);
            alert(`Failed to save PDF form: ${err.message}`);
            state.phase = 'selected';
            if (els.btnConvert) {
                els.btnConvert.disabled = false;
                if (els.btnConvertText) els.btnConvertText.textContent = 'Retry Save';
            }
            if (els.progressContainer) els.progressContainer.classList.add('hidden');
        }
    }
};

document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('upload-zone') && document.getElementById('btn-convert')) {
        ZapPdfForms.init();
    }
});
