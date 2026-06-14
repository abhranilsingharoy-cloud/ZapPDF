document.addEventListener('DOMContentLoaded', () => {
    const uploadZone = document.getElementById('upload-zone');
    const fileInput = document.getElementById('file-input');
    const activeWorkspace = document.getElementById('active-workspace');
    const processBtn = document.getElementById('process-btn');
    
    const renderCanvas = document.getElementById('pdf-render-canvas');
    const renderCtx = renderCanvas.getContext('2d');
    const drawLayer = document.getElementById('draw-layer');
    const drawCtx = drawLayer.getContext('2d');
    
    const prevBtn = document.getElementById('prev-page');
    const nextBtn = document.getElementById('next-page');
    const pageIndicator = document.getElementById('page-indicator');
    const undoBtn = document.getElementById('undo-btn');
    
    const progressContainer = document.getElementById('progress-container');
    const progressBarFill = document.getElementById('progress-bar-fill');
    const progressPercent = document.getElementById('progress-percent');
    const progressText = document.getElementById('progress-text');

    let originalPdfBytes = null;
    let pdfDoc = null;
    let pdfFile = null;
    let currentPageNum = 1;
    
    // Structure: { pageIndex: [ {x, y, w, h}, ... ] }
    // We store coordinates relative to the original viewport size
    let redactions = {};
    let currentViewport = null;

    // Setup Drag & Drop for Upload
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

    async function handleFile(file) {
        if (file.type !== 'application/pdf') {
            alert('Please select a valid PDF file.');
            return;
        }
        
        uploadZone.style.display = 'none';
        activeWorkspace.style.display = 'block';
        
        pdfFile = file;
        originalPdfBytes = new Uint8Array(await file.arrayBuffer());
        
        try {
            const loadingTask = pdfjsLib.getDocument({ data: originalPdfBytes });
            pdfDoc = await loadingTask.promise;
            
            currentPageNum = 1;
            redactions = {};
            await renderPage(currentPageNum);
            updatePagination();
        } catch (e) {
            console.error("Error loading PDF", e);
            alert("Failed to load PDF");
        }
    }

    async function renderPage(pageNum) {
        const page = await pdfDoc.getPage(pageNum);
        
        // Calculate scale to fit width (max 800px)
        const unscaledViewport = page.getViewport({ scale: 1.0 });
        const scale = Math.min(800 / unscaledViewport.width, 1.5);
        currentViewport = page.getViewport({ scale });

        renderCanvas.width = currentViewport.width;
        renderCanvas.height = currentViewport.height;
        drawLayer.width = currentViewport.width;
        drawLayer.height = currentViewport.height;
        
        const renderContext = {
            canvasContext: renderCtx,
            viewport: currentViewport
        };
        await page.render(renderContext).promise;
        redrawRedactions();
    }

    function updatePagination() {
        pageIndicator.textContent = `Page ${currentPageNum} / ${pdfDoc.numPages}`;
        prevBtn.disabled = currentPageNum <= 1;
        nextBtn.disabled = currentPageNum >= pdfDoc.numPages;
    }

    prevBtn.addEventListener('click', async () => {
        if (currentPageNum > 1) {
            currentPageNum--;
            await renderPage(currentPageNum);
            updatePagination();
        }
    });

    nextBtn.addEventListener('click', async () => {
        if (currentPageNum < pdfDoc.numPages) {
            currentPageNum++;
            await renderPage(currentPageNum);
            updatePagination();
        }
    });

    // Drawing Logic
    let isDrawing = false;
    let startX = 0;
    let startY = 0;

    drawLayer.addEventListener('mousedown', (e) => {
        isDrawing = true;
        const rect = drawLayer.getBoundingClientRect();
        startX = e.clientX - rect.left;
        startY = e.clientY - rect.top;
    });

    drawLayer.addEventListener('mousemove', (e) => {
        if (!isDrawing) return;
        const rect = drawLayer.getBoundingClientRect();
        const currentX = e.clientX - rect.left;
        const currentY = e.clientY - rect.top;

        redrawRedactions();
        drawCtx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        drawCtx.fillRect(startX, startY, currentX - startX, currentY - startY);
    });

    drawLayer.addEventListener('mouseup', (e) => {
        if (!isDrawing) return;
        isDrawing = false;
        const rect = drawLayer.getBoundingClientRect();
        const endX = e.clientX - rect.left;
        const endY = e.clientY - rect.top;

        const width = endX - startX;
        const height = endY - startY;

        if (Math.abs(width) > 5 && Math.abs(height) > 5) {
            // Save redaction for this page
            const pageIndex = currentPageNum - 1;
            if (!redactions[pageIndex]) redactions[pageIndex] = [];
            
            // Normalize coordinates (handle backwards dragging)
            const normalizedRect = {
                x: width > 0 ? startX : endX,
                y: height > 0 ? startY : endY,
                w: Math.abs(width),
                h: Math.abs(height)
            };
            
            redactions[pageIndex].push(normalizedRect);
        }
        redrawRedactions();
    });

    drawLayer.addEventListener('mouseleave', () => {
        if (isDrawing) {
            isDrawing = false;
            redrawRedactions();
        }
    });

    undoBtn.addEventListener('click', () => {
        const pageIndex = currentPageNum - 1;
        if (redactions[pageIndex] && redactions[pageIndex].length > 0) {
            redactions[pageIndex].pop();
            redrawRedactions();
        }
    });

    function redrawRedactions() {
        drawCtx.clearRect(0, 0, drawLayer.width, drawLayer.height);
        const pageIndex = currentPageNum - 1;
        if (redactions[pageIndex]) {
            drawCtx.fillStyle = 'black';
            redactions[pageIndex].forEach(r => {
                drawCtx.fillRect(r.x, r.y, r.w, r.h);
            });
        }
    }

    processBtn.addEventListener('click', async () => {
        const hasRedactions = Object.values(redactions).some(arr => arr.length > 0);
        if (!hasRedactions) {
            alert('No redactions drawn. Draw black boxes over text before processing.');
            return;
        }

        processBtn.disabled = true;
        progressContainer.style.display = 'block';
        progressText.textContent = 'Applying Redactions...';
        progressBarFill.style.width = '10%';
        progressPercent.textContent = '10%';

        try {
            const originalPdfLib = await PDFLib.PDFDocument.load(originalPdfBytes);
            const newPdf = await PDFLib.PDFDocument.create();
            
            const totalPages = originalPdfLib.getPageCount();
            const step = 80 / totalPages;

            for (let i = 0; i < totalPages; i++) {
                if (redactions[i] && redactions[i].length > 0) {
                    // Page has redactions. We must flatten it for security.
                    // We'll render the page with redactions to an image canvas.
                    const page = await pdfDoc.getPage(i + 1);
                    // Render at high resolution for quality
                    const viewport = page.getViewport({ scale: 2.5 }); 
                    
                    const tempCanvas = document.createElement('canvas');
                    const tempCtx = tempCanvas.getContext('2d');
                    tempCanvas.width = viewport.width;
                    tempCanvas.height = viewport.height;
                    
                    await page.render({
                        canvasContext: tempCtx,
                        viewport: viewport
                    }).promise;
                    
                    // Draw redactions on temp canvas
                    // We need to scale the redaction coordinates from currentViewport to this new high-res viewport
                    const scaleFactorX = viewport.width / currentViewport.width;
                    const scaleFactorY = viewport.height / currentViewport.height;
                    
                    tempCtx.fillStyle = 'black';
                    redactions[i].forEach(r => {
                        tempCtx.fillRect(r.x * scaleFactorX, r.y * scaleFactorY, r.w * scaleFactorX, r.h * scaleFactorY);
                    });
                    
                    // Convert to image
                    const imgDataUrl = tempCanvas.toDataURL('image/jpeg', 0.95);
                    const imgBytes = await fetch(imgDataUrl).then(res => res.arrayBuffer());
                    const pdfImage = await newPdf.embedJpg(imgBytes);
                    
                    // Create new page with exactly the image dimensions
                    const newPage = newPdf.addPage([viewport.width, viewport.height]);
                    newPage.drawImage(pdfImage, {
                        x: 0, y: 0, width: viewport.width, height: viewport.height
                    });
                } else {
                    // No redactions, just copy the page over losslessly
                    const [copiedPage] = await newPdf.copyPages(originalPdfLib, [i]);
                    newPdf.addPage(copiedPage);
                }
                
                let currentProgress = 10 + (i + 1) * step;
                progressBarFill.style.width = `${currentProgress}%`;
                progressPercent.textContent = `${Math.round(currentProgress)}%`;
            }

            progressText.textContent = 'Saving PDF...';
            const pdfBytes = await newPdf.save();
            
            progressBarFill.style.width = '100%';
            progressPercent.textContent = '100%';
            progressText.textContent = 'Done!';
            
            const blob = new Blob([pdfBytes], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `redacted_${pdfFile.name}`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            setTimeout(() => {
                processBtn.disabled = false;
                progressContainer.style.display = 'none';
            }, 2000);
            
        } catch (error) {
            console.error("Error redacting PDF:", error);
            alert("An error occurred while redacting the PDF.");
            processBtn.disabled = false;
            progressContainer.style.display = 'none';
        }
    });
});
