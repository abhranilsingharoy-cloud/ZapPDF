// compress.js - communication with worker
window.ZapCompress = {
  worker: null,
  
  init() {
    if (window.Worker) {
      this.worker = new Worker('assets/js/worker.js');
      
      this.worker.onmessage = (e) => {
        const { type, payload } = e.data;
        if (type === 'PROGRESS') {
          window.dispatchEvent(new CustomEvent('zap:compressProgress', { detail: payload }));
        } else if (type === 'DONE') {
          window.dispatchEvent(new CustomEvent('zap:compressDone', { detail: payload }));
        } else if (type === 'ERROR') {
          window.dispatchEvent(new CustomEvent('zap:compressError', { detail: payload }));
        }
      };
    } else {
      ZapUI.showToast('Web Workers not supported by your browser.', 'error');
    }
  },

  async compressFile(fileObj, settings) {
    const type = fileObj.file.type;
    const isImage = type.startsWith('image/');
    const isPDF = type === 'application/pdf';

    // Image Compression Logic
    if (isImage || !isPDF) {
      try {
        window.dispatchEvent(new CustomEvent('zap:compressProgress', { detail: { fileId: fileObj.id, percent: 10 } }));
        
        let compressedFile = fileObj.file;
        
        let targetFile = fileObj.file;
        const ext = fileObj.file.name.split('.').pop().toLowerCase();

        if (ext === 'psd' && window.agPsd) {
            window.dispatchEvent(new CustomEvent('zap:compressProgress', { detail: { fileId: fileObj.id, percent: 20 } }));
            const buffer = await fileObj.file.arrayBuffer();
            const psd = window.agPsd.readPsd(buffer);
            const blob = await new Promise(r => psd.canvas.toBlob(r, 'image/jpeg', 1.0));
            targetFile = new File([blob], fileObj.file.name.replace(/\.[^/.]+$/, ".jpg"), { type: 'image/jpeg' });
        } else if ((ext === 'tiff' || ext === 'tif') && window.UTIF) {
            window.dispatchEvent(new CustomEvent('zap:compressProgress', { detail: { fileId: fileObj.id, percent: 20 } }));
            const buffer = await fileObj.file.arrayBuffer();
            const ifds = window.UTIF.decode(buffer);
            window.UTIF.decodeImage(buffer, ifds[0]);
            const rgba = window.UTIF.toRGBA8(ifds[0]);
            const canvas = document.createElement('canvas');
            canvas.width = ifds[0].width;
            canvas.height = ifds[0].height;
            const ctx = canvas.getContext('2d');
            const imgData = ctx.createImageData(canvas.width, canvas.height);
            imgData.data.set(rgba);
            ctx.putImageData(imgData, 0, 0);
            const blob = await new Promise(r => canvas.toBlob(r, 'image/jpeg', 1.0));
            targetFile = new File([blob], fileObj.file.name.replace(/\.[^/.]+$/, ".jpg"), { type: 'image/jpeg' });
        } else if (ext === 'raw' || ext === 'eps' || ext === 'cr2' || ext === 'nef') {
             throw new Error(`${ext.toUpperCase()} compression requires desktop software. Please convert to TIFF or JPG first.`);
        }

        if (targetFile.type === 'image/jpeg' || targetFile.type === 'image/png') {
          const options = {
            maxSizeMB: settings.level === 'high' ? 0.5 : settings.level === 'medium' ? 1 : 2,
            maxWidthOrHeight: settings.dpi === 300 ? 1920 : settings.dpi === 96 ? 1280 : 800,
            useWebWorker: true
          };
          window.dispatchEvent(new CustomEvent('zap:compressProgress', { detail: { fileId: fileObj.id, percent: 50 } }));
          compressedFile = await imageCompression(targetFile, options);
        } else {
           window.dispatchEvent(new CustomEvent('zap:compressProgress', { detail: { fileId: fileObj.id, percent: 50 } }));
           compressedFile = targetFile;
        }

        window.dispatchEvent(new CustomEvent('zap:compressProgress', { detail: { fileId: fileObj.id, percent: 100 } }));
        
        const arrayBuffer = await compressedFile.arrayBuffer();
        window.dispatchEvent(new CustomEvent('zap:compressDone', { 
          detail: { fileId: fileObj.id, compressedBytes: new Uint8Array(arrayBuffer), ext: compressedFile.name.split('.').pop() } 
        }));
      } catch (e) {
        window.dispatchEvent(new CustomEvent('zap:compressError', { detail: { fileId: fileObj.id, message: e.message } }));
      }
      return;
    }

    // PDF Logic
    if (settings.level === 'custom') {
      await this.compressCustomTarget(fileObj, settings);
      return;
    }

    if (!this.worker) {
      ZapUI.showToast('Compression engine not initialized', 'error');
      return;
    }
    
    const arrayBuffer = await fileObj.file.arrayBuffer();
    
    this.worker.postMessage({
      type: 'COMPRESS',
      payload: {
        fileId: fileObj.id,
        bytes: arrayBuffer,
        settings: settings
      }
    }, [arrayBuffer]);
  },

  async compressCustomTarget(fileObj, settings) {
    try {
      window.dispatchEvent(new CustomEvent('zap:compressProgress', { detail: { fileId: fileObj.id, percent: 5 } }));
      
      const pdfjsLib = window['pdfjs-dist/build/pdf'] || window.pdfjsLib;
      if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      }

      const arrayBuffer = await fileObj.file.arrayBuffer();
      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
      const pdf = await loadingTask.promise;
      const numPages = pdf.numPages;

      let targetSize = settings.targetSize || (1 * 1024 * 1024);
      let scale = 1.5;
      if (settings.dpi === 72) scale = 0.75;
      else if (settings.dpi === 96) scale = 1.0;
      else if (settings.dpi === 300) scale = 3.0;

      // Heuristic quality determination
      let quality = Math.max(0.1, Math.min(0.9, targetSize / fileObj.originalSize));

      const pdfDoc = await PDFLib.PDFDocument.create();
      
      for (let i = 1; i <= numPages; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: scale });
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        const renderContext = { canvasContext: ctx, viewport: viewport };
        await page.render(renderContext).promise;

        const imgDataUrl = canvas.toDataURL('image/jpeg', quality);
        const imgBytes = await fetch(imgDataUrl).then(res => res.arrayBuffer());
        
        const pdfImage = await pdfDoc.embedJpg(imgBytes);
        const pdfPage = pdfDoc.addPage([viewport.width, viewport.height]);
        pdfPage.drawImage(pdfImage, {
          x: 0,
          y: 0,
          width: viewport.width,
          height: viewport.height,
        });
        
        const progress = 5 + Math.round((i / numPages) * 85);
        window.dispatchEvent(new CustomEvent('zap:compressProgress', { detail: { fileId: fileObj.id, percent: progress } }));
      }
      
      const pdfBytes = await pdfDoc.save({ useObjectStreams: true });
      window.dispatchEvent(new CustomEvent('zap:compressProgress', { detail: { fileId: fileObj.id, percent: 100 } }));
      
      window.dispatchEvent(new CustomEvent('zap:compressDone', { 
        detail: { fileId: fileObj.id, compressedBytes: pdfBytes } 
      }));

    } catch (e) {
      window.dispatchEvent(new CustomEvent('zap:compressError', { detail: { fileId: fileObj.id, message: e.message } }));
    }
  },
  
  estimateSize(originalSize, level, dpi = 150) {
    // Rough estimation constants
    const multipliers = {
      'low': 0.8,
      'medium': 0.5,
      'high': 0.3,
      'extreme': 0.15
    };
    let base = multipliers[level] || 0.5;
    
    // Adjust based on DPI
    if (dpi === 72) base *= 0.6;
    else if (dpi === 96) base *= 0.8;
    else if (dpi === 300) base *= 1.5;
    
    // Ensure we don't estimate an increase for standard compression
    if (base > 0.95) base = 0.95;
    
    return originalSize * base;
  }
};
