export function setupSourcePriorityList(list) {
  if (!list) {
    return;
  }
  let dragged = null;
  for (const item of sourceItems(list)) {
    item.draggable = true;
    item.tabIndex = item.tabIndex < 0 ? 0 : item.tabIndex;
    item.addEventListener('dragstart', () => {
      dragged = item;
      item.classList.add('source-priority-option-dragging');
    });
    item.addEventListener('dragend', () => {
      item.classList.remove('source-priority-option-dragging');
      dragged = null;
    });
    item.addEventListener('dragover', (event) => {
      if (!dragged) {
        return;
      }
      event.preventDefault();
      const target = event.target.closest('[data-source-option]');
      if (!target || target === dragged || target.parentElement !== list) {
        return;
      }
      const { top, height } = target.getBoundingClientRect();
      list.insertBefore(
        dragged,
        event.clientY > top + height / 2 ? target.nextSibling : target
      );
    });
    item.addEventListener('drop', (event) => event.preventDefault());
    item.addEventListener('keydown', (event) => moveSourceOption(event, item));
  }
}

export function collectCheckedSourceSpec(
  list,
  { fandomSlugInput = null } = {}
) {
  const tokens = [];
  for (const checkbox of sourceCheckboxes(list)) {
    if (!checkbox.checked) {
      continue;
    }
    if (checkbox.value === 'fandom') {
      const slug = fandomSlugInput?.value.trim();
      if (slug) {
        tokens.push(`fandom:${slug}`);
      }
      continue;
    }
    tokens.push(checkbox.value);
  }
  return tokens.join(',');
}

function sourceItems(list) {
  return [...list.querySelectorAll('[data-source-option]')];
}

function sourceCheckboxes(list) {
  return list
    ? [...list.querySelectorAll('input[type="checkbox"][value]')]
    : [];
}

function moveSourceOption(event, item) {
  if (event.key === 'ArrowUp' && item.previousElementSibling) {
    event.preventDefault();
    item.parentElement.insertBefore(item, item.previousElementSibling);
    item.focus();
  }
  if (event.key === 'ArrowDown' && item.nextElementSibling) {
    event.preventDefault();
    item.parentElement.insertBefore(item.nextElementSibling, item);
    item.focus();
  }
}
