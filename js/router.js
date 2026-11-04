// js/router.js

function initRouter() {
  console.log('[Shahapur GIS - Router] Initializing SPA client hash router...');
  const allNavItems = document.querySelectorAll('.nav-item, .header-nav-item, .header-dropdown-item');
  const pageSections = document.querySelectorAll('.page-section');
  
  console.log('[Shahapur GIS - Router] Found', allNavItems.length, 'nav elements and', pageSections.length, 'page sections.');
  
  function handleRoute() {
    let hash = window.location.hash || '#/dashboard';
    
    // Default to dashboard if root hash is empty
    if (hash === '#/' || hash === '' || hash === '#') hash = '#/dashboard';
    
    const route = hash.replace('#/', '');
    console.info('[Shahapur GIS - Router] Navigating to route:', { hash, route });
    
    // Update active nav links across Sidebar & Header
    let matchedNavItems = 0;
    allNavItems.forEach(item => {
      if (item.getAttribute('data-route') === route) {
        item.classList.add('active');
        matchedNavItems++;
      } else {
        item.classList.remove('active');
      }
    });
    console.log('[Shahapur GIS - Router] Synchronized active state across', matchedNavItems, 'nav items for route:', route);

    // Update active section
    let foundSection = false;
    pageSections.forEach(section => {
      if (section.id === `sec-${route}`) {
        section.classList.add('active-section');
        foundSection = true;
      } else {
        section.classList.remove('active-section');
      }
    });

    if (!foundSection) {
      console.warn('[Shahapur GIS - Router] No DOM section container matching id #sec-' + route + ' was found.');
    } else {
      console.log('[Shahapur GIS - Router] Active section container mounted: #sec-' + route);
    }

    // Trigger page rendering
    try {
      if (route === 'dashboard') {
        if (typeof window.renderDashboard === 'function') {
          console.log('[Shahapur GIS - Router] Invoking window.renderDashboard()...');
          window.renderDashboard();
        } else {
          console.warn('[Shahapur GIS - Router] window.renderDashboard is not defined or not yet loaded.');
        }
      } else if (route === 'tax-records') {
        if (typeof window.renderTaxRecords === 'function') {
          console.log('[Shahapur GIS - Router] Invoking window.renderTaxRecords()...');
          window.renderTaxRecords();
        } else {
          console.warn('[Shahapur GIS - Router] window.renderTaxRecords is not defined or not yet loaded.');
        }
      } else if (route === 'reports') {
        if (typeof window.renderReports === 'function') {
          console.log('[Shahapur GIS - Router] Invoking window.renderReports()...');
          window.renderReports();
        } else {
          console.warn('[Shahapur GIS - Router] window.renderReports is not defined or not yet loaded.');
        }
      } else if (route === 'map') {
        console.log('[Shahapur GIS - Router] Route is "map". MapView container active.');
      } else {
        console.warn('[Shahapur GIS - Router] Unrecognized route:', route);
      }
    } catch (err) {
      console.error('[Shahapur GIS - Router] Error executing render callback for route "' + route + '":', err);
    }
  }
  
  // Listen for hash changes
  window.addEventListener('hashchange', () => {
    console.log('[Shahapur GIS - Router] Hash change event detected:', window.location.hash);
    handleRoute();
  });
  
  // Initial route handling
  handleRoute();
}

