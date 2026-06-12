// upload.js - drag/drop, validation, list UI
window.ZapUpload = {
  initUpload() {
    const dropZone = document.getElementById('upload-zone');
    const fileInput = document.getElementById('file-input');
    const changeBtn = document.getElementById('btn-change-files');
    const uploadLink = document.querySelector('.upload-link');

    if (!dropZone || !fileInput) return;

    // Click to browse
    if (uploadLink) {
        uploadLink.addEventListener('click', () => fileInput.click());
    }
    dropZone.addEventListener('click', (e) => {
      if (e.target.tagName !== 'SPAN') fileInput.click();
    });

    // Drag and drop events
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
      dropZone.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
      e.preventDefault();
      e.stopPropagation();
    }

    ['dragenter', 'dragover'].forEach(eventName => {
      dropZone.addEventListener(eventName, () => {
        dropZone.classList.add('dragover');
      }, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
      dropZone.addEventListener(eventName, () => {
        dropZone.classList.remove('dragover');
      }, false);
    });

    dropZone.addEventListener('drop', (e) => {
      let dt = e.dataTransfer;
      let files = dt.files;
      this.handleFiles(files);
    });

    fileInput.addEventListener('change', function() {
      window.ZapUpload.handleFiles(this.files);
    });

    if (changeBtn) {
      changeBtn.addEventListener('click', () => {
        fileInput.value = '';
        window.dispatchEvent(new CustomEvent('zap:filesCleared'));
      });
    }
  },

  handleFiles(fileList) {
    const validFiles = [];
    const MAX_FILES = 5;
    const MAX_SIZE = 100 * 1024 * 1024; // 100MB

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      const validTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/tiff', 'image/x-raw', 'image/vnd.adobe.photoshop', 'application/postscript', 'image/svg+xml'];
      const ext = file.name.split('.').pop().toLowerCase();
      const validExts = ['pdf', 'jpg', 'jpeg', 'png', 'tiff', 'tif', 'raw', 'cr2', 'nef', 'psd', 'eps', 'svg'];
      if (!validTypes.includes(file.type) && !validExts.includes(ext)) {
        ZapUI.showToast(`Skipped ${file.name} - Unsupported format`, 'error');
        continue;
      }
      if (file.size > MAX_SIZE) {
        ZapUI.showToast(`Skipped ${file.name} - Over 100MB limit`, 'error');
        continue;
      }
      validFiles.push(file);
    }

    if (validFiles.length > MAX_FILES) {
      ZapUI.showToast(`Max ${MAX_FILES} files allowed. Using first ${MAX_FILES}.`, 'error');
      validFiles.splice(MAX_FILES);
    }

    if (validFiles.length > 0) {
      window.dispatchEvent(new CustomEvent('zap:filesSelected', { detail: validFiles }));
    }
  },

  renderFileList(files) {
    const list = document.getElementById('file-list');
    if (!list) return;
    list.innerHTML = '';
    
    files.forEach((fileObj, index) => {
      const card = document.createElement('div');
      card.className = 'file-card';
      card.style.animationDelay = `${index * 80}ms`;
      
      card.innerHTML = `
        <div class="file-info">
          <img src="assets/icons/upload.svg" width="24" height="24" style="color:var(--color-primary);">
          <div class="file-name" title="${fileObj.file.name}">${fileObj.file.name}</div>
          <div class="file-size">${ZapUI.formatBytes(fileObj.originalSize)}</div>
        </div>
        <button class="btn-remove" data-index="${index}" title="Remove file">×</button>
      `;
      
      list.appendChild(card);
    });

    // Attach remove handlers
    document.querySelectorAll('.btn-remove').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = parseInt(e.currentTarget.dataset.index);
        window.dispatchEvent(new CustomEvent('zap:removeFile', { detail: idx }));
      });
    });
  }
};
