export function setupNavigation({
  navButtons,
  pageElements,
  pageAliases = {},
  onShow = () => {},
}) {
  function showPage(pageId) {
    const normalized = pageAliases[pageId] ?? pageId;
    const known = pageElements[normalized] ? normalized : 'analyse';
    for (const [id, element] of Object.entries(pageElements)) {
      element.hidden = id !== known;
    }
    for (const [id, button] of Object.entries(navButtons)) {
      const active = id === known;
      button.setAttribute('aria-current', active ? 'page' : 'false');
      button.classList.toggle('active', active);
    }
    onShow(known);
    globalThis.location.hash = `#/${known}`;
  }

  function pageFromHash() {
    const fragment = globalThis.location.hash.replace('#/', '');
    return pageElements[fragment] || pageAliases[fragment]
      ? fragment
      : 'analyse';
  }

  for (const [id, button] of Object.entries(navButtons)) {
    button.addEventListener('click', () => showPage(id));
  }
  globalThis.addEventListener('hashchange', () => showPage(pageFromHash()));

  return { showPage, pageFromHash };
}
