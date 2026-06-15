document.addEventListener('DOMContentLoaded', () => {
    const uploadZone = document.getElementById('upload-zone');
    const fileInput = document.getElementById('file-input');
    const activeWorkspace = document.getElementById('active-workspace');
    const processBtn = document.getElementById('process-btn');
    
    const progressContainer = document.getElementById('progress-container');
    const progressBarFill = document.getElementById('progress-bar-fill');
    const progressPercent = document.getElementById('progress-percent');
    const progressText = document.getElementById('progress-text');
    
    const container = document.getElementById('edit-container');
    const canvas = document.getElementById('pdf-canvas');
    const ctx = canvas.getContext('2d');

    const textInput = document.getElementById('text-input');
    const textColor = document.getElementById('text-color');
    const textSize = document.getElementById('text-size');
    const addTextBtn = document.getElementById('add-text-btn');

    let pdfDoc = null;
    let pdfFile = null;
    let pdfLibDoc = null;

    let textElements = [];

    // We'll rename sign-container to edit-container in edit.html since we used replace
    // Wait, the id is 'sign-container' because my regex missed renaming the container ID.
    // I will use querySelector to find the canvas wrapper.
    const canvasWrapper = canvas.parentElement;

    // Setup Drag & Drop for Upload
    uploadZone.addEventListener('dragover', (e) => { e.preventDefault(); uploadZone.classList.add('dragover'); });
    uploadZone.addEventListener('dragleave', () => { uploadZone.classList.remove('dragover'); });
    uploadZone.addEventListener('drop', (e) => { e.preventDefault(); uploadZone.classList.remove('dragover'); if (e.dataTransfer.files.length > 0) handleFile(e.dataTransfer.files[0]); });
    uploadZone.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', (e) => { if (e.target.files.length > 0) handleFile(e.target.files[0]); });

    async function handleFile(file) {
        if (file.type !== 'application/pdf') return alert('Please select a valid PDF file.');
        pdfFile = file;
        uploadZone.style.display = 'none';
        activeWorkspace.classList.remove('hidden');
        if(window.ZapDB) window.ZapDB.saveFile(file);

        const arrayBuffer = await file.arrayBuffer();
        pdfLibDoc = await PDFLib.PDFDocument.load(arrayBuffer);
        const loadingTask = pdfjsLib.getDocument({data: arrayBuffer});
        pdfDoc = await loadingTask.promise;
        
        renderPage(1);
    }

    async function renderPage(pageNum) {
        const page = await pdfDoc.getPage(pageNum);
        const viewport = page.getViewport({ scale: 1.5 });
        
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        canvasWrapper.style.width = viewport.width + 'px';
        canvasWrapper.style.height = viewport.height + 'px';

        await page.render({ canvasContext: ctx, viewport: viewport }).promise;
    }

    // Add Text Element logic
    addTextBtn.addEventListener('click', () => {
        if (!textInput.value.trim()) return alert('Please enter some text first.');
        createTextElement(textInput.value, textColor.value, parseInt(textSize.value));
        textInput.value = '';
    });

    function createTextElement(text, color, size) {
        const el = document.createElement('div');
        el.textContent = text;
        el.style.position = 'absolute';
        el.style.left = '50px';
        el.style.top = '50px';
        el.style.color = color;
        el.style.fontSize = size + 'px';
        el.style.fontFamily = 'Helvetica, Arial, sans-serif';
        el.style.cursor = 'move';
        el.style.whiteSpace = 'nowrap';
        el.style.userSelect = 'none';
        el.style.border = '1px dashed transparent';
        
        el.addEventListener('mouseenter', () => el.style.border = '1px dashed var(--color-primary)');
        el.addEventListener('mouseleave', () => el.style.border = '1px dashed transparent');

        // Make Draggable
        let isDragging = false;
        let startX, startY;
        
        el.addEventListener('mousedown', (e) => {
            isDragging = true;
            startX = e.clientX - el.offsetLeft;
            startY = e.clientY - el.offsetTop;
            e.stopPropagation();
        });

        window.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            el.style.left = (e.clientX - startX) + 'px';
            el.style.top = (e.clientY - startY) + 'px';
        });

        window.addEventListener('mouseup', () => {
            isDragging = false;
        });

        // Double click to delete
        el.addEventListener('dblclick', () => {
            if(confirm('Delete this text?')) {
                canvasWrapper.removeChild(el);
                textElements = textElements.filter(t => t.el !== el);
            }
        });

        canvasWrapper.appendChild(el);
        textElements.push({
            el: el,
            text: text,
            color: color,
            size: size
        });
    }

    // Click on canvas to spawn text input directly
    canvasWrapper.addEventListener('dblclick', (e) => {
        if (!pdfDoc) return;
        const rect = canvasWrapper.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        const txt = prompt('Enter text:');
        if (txt) {
            createTextElement(txt, textColor.value, parseInt(textSize.value));
            const latest = textElements[textElements.length - 1];
            latest.el.style.left = x + 'px';
            latest.el.style.top = y + 'px';
        }
    });

    processBtn.addEventListener('click', async () => {
        if (!pdfLibDoc) return;
        
        activeWorkspace.classList.add('hidden');
        progressContainer.classList.remove('hidden');
        progressText.textContent = 'Applying text...';
        progressBarFill.style.width = '30%';
        progressPercent.textContent = '30%';

        const pages = pdfLibDoc.getPages();
        const pdfPage = pages[0]; // Assuming placing on first page for simplicity
        const { width: pdfWidth, height: pdfHeight } = pdfPage.getSize();
        
        const scaleX = pdfWidth / canvas.width;
        const scaleY = pdfHeight / canvas.height;

        const helveticaFont = await pdfLibDoc.embedFont(PDFLib.StandardFonts.Helvetica);

        textElements.forEach(item => {
            const rect = item.el.getBoundingClientRect();
            const wrapperRect = canvasWrapper.getBoundingClientRect();
            
            const cssX = rect.left - wrapperRect.left;
            const cssY = rect.top - wrapperRect.top;

            // Convert HEX to RGB
            const hexToRgb = hex => {
                var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
                return result ? {
                    r: parseInt(result[1], 16) / 255,
                    g: parseInt(result[2], 16) / 255,
                    b: parseInt(result[3], 16) / 255
                } : { r: 0, g: 0, b: 0 };
            };
            const colorRGB = hexToRgb(item.color);

            const newX = cssX * scaleX;
            // PDF Y is from bottom. Text draws from its baseline.
            // We approximate the baseline as cssY + height of text.
            const newY = pdfHeight - ((cssY + item.el.offsetHeight * 0.8) * scaleY);
            const newSize = item.size * scaleY;

            pdfPage.drawText(item.text, {
                x: newX,
                y: newY,
                size: newSize,
                font: helveticaFont,
                color: PDFLib.rgb(colorRGB.r, colorRGB.g, colorRGB.b),
            });
        });

        progressBarFill.style.width = '80%';
        progressPercent.textContent = '80%';
        progressText.textContent = 'Saving PDF...';

        const pdfBytes = await pdfLibDoc.save();
        const blob = new Blob([pdfBytes], { type: 'application/pdf' });
        
        progressBarFill.style.width = '100%';
        progressPercent.textContent = '100%';
        progressText.textContent = 'Done!';

        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = pdfFile.name.replace('.pdf', '_edited.pdf');
        a.click();
        URL.revokeObjectURL(url);
        
        setTimeout(() => window.location.reload(), 1500);
    });
});
