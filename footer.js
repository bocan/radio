const disclaimerLink = document.getElementById('disclaimerLink');
const disclaimerModal = document.getElementById('disclaimerModal');
const closeDisclaimer = document.getElementById('closeDisclaimer');

disclaimerLink.addEventListener('click', (e) => {
  e.preventDefault();
  disclaimerModal.style.display = 'block';
  disclaimerModal.setAttribute('aria-hidden', 'false');
});

closeDisclaimer.addEventListener('click', () => {
  disclaimerModal.style.display = 'none';
  disclaimerModal.setAttribute('aria-hidden', 'true');
});

// Allow ESC to close
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    disclaimerModal.style.display = 'none';
    disclaimerModal.setAttribute('aria-hidden', 'true');
  }
});

