// js/sidebar.js

function initSidebar() {
  const sidebar = document.getElementById('app-sidebar');
  const toggleBtn = document.getElementById('btn-toggle-sidebar');
  const headerModulesBtn = document.getElementById('btn-header-modules');
  const headerModulesMenu = document.getElementById('header-modules-menu');
  const dropdownCollapseBtn = document.getElementById('btn-collapse-sidebar-item');

  function toggleSidebarState() {
    if (!sidebar) return;
    sidebar.classList.toggle('collapsed');
    setTimeout(() => {
      window.dispatchEvent(new Event('resize'));
    }, 400);
  }

  if (toggleBtn) {
    toggleBtn.addEventListener('click', toggleSidebarState);
  }

  if (dropdownCollapseBtn) {
    dropdownCollapseBtn.addEventListener('click', () => {
      toggleSidebarState();
      if (headerModulesMenu) headerModulesMenu.classList.add('hidden');
    });
  }

  if (headerModulesBtn && headerModulesMenu) {
    headerModulesBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      headerModulesMenu.classList.toggle('hidden');
    });

    document.addEventListener('click', (e) => {
      if (!headerModulesBtn.contains(e.target) && !headerModulesMenu.contains(e.target)) {
        headerModulesMenu.classList.add('hidden');
      }
    });

    headerModulesMenu.querySelectorAll('a').forEach(item => {
      item.addEventListener('click', () => {
        headerModulesMenu.classList.add('hidden');
      });
    });
  }
}

