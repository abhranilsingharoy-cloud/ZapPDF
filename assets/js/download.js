// download.js - FileSaver and JSZip wrapper
window.ZapDownload = {
  downloadSingle(bytes, originalName, ext = 'pdf') {
    const mime = ext === 'pdf' ? 'application/pdf' : `image/${ext === 'jpg' ? 'jpeg' : ext}`;
    const blob = new Blob([bytes], { type: mime });
    const oldExt = originalName.split('.').pop();
    const newName = originalName.replace(new RegExp(`\\.${oldExt}$`), `-compressed.${ext}`);
    
    if (window.location.search.includes('studio=true') && window.parent !== window) {
        window.parent.postMessage({ 
            type: 'ZAP_STUDIO_OUTPUT', 
            file: new File([blob], newName, { type: mime }) 
        }, '*');
        ZapUI.showToast('File sent back to Studio!', 'success');
        return;
    }
    saveAs(blob, newName);
  },

  async downloadZip(filesData) {
    if (window.location.search.includes('studio=true') && window.parent !== window) {
        // In studio mode, we can't easily chain a ZIP of multiple files into a single-file pipeline,
        // so we'll just send the first file back, or alert the user.
        if (filesData.length === 1) {
            const item = filesData[0];
            const mime = item.ext === 'pdf' ? 'application/pdf' : `image/${item.ext === 'jpg' ? 'jpeg' : item.ext}`;
            const oldExt = item.name.split('.').pop();
            const newName = item.name.replace(new RegExp(`\\.${oldExt}$`), `-compressed.${item.ext || 'pdf'}`);
            window.parent.postMessage({ 
                type: 'ZAP_STUDIO_OUTPUT', 
                file: new File([item.bytes], newName, { type: mime }) 
            }, '*');
            ZapUI.showToast('File sent back to Studio!', 'success');
            return;
        }
    }

    if (!window.JSZip) {
      ZapUI.showToast('JSZip library missing', 'error');
      return;
    }
    
    const zip = new JSZip();
    
    filesData.forEach(item => {
      const oldExt = item.name.split('.').pop();
      const newName = item.name.replace(new RegExp(`\\.${oldExt}$`), `-compressed.${item.ext || 'pdf'}`);
      zip.file(newName, item.bytes);
    });
    
    const content = await zip.generateAsync({ type: 'blob' });
    saveAs(content, 'zappdf-compressed.zip');
  }
};
