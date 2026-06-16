// theme.js - Light/Dark Theme Toggle Logic

window.ZapTheme = {
    init() {
        this.applyTheme(this.getStoredTheme());
        this.bindEvents();
    },

    getStoredTheme() {
        const stored = localStorage.getItem('zap_theme');
        if (stored) return stored;
        
        // Default to dark, but check system preference for light
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
            return 'light';
        }
        return 'dark'; // ZapPDF's default native theme is dark
    },

    applyTheme(theme) {
        if (theme === 'light') {
            document.body.classList.add('light-theme');
        } else {
            document.body.classList.remove('light-theme');
        }
        this.updateIcons(theme);
    },

    toggleTheme() {
        const current = this.getStoredTheme();
        const next = current === 'dark' ? 'light' : 'dark';
        localStorage.setItem('zap_theme', next);
        this.applyTheme(next);
    },

    updateIcons(theme) {
        const buttons = document.querySelectorAll('.theme-toggle-btn');
        buttons.forEach(btn => {
            if (theme === 'light') {
                btn.innerHTML = '🌙';
                btn.title = 'Switch to Dark Mode';
            } else {
                btn.innerHTML = '☀️';
                btn.title = 'Switch to Light Mode';
            }
        });
    },

    bindEvents() {
        document.addEventListener('click', (e) => {
            if (e.target.closest('.theme-toggle-btn')) {
                this.toggleTheme();
            }
        });
    }
};

// Run early to prevent flash of wrong theme
ZapTheme.init();
