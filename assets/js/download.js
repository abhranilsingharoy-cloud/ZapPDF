// download.js - FileSaver and JSZip wrapper
window.ZapDownload = {
  downloadSingle(bytes, originalName, ext = 'pdf') {
    const mime = ext === 'pdf' ? 'application/pdf' : `image/${ext === 'jpg' ? 'jpeg' : ext}`;
    const blob = new Blob([bytes], { type: mime });
    const oldExt = originalName.split('.').pop();
    const newName = originalName.replace(new RegExp(`\\.${oldExt}$`), `-compressed.${ext}`);
    saveAs(blob, newName);
  },

  async downloadZip(filesData) {
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
