// Na__ModelToggle__SelectorButtons
// Builds the toggle button group for choosing the active depth model.

export function Na__ModelToggle__SelectorButtons_Wire(containerEl, appConfig, onSelect) {
    const buttons = [];

    function rebuild(activeId) {
        containerEl.innerHTML = '';
        buttons.length = 0;
        for (const [id, model] of Object.entries(appConfig.models)) {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'Na__ModelToggle__Btn';
            btn.dataset.modelId = id;
            btn.textContent = model.displayName || id;
            btn.setAttribute('aria-pressed', id === activeId ? 'true' : 'false');
            btn.addEventListener('click', () => {
                if (id === activeId) return;
                onSelect(id);
            });
            containerEl.appendChild(btn);
            buttons.push(btn);
        }
    }

    function setActive(activeId) {
        for (const btn of buttons) {
            btn.setAttribute('aria-pressed', btn.dataset.modelId === activeId ? 'true' : 'false');
        }
    }

    return { rebuild, setActive };
}
