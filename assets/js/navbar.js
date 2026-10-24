// navbar.js - Shared navigation logic for all ZapPDF pages
// Handles: mobile menu, dropdowns, theme toggle, category filter
(function () {
  'use strict';

  // ── 1. Theme (runs immediately to prevent flash) ──────────────────────────
  (function applyTheme() {
    var stored = localStorage.getItem('zap_theme');
    var preferLight = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches;
    var theme = stored || (preferLight ? 'light' : 'dark');
    if (theme === 'light') document.body.classList.add('light-theme');
  })();

  document.addEventListener('DOMContentLoaded', function () {

    // ── 2. Theme Toggle ───────────────────────────────────────────────────────
    function getTheme() {
      return localStorage.getItem('zap_theme') ||
        (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
    }

    function applyTheme(theme) {
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

    applyTheme(getTheme());

    document.addEventListener('click', function (e) {
      if (e.target.closest('.theme-toggle-btn')) {
        var next = getTheme() === 'dark' ? 'light' : 'dark';
        localStorage.setItem('zap_theme', next);
        applyTheme(next);
      }
    });

    // ── 3. Mobile Menu ────────────────────────────────────────────────────────
    var mobileBtn = document.querySelector('.mobile-menu-btn');
    var navLinks = document.querySelector('.nav-links');

    if (mobileBtn && navLinks) {
      mobileBtn.style.display = ''; // Ensure visible on mobile via CSS
      mobileBtn.addEventListener('click', function () {
        var isOpen = mobileBtn.getAttribute('aria-expanded') === 'true';
        mobileBtn.setAttribute('aria-expanded', String(!isOpen));
        if (!isOpen) {
          navLinks.style.cssText = 'display:flex !important; flex-direction:column; position:fixed; top:72px; left:0; right:0; background:white; z-index:200; padding:16px 24px; border-bottom:1px solid #e5e7eb; box-shadow:0 4px 12px rgba(0,0,0,0.1); gap:16px;';
        } else {
          navLinks.style.cssText = '';
        }
      });

      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && mobileBtn.getAttribute('aria-expanded') === 'true') {
          mobileBtn.setAttribute('aria-expanded', 'false');
          navLinks.style.cssText = '';
        }
      });
    }

    // ── 4. Dropdown Menus (hover + keyboard) ─────────────────────────────────
    var dropdowns = document.querySelectorAll('.nav-dropdown');
    dropdowns.forEach(function (dd) {
      var toggle = dd.querySelector('.dropdown-toggle');
      var menu = dd.querySelector('.dropdown-menu');
      if (!toggle || !menu) return;

      toggle.addEventListener('click', function (e) { e.preventDefault(); });

      dd.addEventListener('mouseenter', function () { menu.style.display = 'block'; });
      dd.addEventListener('mouseleave', function () { menu.style.display = ''; });

      toggle.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          menu.style.display = menu.style.display === 'block' ? '' : 'block';
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

    // ── 5. Category Filter ────────────────────────────────────────────────────
    var filterBtns = document.querySelectorAll('[data-filter-cat]');
    var toolCards  = document.querySelectorAll('[data-categories]');

    if (filterBtns.length && toolCards.length) {
      filterBtns.forEach(function (btn) {
        btn.addEventListener('click', function () {
          var cat = btn.dataset.filterCat;
          filterBtns.forEach(function (b) {
            b.style.background = '#ffffff';
            b.style.color = '#4b5563';
            b.style.border = '1px solid #e5e7eb';
          });
          btn.style.background = '#333333';
          btn.style.color = '#ffffff';
          btn.style.border = 'none';
          toolCards.forEach(function (card) {
            var cats = (card.dataset.categories || '').toLowerCase();
            card.style.display = (cat === 'all' || cats.indexOf(cat.toLowerCase()) !== -1) ? '' : 'none';
          });
        });
      });
    }

    // ── 6. Tool Search ────────────────────────────────────────────────────────
    var searchInput = document.getElementById('tool-search');
    if (searchInput && toolCards.length) {
      searchInput.addEventListener('input', function () {
        var q = searchInput.value.toLowerCase().trim();
        toolCards.forEach(function (card) {
          card.style.display = (!q || card.textContent.toLowerCase().indexOf(q) !== -1) ? '' : 'none';
        });
      });
    }

  }); // DOMContentLoaded
})();
