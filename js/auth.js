// js/auth.js

// Dummy credentials
const DUMMY_EMAIL = 'admin@gmail.com';
const DUMMY_PASS = '112233';

function initLogin() {
  const loginForm = document.getElementById('login-form');
  if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const email = document.getElementById('email').value;
      const pass = document.getElementById('password').value;
      const errorEl = document.getElementById('login-error');
      
      if (email === DUMMY_EMAIL && pass === DUMMY_PASS) {
        sessionStorage.setItem('tax_portal_session', 'true');
        // Smooth fade out then redirect
        document.body.style.opacity = '0';
        document.body.style.transition = 'opacity 400ms ease';
        setTimeout(() => {
          window.location.href = 'app.html';
        }, 400);
      } else {
        errorEl.textContent = 'Invalid credentials. Please try again.';
        errorEl.classList.add('show');
        setTimeout(() => errorEl.classList.remove('show'), 3000);
      }
    });
  }
}

function checkAuth() {
  const hasSession = sessionStorage.getItem('tax_portal_session');
  const isLoginPage = window.location.pathname.endsWith('index.html') || window.location.pathname === '/';
  
  if (!hasSession && !isLoginPage) {
    // Redirect to login if not authenticated
    window.location.href = 'index.html';
  } else if (hasSession && isLoginPage) {
    // Redirect to app if already authenticated
    window.location.href = 'app.html';
  }
}

function initLogout() {
  const btnLogout = document.getElementById('btn-logout');
  if (btnLogout) {
    btnLogout.addEventListener('click', () => {
      sessionStorage.removeItem('tax_portal_session');
      window.location.href = 'index.html';
    });
  }
}

// Auto-init on script load
if (document.getElementById('login-form')) {
  initLogin();
}
if (document.getElementById('btn-logout')) {
  initLogout();
}
checkAuth();
