// js/sidebar.js

function initSidebar() {
  console.log('[Shahapur GIS - Sidebar] Initializing sidebar and header navigation controls...');
  const sidebar = document.getElementById('app-sidebar');
  const toggleBtn = document.getElementById('btn-toggle-sidebar');
  const headerModulesBtn = document.getElementById('btn-header-modules');
  const headerModulesMenu = document.getElementById('header-modules-menu');
  const dropdownCollapseBtn = document.getElementById('btn-collapse-sidebar-item');

  function toggleSidebarState() {
    if (!sidebar) {
      console.warn('[Shahapur GIS - Sidebar] #app-sidebar element not found.');
      return;
    }
    sidebar.classList.toggle('collapsed');
    const isCollapsed = sidebar.classList.contains('collapsed');
    console.log('[Shahapur GIS - Sidebar] Sidebar toggled. Collapsed state:', isCollapsed);
    setTimeout(() => {
      console.log('[Shahapur GIS - Sidebar] Dispatching window resize event for chart and map reflow.');
      window.dispatchEvent(new Event('resize'));
    }, 400);
  }

  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      console.log('[Shahapur GIS - Sidebar] Toggle button clicked.');
      toggleSidebarState();
    });
  }

  if (dropdownCollapseBtn) {
    dropdownCollapseBtn.addEventListener('click', () => {
      console.log('[Shahapur GIS - Sidebar] Dropdown collapse button clicked.');
      toggleSidebarState();
      if (headerModulesMenu) headerModulesMenu.classList.add('hidden');
    });
  }

  if (headerModulesBtn && headerModulesMenu) {
    headerModulesBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isHidden = headerModulesMenu.classList.toggle('hidden');
      console.log('[Shahapur GIS - Sidebar] Header modules menu toggled. Visible:', !isHidden);
    });

    document.addEventListener('click', (e) => {
      if (!headerModulesBtn.contains(e.target) && !headerModulesMenu.contains(e.target)) {
        if (!headerModulesMenu.classList.contains('hidden')) {
          console.log('[Shahapur GIS - Sidebar] Clicked outside modules menu, closing dropdown.');
          headerModulesMenu.classList.add('hidden');
        }
      }
    });

    headerModulesMenu.querySelectorAll('a').forEach(item => {
      item.addEventListener('click', () => {
        console.log('[Shahapur GIS - Sidebar] Header module item clicked:', item.getAttribute('data-route'));
        headerModulesMenu.classList.add('hidden');
      });
    });
  } else {
    console.log('[Shahapur GIS - Sidebar] Header modules dropdown elements check:', {
      hasButton: !!headerModulesBtn,
      hasMenu: !!headerModulesMenu
    });
  }
}

