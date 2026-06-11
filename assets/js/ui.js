// ui.js - DOM helpers, animations, accordion, tooltips
window.ZapUI = {
  initUI() {
    this.initNavMobile();
    this.initAccordion();
    this.initScrollAnimations();
    this.initLevelSlider();
    this.initTargetToggle();
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
      }
    }
  },

  initTargetToggle() {
    const toggle = document.getElementById('target-size-toggle');
    const inputs = document.getElementById('target-size-inputs');
    if (toggle && inputs) {
      toggle.addEventListener('change', (e) => {
        if (e.target.checked) {
          inputs.classList.remove('hidden');
        } else {
          inputs.classList.add('hidden');
        }
      });
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
