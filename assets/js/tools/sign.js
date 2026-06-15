document.addEventListener('DOMContentLoaded', () => {
    const uploadZone = document.getElementById('upload-zone');
    const fileInput = document.getElementById('file-input');
    const activeWorkspace = document.getElementById('active-workspace');
    const processBtn = document.getElementById('process-btn');
    
    const progressContainer = document.getElementById('progress-container');
    const progressBarFill = document.getElementById('progress-bar-fill');
    const progressPercent = document.getElementById('progress-percent');
    const progressText = document.getElementById('progress-text');
    
    const container = document.getElementById('sign-container');
    const canvas = document.getElementById('pdf-canvas');
    const sigImg = document.getElementById('signature-img');
    const ctx = canvas.getContext('2d');

    const sigPad = document.getElementById('signature-pad');
    const sigCtx = sigPad.getContext('2d');
    const clearSigBtn = document.getElementById('clear-sig-btn');
    const saveSigBtn = document.getElementById('save-sig-btn');

    let pdfDoc = null;
    let pdfFile = null;
    let pdfLibDoc = null;

    let isDrawing = false;
    let sigDataUrl = null;

    let dragData = { x: 0, y: 0, isDragging: false, startX: 0, startY: 0 };

    // Setup Signature Pad
    sigCtx.lineWidth = 3;
    sigCtx.lineCap = 'round';
    sigCtx.lineJoin = 'round';
    sigCtx.strokeStyle = '#000000';

    const getPos = (e) => {
        const rect = sigPad.getBoundingClientRect();
        return {
            x: (e.clientX || (e.touches && e.touches[0].clientX)) - rect.left,
            y: (e.clientY || (e.touches && e.touches[0].clientY)) - rect.top
        };
    };

    const startDraw = (e) => {
        e.preventDefault();
        isDrawing = true;
        const pos = getPos(e);
        sigCtx.beginPath();
        sigCtx.moveTo(pos.x, pos.y);
    };

    const draw = (e) => {
        if (!isDrawing) return;
        e.preventDefault();
        const pos = getPos(e);
        sigCtx.lineTo(pos.x, pos.y);
        sigCtx.stroke();
    };

    const stopDraw = () => {
        isDrawing = false;
    };

    sigPad.addEventListener('mousedown', startDraw);
    sigPad.addEventListener('mousemove', draw);
    window.addEventListener('mouseup', stopDraw);
    sigPad.addEventListener('touchstart', startDraw, {passive: false});
    sigPad.addEventListener('touchmove', draw, {passive: false});
    window.addEventListener('touchend', stopDraw);

    clearSigBtn.addEventListener('click', () => {
        sigCtx.clearRect(0, 0, sigPad.width, sigPad.height);
        sigImg.style.display = 'none';
        sigDataUrl = null;
    });

    saveSigBtn.addEventListener('click', () => {
        sigDataUrl = sigPad.toDataURL('image/png');
        sigImg.src = sigDataUrl;
        sigImg.style.display = 'block';
        sigImg.style.left = '50px';
        sigImg.style.top = '50px';
        dragData.x = 50;
        dragData.y = 50;
        window.scrollTo({ top: container.offsetTop - 50, behavior: 'smooth' });
    });

    // Drag Signature on PDF
    sigImg.addEventListener('mousedown', (e) => {
        dragData.isDragging = true;
        dragData.startX = e.clientX - dragData.x;
        dragData.startY = e.clientY - dragData.y;
    });
    window.addEventListener('mousemove', (e) => {
        if (!dragData.isDragging) return;
        dragData.x = e.clientX - dragData.startX;
        dragData.y = e.clientY - dragData.startY;
        sigImg.style.left = dragData.x + 'px';
        sigImg.style.top = dragData.y + 'px';
    });
    window.addEventListener('mouseup', () => {
        dragData.isDragging = false;
    });

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
        container.style.width = viewport.width + 'px';
        container.style.height = viewport.height + 'px';

        await page.render({ canvasContext: ctx, viewport: viewport }).promise;
    }

    processBtn.addEventListener('click', async () => {
        if (!pdfLibDoc || !sigDataUrl) return alert('Please upload a PDF and create a signature first.');
        
        activeWorkspace.classList.add('hidden');
        progressContainer.classList.remove('hidden');
        progressText.textContent = 'Applying signature...';
        progressBarFill.style.width = '30%';
        progressPercent.textContent = '30%';

        const pages = pdfLibDoc.getPages();
        const pdfPage = pages[0]; // Assuming placing on first page for simplicity
        const { width: pdfWidth, height: pdfHeight } = pdfPage.getSize();
        
        const scaleX = pdfWidth / canvas.width;
        const scaleY = pdfHeight / canvas.height;

        const pngImage = await pdfLibDoc.embedPng(sigDataUrl);
        const pngDims = pngImage.scale(0.5); // scale down a bit

        // Convert CSS drag coordinates to PDF points
        const newX = dragData.x * scaleX;
        // Y is inverted in PDF, and we subtract image height to align top-left
        const newY = pdfHeight - (dragData.y * scaleY) - (sigImg.offsetHeight * scaleY);
        
        pdfPage.drawImage(pngImage, {
            x: newX,
            y: newY,
            width: sigImg.offsetWidth * scaleX,
            height: sigImg.offsetHeight * scaleY,
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
        a.download = pdfFile.name.replace('.pdf', '_signed.pdf');
        a.click();
        URL.revokeObjectURL(url);
        
        setTimeout(() => window.location.reload(), 1500);
    });
});
