const menuButton = document.querySelector('.section-header__menu-button');
const sidebar = document.getElementById('section-sidebar');
const backdrop = document.querySelector('.section-menu-backdrop');

if (menuButton && sidebar) {
  const mobileQuery = window.matchMedia('(max-width: 1199px)');

  const setOpen = open => {
    const mobile = mobileQuery.matches;
    if (open && mobile) {
      const header = menuButton.closest('.section-header');
      sidebar.style.setProperty('--section-menu-top', `${Math.max(0, header.getBoundingClientRect().bottom)}px`);
    }
    document.body.classList.toggle('section-menu-open', open && mobile);
    menuButton.setAttribute('aria-expanded', String(open && mobile));
    menuButton.setAttribute('aria-label', open && mobile ? 'メニューを閉じる' : 'メニューを開く');
    sidebar.inert = mobile && !open;
  };

  document.body.classList.add('section-menu-ready');
  setOpen(false);

  menuButton.addEventListener('click', () => {
    const open = menuButton.getAttribute('aria-expanded') !== 'true';
    setOpen(open);
    if (!open) menuButton.focus();
  });

  backdrop?.addEventListener('click', () => {
    setOpen(false);
    menuButton.focus();
  });

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && menuButton.getAttribute('aria-expanded') === 'true') {
      setOpen(false);
      menuButton.focus();
    }
  });

  sidebar.addEventListener('click', event => {
    if (event.target.closest('a') && mobileQuery.matches) {
      setOpen(false);
      menuButton.focus();
    }
  });

  const onViewportChange = () => setOpen(false);
  if (mobileQuery.addEventListener) mobileQuery.addEventListener('change', onViewportChange);
  else mobileQuery.addListener(onViewportChange);
  window.addEventListener('resize', onViewportChange);
}
