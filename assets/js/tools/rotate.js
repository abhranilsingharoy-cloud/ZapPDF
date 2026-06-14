document.addEventListener('DOMContentLoaded', () => {
    const uploadZone = document.getElementById('upload-zone');
    const fileInput = document.getElementById('file-input');
    const activeWorkspace = document.getElementById('active-workspace');
    const processBtn = document.getElementById('process-btn');
    const pageGrid = document.getElementById('page-grid');
    
    const rotateAllLeftBtn = document.getElementById('rotate-all-left');
    const rotateAllRightBtn = document.getElementById('rotate-all-right');
    const addMoreBtn = document.getElementById('add-more-btn');

    const progressContainer = document.getElementById('progress-container');
    const progressBarFill = document.getElementById('progress-bar-fill');
    const progressPercent = document.getElementById('progress-percent');
    const progressText = document.getElementById('progress-text');

    let originalPdfBytes = null;
    let pdfDoc = null;
    let pdfFile = null;
    let pagesData = []; // Array to hold page objects: { originalIndex, rotation }

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

    addMoreBtn.addEventListener('click', () => {
        fileInput.click();
    });

    async function handleFile(file) {
        if (file.type !== 'application/pdf') {
            alert('Please select a valid PDF file.');
            return;
        }
        
        uploadZone.style.display = 'none';
        activeWorkspace.style.display = 'block';
        pageGrid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 40px;">Loading PDF...</div>';
        
        pdfFile = file;
        originalPdfBytes = new Uint8Array(await file.arrayBuffer());
        
        await renderThumbnails(originalPdfBytes);
    }

    async function renderThumbnails(pdfBytes) {
        try {
            const loadingTask = pdfjsLib.getDocument({ data: pdfBytes });
            pdfDoc = await loadingTask.promise;
            
            pageGrid.innerHTML = '';
            pagesData = [];

            for (let i = 1; i <= pdfDoc.numPages; i++) {
                const pageData = { originalIndex: i - 1, rotation: 0 };
                pagesData.push(pageData);
                
                const pageItem = document.createElement('div');
                pageItem.className = 'page-item';
                
                const wrapper = document.createElement('div');
                wrapper.className = 'canvas-wrapper';

                const canvas = document.createElement('canvas');
                const label = document.createElement('div');
                label.className = 'page-label';
                label.textContent = `Page ${i}`;
                
                const rotateBtn = document.createElement('button');
                rotateBtn.className = 'rotate-btn';
                rotateBtn.innerHTML = 'Rotate ↻';
                rotateBtn.onclick = () => {
                    pageData.rotation = (pageData.rotation + 90) % 360;
                    canvas.style.transform = `rotate(${pageData.rotation}deg)`;
                };

                wrapper.appendChild(canvas);
                pageItem.appendChild(wrapper);
                pageItem.appendChild(label);
                pageItem.appendChild(rotateBtn);
                pageGrid.appendChild(pageItem);
                
                // Render thumbnail
                const page = await pdfDoc.getPage(i);
                const viewport = page.getViewport({ scale: 0.5 });
                canvas.width = viewport.width;
                canvas.height = viewport.height;
                await page.render({
                    canvasContext: canvas.getContext('2d'),
                    viewport: viewport
                }).promise;
                
                // Store reference to canvas to bulk update
                pageData.canvas = canvas;
            }
        } catch (error) {
            console.error("Error rendering thumbnails:", error);
            pageGrid.innerHTML = '<div style="grid-column: 1/-1; color: #ef4444;">Failed to render PDF.</div>';
        }
    }

    rotateAllLeftBtn.addEventListener('click', () => {
        pagesData.forEach(p => {
            p.rotation = (p.rotation - 90) % 360;
            p.canvas.style.transform = `rotate(${p.rotation}deg)`;
        });
    });

    rotateAllRightBtn.addEventListener('click', () => {
        pagesData.forEach(p => {
            p.rotation = (p.rotation + 90) % 360;
            p.canvas.style.transform = `rotate(${p.rotation}deg)`;
        });
    });

    processBtn.addEventListener('click', async () => {
        processBtn.disabled = true;
        progressContainer.style.display = 'block';
        progressText.textContent = 'Generating PDF...';
        progressBarFill.style.width = '50%';
        progressPercent.textContent = '50%';

        try {
            const originalPdf = await PDFLib.PDFDocument.load(originalPdfBytes);
            const pages = originalPdf.getPages();
            
            pagesData.forEach(p => {
                if (p.rotation !== 0) {
                    const page = pages[p.originalIndex];
                    const currentRotation = page.getRotation().angle;
                    page.setRotation(PDFLib.degrees(currentRotation + p.rotation));
                }
            });

            progressBarFill.style.width = '90%';
            progressPercent.textContent = '90%';

            const pdfBytes = await originalPdf.save();
            
            progressBarFill.style.width = '100%';
            progressPercent.textContent = '100%';
            progressText.textContent = 'Done!';
            
            const blob = new Blob([pdfBytes], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `rotated_${pdfFile.name}`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            setTimeout(() => {
                processBtn.disabled = false;
                progressContainer.style.display = 'none';
            }, 2000);
            
        } catch (error) {
            console.error("Error rotating PDF:", error);
            alert("An error occurred while rotating the PDF.");
            processBtn.disabled = false;
            progressContainer.style.display = 'none';
        }
    });
});
