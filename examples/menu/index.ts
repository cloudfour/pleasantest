interface Menu {
  hide(): void;
  show(): void;
  element: HTMLElement;
}

export const init = () => {
  const menuItems = [...document.querySelectorAll<HTMLElement>('.menu-link')];

  let activeMenu: Menu | null = null;

  // Upgrade the <a> elements to <button> elements which will open the menu

  const menus = menuItems.map((menuItem) => {
    const link = menuItem.querySelector(':scope > a');
    const menuContent = menuItem.querySelector(
      ':scope > .menu-section-content',
    );
    if (!link || !menuContent) return;
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
  });

  document.addEventListener('click', (e) => {
    // click outside menu
    if (
      activeMenu &&
      e.target instanceof Node &&
      !activeMenu.element.contains(e.target)
    ) {
      e.preventDefault();
      activeMenu.hide();
    }
  });
};
