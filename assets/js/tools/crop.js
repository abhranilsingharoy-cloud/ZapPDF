document.addEventListener('DOMContentLoaded', () => {
    const uploadZone = document.getElementById('upload-zone');
    const fileInput = document.getElementById('file-input');
    const activeWorkspace = document.getElementById('active-workspace');
    const processBtn = document.getElementById('process-btn');
    
    const progressContainer = document.getElementById('progress-container');
    const progressBarFill = document.getElementById('progress-bar-fill');
    const progressPercent = document.getElementById('progress-percent');
    const progressText = document.getElementById('progress-text');
    const addMoreBtn = document.getElementById('add-more-btn');

    const container = document.getElementById('crop-container');
    const canvas = document.getElementById('pdf-canvas');
    const cropBox = document.getElementById('crop-box');
    const ctx = canvas.getContext('2d');

    let pdfDoc = null;
    let pdfFile = null;
    let pdfLibDoc = null;
    let originalPdfBytes = null;

    let cropData = {
        x: 0,
        y: 0,
        width: 0,
        height: 0
    };

    let isDragging = false;
    let startX, startY;

    // Setup Drag & Drop
    uploadZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadZone.classList.add('dragover');
    });
    uploadZone.addEventListener('dragleave', () => {
        uploadZone.classList.remove('dragover');
    });
    uploadZone.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadZone.classList.remove('dragover');
        if (e.dataTransfer.files.length > 0) {
            handleFile(e.dataTransfer.files[0]);
        }
    });
    uploadZone.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleFile(e.target.files[0]);
        }
    });

    addMoreBtn.addEventListener('click', () => {
        fileInput.click();
    });

    async function handleFile(file) {
        if (file.type !== 'application/pdf') {
            alert('Please select a valid PDF file.');
            return;
        }
        
        pdfFile = file;
        uploadZone.style.display = 'none';
        activeWorkspace.classList.remove('hidden');

        // Save to DB
        if(window.ZapDB) window.ZapDB.saveFile(file);

        const arrayBuffer = await file.arrayBuffer();
        originalPdfBytes = arrayBuffer;
        
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
        container.style.width = viewport.width + 'px';
        container.style.height = viewport.height + 'px';

        const renderContext = {
            canvasContext: ctx,
            viewport: viewport
        };
        await page.render(renderContext).promise;

        // Initialize Crop Box (90% size initially)
        cropData.x = viewport.width * 0.05;
        cropData.y = viewport.height * 0.05;
        cropData.width = viewport.width * 0.9;
        cropData.height = viewport.height * 0.9;
        updateCropBoxUI();
        cropBox.style.display = 'block';
    }

    function updateCropBoxUI() {
        cropBox.style.left = cropData.x + 'px';
        cropBox.style.top = cropData.y + 'px';
        cropBox.style.width = cropData.width + 'px';
        cropBox.style.height = cropData.height + 'px';
    }

    // Mouse events for crop box
    container.addEventListener('mousedown', (e) => {
        const rect = container.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        // Create new crop box
        cropData.x = x;
        cropData.y = y;
        cropData.width = 0;
        cropData.height = 0;
        startX = x;
        startY = y;
        isDragging = true;
        updateCropBoxUI();
    });

    container.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        const rect = container.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        cropData.width = Math.abs(x - startX);
        cropData.height = Math.abs(y - startY);
        cropData.x = Math.min(x, startX);
        cropData.y = Math.min(y, startY);
        updateCropBoxUI();
    });

    window.addEventListener('mouseup', () => {
        isDragging = false;
    });

    processBtn.addEventListener('click', async () => {
        if (!pdfLibDoc) return;
        
        activeWorkspace.classList.add('hidden');
        progressContainer.classList.remove('hidden');
        
        progressText.textContent = 'Cropping pages...';
        progressBarFill.style.width = '30%';
        progressPercent.textContent = '30%';

        const pages = pdfLibDoc.getPages();
        // Compute scaling ratio from canvas to actual PDF points
        // pdfLib uses points (72 per inch), canvas uses CSS pixels (which we scaled by 1.5)
        const pdfPage = pages[0];
        const { width: pdfWidth, height: pdfHeight } = pdfPage.getSize();
        
        const scaleX = pdfWidth / canvas.width;
        const scaleY = pdfHeight / canvas.height;

        const newX = cropData.x * scaleX;
        const newWidth = cropData.width * scaleX;
        const newHeight = cropData.height * scaleY;
        // Y is inverted in PDF coordinates
        const newY = pdfHeight - ((cropData.y + cropData.height) * scaleY);

        for (let i = 0; i < pages.length; i++) {
            pages[i].setCropBox(newX, newY, newWidth, newHeight);
            // It is often necessary to set MediaBox as well for some viewers
            // pages[i].setMediaBox(newX, newY, newWidth, newHeight);
        }

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
        a.download = pdfFile.name.replace('.pdf', '_cropped.pdf');
        a.click();
        URL.revokeObjectURL(url);
        
        setTimeout(() => {
            window.location.reload();
        }, 1500);
    });
});
