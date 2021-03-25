interface Menu {
  hide(): void;
  show(): void;
  element: Element;
}

export const init = () => {
  const menu = document.querySelector('.menu')!;
  const navList = document.querySelector('.menu ul') as HTMLElement;
  const menuItems = document.querySelectorAll('.menu-link');
  const mobileToggleNavButton = document.querySelector(
    '.mobile-show-menu',
  ) as HTMLElement;

  /** Mobile nav: whether the menu is shown */
  let shown = false;

  let activeMenu: Menu | null = null;

  // Upgrade the <a> elements to <button> elements which will open the menu

  for (const menuItem of menuItems) {
    const link = menuItem.querySelector(':scope > a');
    const menuContent = menuItem.querySelector(
      ':scope > .menu-section-content',
    );
    if (!link || !menuContent) continue;
    const buttonTag = document.createElement('button');
    buttonTag.textContent = link.textContent;
    link.replaceWith(buttonTag);

    const menu: Menu = {
      hide() {
        menuContent.setAttribute('hidden', '');
        activeMenu = null;
      },
      show() {
        menuContent.removeAttribute('hidden');
        activeMenu = menu;
      },
      element: menuItem,
    };

    buttonTag.addEventListener('click', () => {
      if (activeMenu === menu) {
        activeMenu.hide();
        return;
      }

      if (activeMenu) {
        activeMenu.hide();
      }

      menu.show();
    });
  }

  document.addEventListener('click', (e) => {
    // Click outside menu closes menu
    // Closes both the outer menu (on small screens) and the sub-menus
    if (
      (activeMenu || shown) &&
      e.target instanceof Node &&
      !menu.contains(e.target)
    ) {
      e.preventDefault();
      hideMenu();
      activeMenu?.hide();
    }
  });

  const toggleText = mobileToggleNavButton.querySelector('title')!;
  const hideMenu = () => {
    navList.classList.remove('expanded');
    toggleText.textContent = 'Show menu';
    mobileToggleNavButton.style.transform = '';
    shown = false;
  };

  const showMenu = () => {
    navList.classList.add('expanded');
    toggleText.textContent = 'Hide menu';
    mobileToggleNavButton.style.transform = `rotate(180deg)`;
    shown = true;
  };

  mobileToggleNavButton.addEventListener('click', () => {
    if (shown) hideMenu();
    else showMenu();
  });
};
