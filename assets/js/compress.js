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
    }, [arrayBuffer]); // Transferable
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
