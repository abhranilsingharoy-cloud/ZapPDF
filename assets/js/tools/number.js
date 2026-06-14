document.addEventListener('DOMContentLoaded', () => {
    const uploadZone = document.getElementById('upload-zone');
    const fileInput = document.getElementById('file-input');
    const activeWorkspace = document.getElementById('active-workspace');
    const processBtn = document.getElementById('process-btn');
    
    const positionSelect = document.getElementById('position');
    const formatSelect = document.getElementById('format');
    const addMoreBtn = document.getElementById('add-more-btn');
    
    const progressContainer = document.getElementById('progress-container');
    const progressBarFill = document.getElementById('progress-bar-fill');
    const progressPercent = document.getElementById('progress-percent');
    const progressText = document.getElementById('progress-text');

    let originalPdfBytes = null;
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
        
        uploadZone.style.display = 'none';
        activeWorkspace.style.display = 'block';
        
        pdfFile = file;
        originalPdfBytes = new Uint8Array(await file.arrayBuffer());
    }

    processBtn.addEventListener('click', async () => {
        processBtn.disabled = true;
        progressContainer.style.display = 'block';
        progressText.textContent = 'Adding Page Numbers...';
        progressBarFill.style.width = '10%';
        progressPercent.textContent = '10%';

        try {
            const pdfDoc = await PDFLib.PDFDocument.load(originalPdfBytes);
            
            // Embed the Helvetica font
            const helveticaFont = await pdfDoc.embedFont(PDFLib.StandardFonts.Helvetica);
            
            const pages = pdfDoc.getPages();
            const totalPages = pages.length;
            
            const position = positionSelect.value;
            const formatStr = formatSelect.value;
            const fontSize = 12;
            const margin = 20;

            for (let i = 0; i < totalPages; i++) {
                const page = pages[i];
                const { width, height } = page.getSize();
                
                // Format text
                const text = formatStr
                    .replace('{n}', (i + 1).toString())
                    .replace('{t}', totalPages.toString());
                    
                const textWidth = helveticaFont.widthOfTextAtSize(text, fontSize);
                
                let x = margin;
                let y = margin;
                
                // Calculate X and Y based on position string
                if (position.includes('center')) {
                    x = (width / 2) - (textWidth / 2);
                } else if (position.includes('right')) {
                    x = width - textWidth - margin;
                }
                // default left is x = margin
                
                if (position.includes('top')) {
                    y = height - margin - fontSize;
                }
                // default bottom is y = margin
                
                page.drawText(text, {
                    x: x,
                    y: y,
                    size: fontSize,
                    font: helveticaFont,
                    color: PDFLib.rgb(0, 0, 0),
                });
                
                let currentProgress = 10 + ((i + 1) / totalPages) * 80;
                progressBarFill.style.width = `${currentProgress}%`;
                progressPercent.textContent = `${Math.round(currentProgress)}%`;
            }

            progressText.textContent = 'Saving PDF...';
            const pdfBytes = await pdfDoc.save();
            
            progressBarFill.style.width = '100%';
            progressPercent.textContent = '100%';
            progressText.textContent = 'Done!';
            
            const blob = new Blob([pdfBytes], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `numbered_${pdfFile.name}`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            setTimeout(() => {
                processBtn.disabled = false;
                progressContainer.style.display = 'none';
            }, 2000);
            
        } catch (error) {
            console.error("Error adding page numbers:", error);
            alert("An error occurred while processing the PDF.");
            processBtn.disabled = false;
            progressContainer.style.display = 'none';
        }
    });
});
