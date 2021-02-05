export const init = () => {
  const menuItems = document.querySelectorAll('.menu-link');

  let activeMenuContent: Element | null = null;

  // Upgrade the <a> elements to <button> elements which will open the menu

  menuItems.forEach((menuItem) => {
    const link = menuItem.querySelector(':scope > a');
    const menuContent = menuItem.querySelector(
      ':scope > .menu-section-content',
    );
    if (!link || !menuContent) return;
    const buttonTag = document.createElement('button');
    buttonTag.textContent = link.textContent;
    link.replaceWith(buttonTag);

    buttonTag.addEventListener('click', () => {
      if (activeMenuContent === menuContent) {
        activeMenuContent.setAttribute('hidden', '');
        activeMenuContent = null;
        return;
      }
      if (activeMenuContent) {
        activeMenuContent.setAttribute('hidden', '');
      }
      activeMenuContent = menuContent;
      menuContent.removeAttribute('hidden');
    });
  });

  document.addEventListener('click', (e) => {
    console.log('clickkkkk', e.target);
  });
};
