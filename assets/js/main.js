// main.js - App State & Orchestration
document.addEventListener('DOMContentLoaded', () => {
  // Initialize modules
  ZapUI.initUI();
  ZapUpload.initUpload();
  ZapCompress.init();

  // App State
  const state = {
    files: [], // { id, file, originalSize, compressedBytes, status }
    settings: {
      level: 'medium',
      targetSize: null,
      dpi: 150,
      removeMetadata: true,
      grayscale: false,
      flattenForms: false,
      removeThumbnails: false,
      subsetFonts: false,
      stripAnnotations: false
    },
    phase: 'idle' // idle | selected | compressing | done
  };

  // DOM Elements
  const els = {
    uploadZone: document.getElementById('upload-zone'),
    uploadCompact: document.getElementById('upload-compact'),
    fileCountText: document.getElementById('file-count-text'),
    fileList: document.getElementById('file-list'),
    controls: document.getElementById('compression-controls'),
    btnCompress: document.getElementById('btn-compress'),
    btnCompressText: document.getElementById('btn-compress-text'),
    progressContainer: document.getElementById('progress-bar-container'),
    resultsPanel: document.getElementById('results-panel'),
    resultsList: document.getElementById('results-list'),
    batchDownloadBar: document.getElementById('batch-download-bar'),
    btnDownloadZip: document.getElementById('btn-download-zip'),
    estimatedSizeText: document.getElementById('estimated-size-text')
  };

  // Events from Upload
  window.addEventListener('zap:filesSelected', (e) => {
    const newFiles = e.detail;
    state.files = newFiles.map((f, i) => ({
      id: Date.now() + i,
      file: f,
      originalSize: f.size,
      compressedBytes: null,
      status: 'pending' // pending | compressing | done | error
    }));
    state.phase = 'selected';
    render();
  });

  window.addEventListener('zap:filesCleared', () => {
    state.files = [];
    state.phase = 'idle';
    render();
  });

  window.addEventListener('zap:removeFile', (e) => {
    const idx = e.detail;
    state.files.splice(idx, 1);
    if (state.files.length === 0) {
      state.phase = 'idle';
    }
    render();
  });

  // Events from Controls
  window.addEventListener('zap:levelChanged', (e) => {
    state.settings.level = e.detail;
    updateEstimatedSize();
  });

  // DPI changes
  document.querySelectorAll('input[name="dpi"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
      state.settings.dpi = parseInt(e.target.value);
      updateEstimatedSize();
    });
  });

  // Custom size inputs
  const cSize = document.getElementById('custom-target-size');
  const cUnit = document.getElementById('custom-target-unit');
  if(cSize) cSize.addEventListener('input', () => updateEstimatedSize());
  if(cUnit) cUnit.addEventListener('change', () => updateEstimatedSize());

  // Compression Action
  if (els.btnCompress) {
      els.btnCompress.addEventListener('click', async () => {
        if (state.files.length === 0 || state.phase === 'compressing') return;
        
        // Read Settings
        const metaCb = document.getElementById('opt-metadata');
        if(metaCb) state.settings.removeMetadata = metaCb.checked;

        const formCb = document.getElementById('opt-forms');
        if(formCb) state.settings.flattenForms = formCb.checked;
        
        if (state.settings.level === 'custom' && cSize && cSize.value) {
          const val = parseFloat(cSize.value);
          const unit = cUnit ? cUnit.value : 'MB';
          if (val) {
            state.settings.targetSize = unit === 'MB' ? val * 1024 * 1024 : val * 1024;
          }
        } else {
          state.settings.targetSize = null;
        }

        state.phase = 'compressing';
        render();
        
        // Process sequentially
        for (let f of state.files) {
          f.status = 'compressing';
          await ZapCompress.compressFile(f, state.settings);
        }
      });
  }

  // Worker events
  window.addEventListener('zap:compressProgress', (e) => {
    const { fileId, percent } = e.detail;
    ZapUI.updateProgressBar(percent);
  });

  window.addEventListener('zap:compressDone', (e) => {
    const { fileId, compressedBytes, ext } = e.detail;
    const fileObj = state.files.find(f => f.id === fileId);
    if (fileObj) {
      fileObj.compressedBytes = compressedBytes;
      fileObj.ext = ext || 'pdf';
      fileObj.status = 'done';
    }
    
    // Check if all done
    const allDone = state.files.every(f => f.status === 'done' || f.status === 'error');
    if (allDone) {
      state.phase = 'done';
      ZapUI.updateProgressBar(100);
      
      let sessionSaved = 0;
      state.files.forEach(f => {
          if(f.status === 'done' && f.compressedBytes && f.file.size > f.compressedBytes.length) {
              sessionSaved += (f.file.size - f.compressedBytes.length);
          }
      });
      if(sessionSaved > 0) {
          let totalSaved = parseInt(localStorage.getItem('zap_saved_bytes') || '0');
          totalSaved += sessionSaved;
          localStorage.setItem('zap_saved_bytes', totalSaved);
          
          if (window.confetti) {
              window.confetti({
                  particleCount: 150,
                  spread: 80,
                  origin: { y: 0.6 },
                  colors: ['#FFD700', '#FFA500', '#FF8C00']
              });
          }
      }
      
      setTimeout(render, 500); // slight delay for progress bar fill
    }
  });

  window.addEventListener('zap:compressError', (e) => {
    const { fileId, message } = e.detail;
    const fileObj = state.files.find(f => f.id === fileId);
    if (fileObj) {
      fileObj.status = 'error';
      ZapUI.showToast(`Error compressing ${fileObj.file.name}: ${message}`, 'error');
    }
  });

  // Download ZIP
  if(els.btnDownloadZip) {
      els.btnDownloadZip.addEventListener('click', () => {
        const doneFiles = state.files.filter(f => f.status === 'done');
        const filesData = doneFiles.map(f => ({
          name: f.file.name,
          bytes: f.compressedBytes,
          ext: f.ext
        }));
        ZapDownload.downloadZip(filesData);
      });
  }

  // Render logic
  function render() {
    switch(state.phase) {
      case 'idle':
        els.uploadZone.classList.remove('hidden');
        els.uploadCompact.classList.add('hidden');
        els.fileList.classList.add('hidden');
        els.controls.classList.add('hidden');
        els.resultsPanel.classList.add('hidden');
        break;
        
      case 'selected':
        els.uploadZone.classList.add('hidden');
        els.uploadCompact.classList.remove('hidden');
        els.fileCountText.textContent = `${state.files.length} file(s) selected`;
        
        els.fileList.classList.remove('hidden');
        ZapUpload.renderFileList(state.files);
        
        els.controls.classList.remove('hidden');
        els.btnCompress.disabled = false;
        els.btnCompressText.textContent = `Compress ${state.files.length} PDF${state.files.length > 1 ? 's' : ''}`;
        els.btnCompress.innerHTML = `<img src="assets/icons/lightning.svg" width="20" height="20"> <span>${els.btnCompressText.textContent}</span>`;
        els.progressContainer.classList.add('hidden');
        els.resultsPanel.classList.add('hidden');
        updateEstimatedSize();
        break;

      case 'compressing':
        els.btnCompress.disabled = true;
        els.btnCompress.innerHTML = `<img src="assets/icons/lightning.svg" class="spinner" width="20" height="20"> <span>Compressing...</span>`;
        els.progressContainer.classList.remove('hidden');
        ZapUI.updateProgressBar(5);
        break;

      case 'done':
        els.controls.classList.add('hidden');
        els.fileList.classList.add('hidden');
        els.resultsPanel.classList.remove('hidden');
        
        renderResults();
        
        const statsContainer = document.getElementById('stats-container');
        const totalSavedText = document.getElementById('total-saved-bytes');
        const totalSaved = parseInt(localStorage.getItem('zap_saved_bytes') || '0');
        if (totalSaved > 0 && statsContainer && totalSavedText) {
            statsContainer.classList.remove('hidden');
            totalSavedText.textContent = (totalSaved / (1024 * 1024)).toFixed(2) + ' MB';
        }
        
        if (state.files.length > 1) {
          els.batchDownloadBar.classList.remove('hidden');
          let saved = 0;
          state.files.forEach(f => {
            if (f.status === 'done') saved += (f.originalSize - f.compressedBytes.length);
          });
          document.getElementById('batch-stats-text').textContent = 
            `${state.files.length} files compressed, total saved: ${ZapUI.formatBytes(saved)}`;
        } else {
          els.batchDownloadBar.classList.add('hidden');
        }
        break;
    }
  }

  function renderResults() {
    els.resultsList.innerHTML = '';
    state.files.forEach((f, index) => {
      if (f.status !== 'done') return;
      
      const newSize = f.compressedBytes.length;
      let percent = Math.round((1 - (newSize / f.originalSize)) * 100) || 0;
      if (percent < 0) percent = 0; // if it increased
      
      const card = document.createElement('div');
      card.className = 'result-card';
      card.style.animationDelay = `${index * 80}ms`;
      
      card.innerHTML = `
        <div class="result-header">
          <div class="result-filename">${f.file.name}</div>
          <div class="badge-success"><img src="assets/icons/checkmark.svg" width="14" height="14"> Done</div>
        </div>
        <div class="result-stats">
          <span class="stat-before">${ZapUI.formatBytes(f.originalSize)}</span>
          <span class="stat-arrow">→</span>
          <span class="stat-after">${ZapUI.formatBytes(newSize)}</span>
          <span class="stat-badge count-up-target">-${percent}%</span>
        </div>
        <div class="result-progress-bg">
          <div class="result-progress-fill" style="width: ${percent}%;"></div>
        </div>
        <div class="result-actions">
          <button class="btn btn-primary btn-sm btn-dl-single" data-id="${f.id}">
            <img src="assets/icons/download.svg" width="16" height="16"> Download
          </button>
        </div>
      `;
      els.resultsList.appendChild(card);
    });

    // Attach DL handlers
    els.resultsList.addEventListener('click', (e) => {
        if (e.target.closest('.btn-download')) {
          const id = parseInt(e.target.closest('.btn-download').dataset.id);
          const fileObj = state.files.find(f => f.id === id);
          if (fileObj && fileObj.compressedBytes) {
            ZapDownload.downloadSingle(fileObj.compressedBytes, fileObj.file.name, fileObj.ext);
          }
        }
    });
  }

  function updateEstimatedSize() {
    if (state.files.length === 0) return;
    
    let targetBytes = null;
    if (state.settings.level === 'custom' && cSize && cSize.value) {
        const val = parseFloat(cSize.value);
        const unit = cUnit ? cUnit.value : 'MB';
        if (val) targetBytes = unit === 'MB' ? val * 1024 * 1024 : val * 1024;
    }

    const totalOriginal = state.files.reduce((sum, f) => sum + f.originalSize, 0);
    const estNew = targetBytes ? targetBytes * state.files.length : ZapCompress.estimateSize(totalOriginal, state.settings.level, state.settings.dpi);
    
    if(els.estimatedSizeText) {
        els.estimatedSizeText.textContent = `Original: ${ZapUI.formatBytes(totalOriginal)} → Estimated: ~${ZapUI.formatBytes(estNew)}`;
    }

    // Update individual file estimates
    state.files.forEach((f, idx) => {
      if (!els.fileList) return;
      const fileCard = els.fileList.children[idx];
      if (fileCard) {
        const sizeDiv = fileCard.querySelector('.file-size');
        if (sizeDiv) {
          const fileEst = targetBytes ? targetBytes : ZapCompress.estimateSize(f.originalSize, state.settings.level, state.settings.dpi);
          sizeDiv.textContent = `${ZapUI.formatBytes(f.originalSize)} → ~${ZapUI.formatBytes(fileEst)}`;
        }
      }
    });
  }
});
