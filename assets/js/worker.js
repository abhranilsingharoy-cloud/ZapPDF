// worker.js - Background compression using pdf-lib
importScripts('https://cdnjs.cloudflare.com/ajax/libs/pdf-lib/1.17.1/pdf-lib.min.js');

self.onmessage = async (e) => {
  const { type, payload } = e.data;
  
  if (type === 'COMPRESS') {
    try {
      const { fileId, bytes, settings } = payload;
      
      self.postMessage({ type: 'PROGRESS', payload: { fileId, percent: 10 } });
      
      // Load PDF
      const pdfDoc = await PDFLib.PDFDocument.load(bytes, { ignoreEncryption: true });
      self.postMessage({ type: 'PROGRESS', payload: { fileId, percent: 30 } });
      
      // Apply Settings
      if (settings.removeMetadata) {
        pdfDoc.setTitle('');
        pdfDoc.setAuthor('');
        pdfDoc.setSubject('');
        pdfDoc.setKeywords([]);
        pdfDoc.setProducer('');
        pdfDoc.setCreator('');
      }
      
      if (settings.flattenForms) {
        const form = pdfDoc.getForm();
        if (form) {
          form.flatten();
        }
      }

      // Compression logic:
      // Real client-side re-encoding of images is extremely heavy in pure JS.
      // Here we rely on PDFLib's save parameters and stripping logic.
      // Use ObjectStreams for size reduction
      const pdfBytes = await pdfDoc.save({ useObjectStreams: true });
      
      self.postMessage({ type: 'PROGRESS', payload: { fileId, percent: 100 } });
      
      // Post result back
      self.postMessage({ 
        type: 'DONE', 
        payload: { 
          fileId: fileId,
          compressedBytes: pdfBytes
        } 
      }, [pdfBytes.buffer]);
      
    } catch (error) {
      self.postMessage({ 
        type: 'ERROR', 
        payload: { 
          fileId: payload.fileId,
          message: error.message 
        } 
      });
    }
  }
};
