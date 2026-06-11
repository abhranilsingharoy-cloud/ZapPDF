// download.js - FileSaver and JSZip wrapper
window.ZapDownload = {
  downloadSingle(bytes, originalName) {
    const blob = new Blob([bytes], { type: 'application/pdf' });
    const newName = originalName.replace('.pdf', '-compressed.pdf');
    saveAs(blob, newName);
  },

  async downloadZip(filesData) {
    if (!window.JSZip) {
      ZapUI.showToast('JSZip library missing', 'error');
      return;
    }
    
    const zip = new JSZip();
    
    filesData.forEach(item => {
      const newName = item.name.replace('.pdf', '-compressed.pdf');
      zip.file(newName, item.bytes);
    });
    
    const content = await zip.generateAsync({ type: 'blob' });
    saveAs(content, 'zappdf-compressed.zip');
  }
};
