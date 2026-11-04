// js/router.js

function initRouter() {
  const allNavItems = document.querySelectorAll('.nav-item, .header-nav-item, .header-dropdown-item');
  const pageSections = document.querySelectorAll('.page-section');
  
  function handleRoute() {
    let hash = window.location.hash || '#/dashboard';
    
    // Default to dashboard if root hash is empty
    if (hash === '#/') hash = '#/dashboard';
    
    const route = hash.replace('#/', '');
    
    // Update active nav links across Sidebar & Header
    allNavItems.forEach(item => {
      if (item.getAttribute('data-route') === route) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });

    
    // Update active section
    pageSections.forEach(section => {
      if (section.id === `sec-${route}`) {
        section.classList.add('active-section');
      } else {
        section.classList.remove('active-section');
      }
    });

    // Trigger page rendering
    if (route === 'dashboard' && window.renderDashboard) {
      window.renderDashboard();
    } else if (route === 'tax-records' && window.renderTaxRecords) {
      window.renderTaxRecords();
    } else if (route === 'reports' && window.renderReports) {
      window.renderReports();
    }
  }
  
  // Listen for hash changes
  window.addEventListener('hashchange', handleRoute);
  
  // Initial route handling
  handleRoute();
}

