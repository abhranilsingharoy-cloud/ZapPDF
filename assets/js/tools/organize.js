document.addEventListener('DOMContentLoaded', () => {
    const uploadZone = document.getElementById('upload-zone');
    const fileInput = document.getElementById('file-input');
    const activeWorkspace = document.getElementById('active-workspace');
    const processBtn = document.getElementById('process-btn');
    const pageGrid = document.getElementById('page-grid');
    
    const progressContainer = document.getElementById('progress-container');
    const progressBarFill = document.getElementById('progress-bar-fill');
    const progressPercent = document.getElementById('progress-percent');
    const progressText = document.getElementById('progress-text');
    const addMoreBtn = document.getElementById('add-more-btn');

    let originalPdfBytes = null;
    let pdfDoc = null;
    let pdfFile = null;
    let pagesData = []; // Array to hold page objects: { originalIndex: number }

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
                pagesData.push({ originalIndex: i - 1, id: `page-${i-1}` });
                
                const pageItem = document.createElement('div');
                pageItem.className = 'page-item';
                pageItem.draggable = true;
                pageItem.dataset.id = `page-${i-1}`;
                
                const canvas = document.createElement('canvas');
                const label = document.createElement('div');
                label.className = 'page-label';
                label.textContent = `Page ${i}`;
                
                const deleteBtn = document.createElement('button');
                deleteBtn.className = 'delete-btn';
                deleteBtn.innerHTML = '✕';
                deleteBtn.onclick = (e) => {
                    e.stopPropagation();
                    pageItem.remove();
                    updatePagesData();
                };

                pageItem.appendChild(canvas);
                pageItem.appendChild(label);
                pageItem.appendChild(deleteBtn);
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
                
                // Setup drag and drop logic for reordering
                setupDragAndDrop(pageItem);
            }
        } catch (error) {
            console.error("Error rendering thumbnails:", error);
            pageGrid.innerHTML = '<div style="grid-column: 1/-1; color: #ef4444;">Failed to render PDF.</div>';
        }
    }

    function updatePagesData() {
        // Rebuild pagesData based on current DOM order
        const items = Array.from(pageGrid.querySelectorAll('.page-item'));
        pagesData = items.map(item => {
            const id = item.dataset.id;
            const originalIndex = parseInt(id.replace('page-', ''));
            return { originalIndex, id };
        });
        
        // Update labels
        items.forEach((item, idx) => {
            item.querySelector('.page-label').textContent = `Page ${idx + 1}`;
        });
    }

    let draggedItem = null;
    function setupDragAndDrop(item) {
        item.addEventListener('dragstart', (e) => {
            draggedItem = item;
            setTimeout(() => item.classList.add('dragging'), 0);
        });
        item.addEventListener('dragend', () => {
            draggedItem.classList.remove('dragging');
            draggedItem = null;
            updatePagesData();
        });
    }

    pageGrid.addEventListener('dragover', (e) => {
        e.preventDefault();
        const afterElement = getDragAfterElement(pageGrid, e.clientX, e.clientY);
        if (draggedItem) {
            if (afterElement == null) {
                pageGrid.appendChild(draggedItem);
            } else {
                pageGrid.insertBefore(draggedItem, afterElement);
            }
        }
    });

    function getDragAfterElement(container, x, y) {
        const draggableElements = [...container.querySelectorAll('.page-item:not(.dragging)')];
        
        return draggableElements.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            // Calculate distance considering grid layout
            const offsetX = x - box.left - box.width / 2;
            const offsetY = y - box.top - box.height / 2;
            const distance = Math.sqrt(offsetX*offsetX + offsetY*offsetY);
            
            if (distance < closest.distance) {
                return { offset: distance, element: child };
            } else {
                return closest;
            }
        }, { distance: Number.POSITIVE_INFINITY }).element;
    }

    processBtn.addEventListener('click', async () => {
        if (pagesData.length === 0) {
            alert('No pages left to save.');
            return;
        }

        processBtn.disabled = true;
        progressContainer.style.display = 'block';
        progressText.textContent = 'Generating PDF...';
        progressBarFill.style.width = '50%';
        progressPercent.textContent = '50%';

        try {
            const originalPdf = await PDFLib.PDFDocument.load(originalPdfBytes);
            const newPdf = await PDFLib.PDFDocument.create();
            
            const indicesToCopy = pagesData.map(p => p.originalIndex);
            const copiedPages = await newPdf.copyPages(originalPdf, indicesToCopy);
            
            copiedPages.forEach((page) => {
                newPdf.addPage(page);
            });

            progressBarFill.style.width = '90%';
            progressPercent.textContent = '90%';

            const pdfBytes = await newPdf.save();
            
            progressBarFill.style.width = '100%';
            progressPercent.textContent = '100%';
            progressText.textContent = 'Done!';
            
            const blob = new Blob([pdfBytes], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `organized_${pdfFile.name}`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            setTimeout(() => {
                processBtn.disabled = false;
                progressContainer.style.display = 'none';
            }, 2000);
            
        } catch (error) {
            console.error("Error organizing PDF:", error);
            alert("An error occurred while organizing the PDF.");
            processBtn.disabled = false;
            progressContainer.style.display = 'none';
        }
    });
});
