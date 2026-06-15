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

    let pdfFile = null;

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
        
        pdfFile = file;
        uploadZone.style.display = 'none';
        activeWorkspace.classList.remove('hidden');
        document.getElementById('page-grid').innerHTML = '<div style="padding: 40px; color: var(--color-text-muted); grid-column: 1/-1; text-align: center;">PDF Loaded. Ready to Extract Images.</div>';

        // Save to DB
        if(window.ZapDB) window.ZapDB.saveFile(file);
    }

    processBtn.addEventListener('click', async () => {
        if (!pdfFile) return;
        
        activeWorkspace.classList.add('hidden');
        progressContainer.classList.remove('hidden');
        
        try {
            const arrayBuffer = await pdfFile.arrayBuffer();
            const loadingTask = pdfjsLib.getDocument(arrayBuffer);
            const pdf = await loadingTask.promise;
            const zip = new JSZip();
            let imageCount = 0;

            for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
                progressPercent.textContent = Math.round((pageNum / pdf.numPages) * 50) + '%';
                progressText.textContent = `Scanning Page ${pageNum} of ${pdf.numPages}...`;
                progressBarFill.style.width = Math.round((pageNum / pdf.numPages) * 50) + '%';

                const page = await pdf.getPage(pageNum);
                const ops = await page.getOperatorList();

                for (let i = 0; i < ops.fnArray.length; i++) {
                    if (ops.fnArray[i] === pdfjsLib.OPS.paintImageXObject || 
                        ops.fnArray[i] === pdfjsLib.OPS.paintInlineImageXObject) {
                        
                        const imgId = ops.argsArray[i][0];
                        try {
                            const img = await page.objs.get(imgId);
                            if (img && img.data && img.width && img.height) {
                                // Convert raw image data to canvas, then to blob
                                const canvas = document.createElement('canvas');
                                canvas.width = img.width;
                                canvas.height = img.height;
                                const ctx = canvas.getContext('2d');
                                
                                // Create ImageData
                                const imgData = ctx.createImageData(img.width, img.height);
                                // Many PDF images are RGB, pdfjs handles the decoding
                                // but if it's grayscale or CMYK, pdfjs usually normalizes it
                                if (img.data.length === img.width * img.height * 4) {
                                    imgData.data.set(img.data);
                                } else if (img.data.length === img.width * img.height * 3) {
                                    // RGB to RGBA
                                    for(let j=0, k=0; j < img.data.length; j+=3, k+=4) {
                                        imgData.data[k] = img.data[j];
                                        imgData.data[k+1] = img.data[j+1];
                                        imgData.data[k+2] = img.data[j+2];
                                        imgData.data[k+3] = 255;
                                    }
                                } else {
                                    // Fallback / skip for weird formats
                                    continue;
                                }
                                
                                ctx.putImageData(imgData, 0, 0);
                                
                                const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
                                imageCount++;
                                zip.file(`image_${pageNum}_${imageCount}.png`, blob);
                            }
                        } catch(e) {
                            console.warn('Failed to extract image on page ' + pageNum, e);
                        }
                    }
                }
            }

            progressText.textContent = `Packaging ${imageCount} images into ZIP...`;
            progressBarFill.style.width = '80%';
            progressPercent.textContent = '80%';

            if (imageCount === 0) {
                alert('No extractable images found in this PDF.');
                window.location.reload();
                return;
            }

            const zipBlob = await zip.generateAsync({ type: 'blob' }, (metadata) => {
                let pct = 80 + (metadata.percent * 0.2);
                progressBarFill.style.width = pct + '%';
                progressPercent.textContent = Math.round(pct) + '%';
            });
            
            progressText.textContent = 'Done!';
            progressBarFill.style.width = '100%';
            progressPercent.textContent = '100%';

            saveAs(zipBlob, pdfFile.name.replace('.pdf', '_images.zip'));
            
            setTimeout(() => {
                window.location.reload();
            }, 1500);

        } catch (error) {
            console.error('Error extracting images:', error);
            alert('An error occurred while extracting images. See console for details.');
            window.location.reload();
        }
    });
});
