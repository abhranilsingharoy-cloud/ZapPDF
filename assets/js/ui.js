// ui.js - DOM helpers, animations, accordion, tooltips
window.ZapUI = {
  initUI() {
    this.initNavMobile();
    this.initAccordion();
    this.initScrollAnimations();
    this.initLevelSlider();
    this.initParticles();
    this.initRecentFiles();
    this.initGlobalFileHandling();
    this.initModeBar();
    
    // Studio Mode Layout adjustments
    if (window.location.search.includes('studio=true')) {
        document.body.classList.add('studio-mode-active');
        const elsToHide = [
            '.navbar', '.footer', '.cta-section',
            '.tool-hero', '.mode-indicator-bar', '.breadcrumb',
            '.hero' // specifically for index.html
        ];
        elsToHide.forEach(sel => {
            const el = document.querySelector(sel);
            if (el) el.style.display = 'none';
        });

        // Hide all marketing sections (how it works, features, faq) across all tools
        document.querySelectorAll('.sections').forEach(section => {
            section.style.display = 'none';
        });

        // Globally intercept all downloads in iframes to route them to the Studio pipeline instead
        if (window.parent !== window) {
            const urlToBlobMap = new Map();
            const originalCreateObjectURL = URL.createObjectURL;
            URL.createObjectURL = function(obj) {
                const url = originalCreateObjectURL.call(URL, obj);
                if (obj instanceof Blob || obj instanceof File) {
                    urlToBlobMap.set(url, obj);
                }
                return url;
            };

            const originalClick = HTMLAnchorElement.prototype.click;
            HTMLAnchorElement.prototype.click = function() {
                if (this.download && this.href) {
                    // Some tools use data URIs, some use Object URLs
                    if (this.href.startsWith('blob:')) {
                        const blob = urlToBlobMap.get(this.href);
                        if (blob) {
                            const file = new File([blob], this.download, { type: blob.type || 'application/pdf' });
                            window.parent.postMessage({ type: 'ZAP_STUDIO_OUTPUT', file: file }, '*');
                            return;
                        }
                    }
                    // Fallback for data URIs or missing blobs
                    fetch(this.href).then(res => res.blob()).then(blob => {
                        const file = new File([blob], this.download, { type: blob.type || 'application/pdf' });
                        window.parent.postMessage({ type: 'ZAP_STUDIO_OUTPUT', file: file }, '*');
                    }).catch(err => console.error('Studio interception error:', err));
                    return; // Prevent standard browser download
                }
                originalClick.call(this);
            };
        }
    }
  },

  initModeBar() {
    // Only show on tool pages, not the homepage
    if (window.location.pathname.endsWith('index.html') || window.location.pathname === '/' || window.location.search.includes('studio=true')) return;
    
    const navbar = document.querySelector('.navbar');
    if (!navbar) return;

    // Extract mode name from the title tag
    let modeName = document.title.split('-')[0].split('|')[0].trim();
    if (!modeName) modeName = 'Tool Mode';

    const modeBar = document.createElement('div');
    modeBar.className = 'mode-indicator-bar';
    modeBar.innerHTML = `<div class="container" style="display: flex; align-items: center; gap: 8px;">
        <span style="font-size: 12px; opacity: 0.7;">ZapPDF</span>
        <span style="font-size: 10px; opacity: 0.5;">▶</span>
        <span style="font-size: 13px; font-weight: 600; color: var(--color-primary);">${modeName}</span>
    </div>`;
    
    // Insert right after the navbar
    navbar.parentNode.insertBefore(modeBar, navbar.nextSibling);
  },

  async initRecentFiles() {
    if (!window.ZapDB) return;
    const container = document.getElementById('recent-files-container');
    const list = document.getElementById('recent-files-list');
    if (!container || !list) return;

    try {
        const files = await window.ZapDB.getRecentFiles();
        if (files && files.length > 0) {
            container.style.display = 'block';
            list.innerHTML = '';
            files.forEach(fileRecord => {
                const card = document.createElement('div');
                card.className = 'recent-file-card';
                
                // Get relative prefix for icons depending on path
                const isSubfolder = window.location.pathname.includes('/tools/');
                const prefix = isSubfolder ? '../' : '';
                
                card.innerHTML = `
                    <div class="recent-file-icon">📄</div>
                    <div class="recent-file-info">
                        <div class="recent-file-name" title="${fileRecord.name}">${fileRecord.name}</div>
                        <div class="recent-file-meta">${this.formatBytes(fileRecord.size)} • ${new Date(fileRecord.timestamp).toLocaleDateString()}</div>
                    </div>
                `;
                
                card.addEventListener('click', () => {
                    // Dispatch an event that the tool scripts can listen to
                    window.dispatchEvent(new CustomEvent('zap:loadRecentFile', { detail: fileRecord.data }));
                });
                
                list.appendChild(card);
            });
        } else {
            container.style.display = 'none';
        }
    } catch (e) {
        console.error('Failed to load recent files:', e);
    }
  },

  initGlobalFileHandling() {
    // Automatically route Recent File clicks to the active tool
    window.addEventListener('zap:loadRecentFile', (e) => {
        const file = e.detail;
        const toolNames = ['ZapCompress', 'ZapSplit', 'ZapMerge', 'ZapConvert', 'ZapCrop', 'ZapEdit', 'ZapExtract', 'ZapNumber', 'ZapOCR', 'ZapOrganize', 'ZapProtect', 'ZapRedact', 'ZapRotate', 'ZapSign', 'ZapWatermark'];
        for (const name of toolNames) {
            if (window[name] && typeof window[name].handleFiles === 'function') {
                window[name].handleFiles([file]);
                window.scrollTo({top: 0, behavior: 'smooth'});
                return;
            }
        }
    });

    // Listen for Studio commands (Cross-iframe)
    window.addEventListener('message', (e) => {
        if (e.data && e.data.type === 'ZAP_STUDIO_LOAD') {
            const file = e.data.file;
            
            // Attempt 1: Route via Custom Event (if tool explicitly supports it)
            window.dispatchEvent(new CustomEvent('zap:loadRecentFile', { detail: file }));
            
            // Attempt 2: Programmatically trigger the file input (Universal fallback for all 15 tools)
            const input = document.getElementById('file-input');
            if (input) {
                const dt = new DataTransfer();
                dt.items.add(file);
                input.files = dt.files;
                input.dispatchEvent(new Event('change', { bubbles: true }));
            }
        }
    });

    // Automatically save newly uploaded files to IndexedDB
    document.addEventListener('change', (e) => {
        if (e.target && e.target.type === 'file' && e.target.files && e.target.files.length > 0) {
            if (window.ZapDB) {
                window.ZapDB.saveFile(e.target.files[0]).then(() => {
                    // Refresh recent files UI
                    this.initRecentFiles();
                });
            }
        }
    });
    
    // Also catch drag and drop
    document.addEventListener('drop', (e) => {
        if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            if (window.ZapDB) {
                window.ZapDB.saveFile(e.dataTransfer.files[0]).then(() => {
                    this.initRecentFiles();
                });
            }
        }
    });
  },

  initParticles() {
    const container = document.getElementById('particles');
    if (!container) return;
    const canvas = document.createElement('canvas');
    container.appendChild(canvas);
    const ctx = canvas.getContext('2d');
    let width, height;
    const particles = [];
    const numParticles = window.innerWidth > 768 ? 150 : 60;
    
    const resize = () => {
      width = container.clientWidth;
      height = container.clientHeight;
      canvas.width = width;
      canvas.height = height;
    };
    window.addEventListener('resize', resize);
    resize();
    
    for (let i = 0; i < numParticles; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        r: Math.random() * 2 + 0.5,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        alpha: Math.random() * 0.5 + 0.1
      });
    }
    
    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > width) p.vx *= -1;
        if (p.y < 0 || p.y > height) p.vy *= -1;
        
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 171, 0, ${p.alpha})`;
        ctx.fill();
      });
      requestAnimationFrame(draw);
    };
    draw();
  },

  initNavMobile() {
    const menuBtn = document.querySelector('.mobile-menu-btn');
    const overlay = document.querySelector('.mobile-nav-overlay');
    
    if (menuBtn && overlay) {
      menuBtn.addEventListener('click', () => {
        const isOpen = menuBtn.classList.contains('open');
        if (isOpen) {
          menuBtn.classList.remove('open');
          overlay.classList.remove('open');
          menuBtn.setAttribute('aria-expanded', 'false');
        } else {
          menuBtn.classList.add('open');
          overlay.classList.add('open');
          menuBtn.setAttribute('aria-expanded', 'true');
        }
      });
      
      const links = overlay.querySelectorAll('a');
      links.forEach(link => {
        link.addEventListener('click', () => {
          menuBtn.classList.remove('open');
          overlay.classList.remove('open');
          menuBtn.setAttribute('aria-expanded', 'false');
        });
      });
    }
  },

  initAccordion() {
    // Advanced options accordion
    const advTrigger = document.getElementById('advanced-options-trigger');
    const advContent = document.getElementById('advanced-options-content');
    if (advTrigger && advContent) {
      advTrigger.addEventListener('click', () => {
        const expanded = advTrigger.getAttribute('aria-expanded') === 'true';
        advTrigger.setAttribute('aria-expanded', !expanded);
        if (!expanded) {
          advContent.classList.add('open');
          advTrigger.querySelector('.chevron').style.transform = 'rotate(180deg)';
        } else {
          advContent.classList.remove('open');
          advTrigger.querySelector('.chevron').style.transform = 'rotate(0deg)';
        }
      });
    }

    // FAQ Accordion
    const faqQuestions = document.querySelectorAll('.faq-question');
    faqQuestions.forEach(btn => {
      btn.addEventListener('click', () => {
        const expanded = btn.getAttribute('aria-expanded') === 'true';
        // Close all others
        faqQuestions.forEach(b => b.setAttribute('aria-expanded', 'false'));
        if (!expanded) {
          btn.setAttribute('aria-expanded', 'true');
        }
      });
    });
  },

  initScrollAnimations() {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1 });

    document.querySelectorAll('.scroll-reveal').forEach(el => {
      observer.observe(el);
    });
  },

  initLevelSlider() {
    const tabs = document.querySelectorAll('.level-tab');
    const slider = document.getElementById('level-slider');
    const customWrapper = document.getElementById('custom-size-input-wrapper');
    
    if (tabs.length && slider) {
      tabs.forEach((tab, index) => {
        tab.addEventListener('click', () => {
          slider.value = index + 1;
          updateActiveTab(tab);
          window.dispatchEvent(new CustomEvent('zap:levelChanged', { detail: tab.dataset.level }));
        });
      });

      slider.addEventListener('input', (e) => {
        const val = parseInt(e.target.value);
        const activeTab = tabs[val - 1];
        updateActiveTab(activeTab);
        window.dispatchEvent(new CustomEvent('zap:levelChanged', { detail: activeTab.dataset.level }));
      });

      function updateActiveTab(activeEl) {
        tabs.forEach(t => t.classList.remove('active'));
        activeEl.classList.add('active');
        if (activeEl.dataset.level === 'custom') {
            if(customWrapper) customWrapper.classList.remove('hidden');
        } else {
            if(customWrapper) customWrapper.classList.add('hidden');
        }
      }
    }
  },

  showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    
    container.appendChild(toast);
    
    // trigger reflow
    void toast.offsetWidth;
    toast.classList.add('show');
    
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  },

  updateProgressBar(percent) {
    const bar = document.getElementById('progress-bar');
    if (bar) {
      bar.style.width = `${percent}%`;
    }
  },

  animateCounter(el, target) {
    let current = 0;
    const duration = 1000; // ms
    const stepTime = 20;
    const steps = duration / stepTime;
    const increment = target / steps;
    
    const timer = setInterval(() => {
      current += increment;
      if (current >= target) {
        current = target;
        clearInterval(timer);
      }
      el.textContent = Math.round(current) + '% smaller';
    }, stepTime);
  },
  
  formatBytes(bytes, decimals = 2) {
    if (!+bytes) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
  }
};

// Register Service Worker for PWA Offline Support
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then((registration) => {
      console.log('ServiceWorker registration successful with scope: ', registration.scope);
    }, (err) => {
      console.error('ServiceWorker registration failed: ', err);
    });
  });
}
