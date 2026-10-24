// navbar.js - Global navigation, theme system, real-time search, and category filtering

(function () {
  'use strict';

  // ── 1. Immediate Theme Setup (prevents white/dark flash) ──────────────────
  (function applyStoredTheme() {
    var stored = localStorage.getItem('zap_theme');
    var preferLight = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches;
    var theme = stored || (preferLight ? 'light' : 'dark');
    if (theme === 'light') {
      document.body.classList.add('light-theme');
    } else {
      document.body.classList.remove('light-theme');
    }
  })();

  document.addEventListener('DOMContentLoaded', function () {

    // ── 2. Dynamic Theme Toggler (avoid duplicate listeners with theme.js) ─
    if (!window.ZapTheme) {
      function getTheme() {
        return localStorage.getItem('zap_theme') ||
          (document.body.classList.contains('light-theme') ? 'light' : 'dark');
      }

      function updateThemeUI(theme) {
        if (theme === 'light') {
          document.body.classList.add('light-theme');
        } else {
          document.body.classList.remove('light-theme');
        }

        document.querySelectorAll('.theme-toggle-btn').forEach(function (btn) {
          btn.innerHTML = theme === 'light' ? '🌙' : '☀️';
          btn.title = theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode';
          btn.setAttribute('aria-label', theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode');
        });
      }

      updateThemeUI(getTheme());

      document.addEventListener('click', function (e) {
        if (e.target.closest('.theme-toggle-btn')) {
          var current = getTheme();
          var next = current === 'dark' ? 'light' : 'dark';
          localStorage.setItem('zap_theme', next);
          updateThemeUI(next);
        }
      });
    } else {
      window.ZapTheme.updateIcons(window.ZapTheme.getStoredTheme());
    }

    // ── 3. Mobile Navigation Drawer ────────────────────────────────────────
    var mobileBtn = document.querySelector('.mobile-menu-btn');
    var navLinks = document.querySelector('.nav-links');

    if (mobileBtn && navLinks) {
      mobileBtn.addEventListener('click', function () {
        var isOpen = navLinks.classList.contains('mobile-open');
        if (isOpen) {
          navLinks.classList.remove('mobile-open');
          mobileBtn.setAttribute('aria-expanded', 'false');
        } else {
          navLinks.classList.add('mobile-open');
          mobileBtn.setAttribute('aria-expanded', 'true');
        }
      });

      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && navLinks.classList.contains('mobile-open')) {
          navLinks.classList.remove('mobile-open');
          mobileBtn.setAttribute('aria-expanded', 'false');
        }
      });
    }

    // ── 4. Dropdown Hover & Keyboard Access ─────────────────────────────────
    var dropdowns = document.querySelectorAll('.nav-dropdown');
    dropdowns.forEach(function (dd) {
      var toggle = dd.querySelector('.dropdown-toggle');
      var menu = dd.querySelector('.dropdown-menu');
      if (!toggle || !menu) return;

      toggle.addEventListener('click', function (e) {
        e.preventDefault();
      });

      toggle.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          var isOpen = menu.style.display === 'block';
          menu.style.display = isOpen ? '' : 'block';
        }
        if (e.key === 'Escape') menu.style.display = '';
      });
    });

    document.addEventListener('click', function (e) {
      if (!e.target.closest('.nav-dropdown')) {
        dropdowns.forEach(function (dd) {
          var menu = dd.querySelector('.dropdown-menu');
          if (menu) menu.style.display = '';
        });
      }
    });

    // ── 5. Category Filter System (uses clean CSS classes) ─────────────────
    var filterBtns = document.querySelectorAll('[data-filter-cat], .filter-tab-btn');
    var toolCards  = document.querySelectorAll('[data-categories]');

    if (filterBtns.length && toolCards.length) {
      filterBtns.forEach(function (btn) {
        btn.addEventListener('click', function () {
          var cat = btn.dataset.filterCat || btn.getAttribute('data-filter-cat') || 'all';

          filterBtns.forEach(function (b) {
            b.classList.remove('active');
            b.style.removeProperty('background');
            b.style.removeProperty('color');
            b.style.removeProperty('border');
          });

          btn.classList.add('active');

          var visibleCount = 0;
          toolCards.forEach(function (card) {
            var cats = (card.dataset.categories || '').toLowerCase();
            var matches = (cat === 'all' || cats.indexOf(cat.toLowerCase()) !== -1);
            card.style.display = matches ? '' : 'none';
            if (matches) visibleCount++;
          });

          updateEmptyState(visibleCount, cat);
        });
      });
    }

    // ── 6. Live Interactive Tool Search ────────────────────────────────────
    var searchInput = document.getElementById('tool-search-input') || document.querySelector('.hero-search-input');
    if (searchInput && toolCards.length) {
      searchInput.addEventListener('input', function (e) {
        var query = e.target.value.toLowerCase().trim();
        var visibleCount = 0;

        toolCards.forEach(function (card) {
          var title = (card.querySelector('h3')?.textContent || '').toLowerCase();
          var desc = (card.querySelector('p')?.textContent || '').toLowerCase();
          var cats = (card.dataset.categories || '').toLowerCase();

          var matches = !query || title.includes(query) || desc.includes(query) || cats.includes(query);
          card.style.display = matches ? '' : 'none';
          if (matches) visibleCount++;
        });

        // Also update filter tab state to All when searching
        if (query) {
          filterBtns.forEach(function (b) { b.classList.remove('active'); });
          var allBtn = document.querySelector('[data-filter-cat="all"]');
          if (allBtn) allBtn.classList.add('active');
        }

        updateEmptyState(visibleCount, query);
      });
    }

    function updateEmptyState(count, term) {
      var grid = document.querySelector('.features-grid');
      if (!grid) return;

      var existingEmpty = document.getElementById('search-empty-state');
      if (count === 0) {
        if (!existingEmpty) {
          var empty = document.createElement('div');
          empty.id = 'search-empty-state';
          empty.className = 'tools-empty-state';
          empty.innerHTML = `
            <div style="font-size:32px; margin-bottom:8px;">🔍</div>
            <h3 style="font-size:18px; font-weight:700; color:var(--color-text);">No tools found matching "${term}"</h3>
            <p style="color:var(--color-text-muted); font-size:14px; margin-bottom:16px;">Try searching for "merge", "split", "compress", or "word".</p>
            <button class="btn btn-outline btn-sm" onclick="document.querySelector('[data-filter-cat=\\'all\\']')?.click(); if(document.querySelector('.hero-search-input')) document.querySelector('.hero-search-input').value='';">View All Tools</button>
          `;
          grid.appendChild(empty);
        }
      } else {
        if (existingEmpty) existingEmpty.remove();
      }
    }

    // ── 7. FAQ Accordion Click Handler ──────────────────────────────────────
    var faqQuestions = document.querySelectorAll('.faq-question');
    faqQuestions.forEach(function (q) {
      q.addEventListener('click', function () {
        var item = q.closest('.faq-item');
        if (item) {
          var isActive = item.classList.contains('active');
          document.querySelectorAll('.faq-item').forEach(function (i) { i.classList.remove('active'); });
          if (!isActive) item.classList.add('active');
        }
      });
    });

  });
})();
