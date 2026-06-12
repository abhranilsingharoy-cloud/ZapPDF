// ui.js - DOM helpers, animations, accordion, tooltips
window.ZapUI = {
  initUI() {
    this.initNavMobile();
    this.initAccordion();
    this.initScrollAnimations();
    this.initLevelSlider();
    this.initParticles();
  },

  initParticles() {
    const container = document.getElementById('particles');
    if (!container) return;
    const canvas = document.createElement('canvas');
    container.appendChild(canvas);
    const ctx = canvas.getContext('2d');
    let width, height;
    const particles = [];
    const numParticles = window.innerWidth > 768 ? 60 : 25;
    
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
