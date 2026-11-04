// js/auth.js

// Dummy credentials
const DUMMY_EMAIL = 'admin@gmail.com';
const DUMMY_PASS = '112233';

console.log('[Shahapur GIS - Auth] auth.js script loaded.');

function initLogin() {
  const loginForm = document.getElementById('login-form');
  if (loginForm) {
    console.log('[Shahapur GIS - Auth] Login form detected, attaching submit event listener.');
    loginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const email = document.getElementById('email').value;
      const pass = document.getElementById('password').value;
      const errorEl = document.getElementById('login-error');
      
      console.log('[Shahapur GIS - Auth] Login attempt received for email:', email);
      
      if (email === DUMMY_EMAIL && pass === DUMMY_PASS) {
        console.info('[Shahapur GIS - Auth] Authentication successful. Storing session token and redirecting to app.html...');
        sessionStorage.setItem('tax_portal_session', 'true');
        // Smooth fade out then redirect
        document.body.style.opacity = '0';
        document.body.style.transition = 'opacity 400ms ease';
        setTimeout(() => {
          window.location.href = 'app.html';
        }, 400);
      } else {
        console.warn('[Shahapur GIS - Auth] Authentication failed. Invalid email or password provided:', { email });
        errorEl.textContent = 'Invalid credentials. Please try again.';
        errorEl.classList.add('show');
        setTimeout(() => errorEl.classList.remove('show'), 3000);
      }
    });
  } else {
    console.log('[Shahapur GIS - Auth] No login form found on current page.');
  }
}

function checkAuth() {
  const hasSession = sessionStorage.getItem('tax_portal_session');
  const path = window.location.pathname;
  const isLoginPage = path.endsWith('index.html') || path.endsWith('/') || path.endsWith('POC--Shahpur') || path === '';
  
  console.log('[Shahapur GIS - Auth] Checking route authorization:', {
    hasActiveSession: !!hasSession,
    currentPath: path,
    isLoginPage: isLoginPage
  });
  
  if (!hasSession && !isLoginPage) {
    console.warn('[Shahapur GIS - Auth] Access denied: User is not authenticated. Redirecting to index.html...');
    window.location.href = 'index.html';
  } else if (hasSession && isLoginPage) {
    console.info('[Shahapur GIS - Auth] Active session found on login view. Auto-redirecting to app.html...');
    window.location.href = 'app.html';
  } else {
    console.info('[Shahapur GIS - Auth] Route guard check passed.');
  }
}

function initLogout() {
  const btnLogout = document.getElementById('btn-logout');
  if (btnLogout) {
    console.log('[Shahapur GIS - Auth] Logout button detected, binding click handler.');
    btnLogout.addEventListener('click', () => {
      console.info('[Shahapur GIS - Auth] User triggered logout. Clearing session token and redirecting to index.html...');
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
