(function () {
  const KEY = 'theme'; // 'dark' | 'light' | null (system)
  const root = document.documentElement;
  const btn  = document.getElementById('themeToggle');
  const sun  = document.getElementById('iconSun');
  const moon = document.getElementById('iconMoon');

  function setIcon(theme) {
    // If theme = 'dark' => show sun (clicking would go to light)
    // If theme = 'light' or system => show moon (clicking would go to dark)
    if (theme === 'dark') {
      sun.style.display = '';
      moon.style.display = 'none';
    } else {
      sun.style.display = 'none';
      moon.style.display = '';
    }
  }

  function applyTheme(theme) {
    if (!theme) root.removeAttribute('data-theme');       // follow system
    else root.setAttribute('data-theme', theme);           // force override
    setIcon(theme);
  }

  // load saved override if present
  const saved = localStorage.getItem(KEY);
  applyTheme(saved); // null means "system"

  // toggle handler
  btn.addEventListener('click', () => {
    const current = root.getAttribute('data-theme'); // 'dark' | 'light' | null
    const next = current === 'dark' ? 'light' : 'dark';
    localStorage.setItem(KEY, next);
    applyTheme(next);
  });

  // Optional: reset to system default via context menu (right-click)
  btn.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    localStorage.removeItem(KEY);
    applyTheme(null); // back to system
  }, false);
})();
