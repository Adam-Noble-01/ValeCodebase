// Na__MeasurementList__SidebarPanel
// Renders the sidebar list of measurements (synced from Na__Measurement__StoreModel).

import { Na__Measurement__FormatLabel } from '../05__Measurement__/Na__Measurement__FormatLabel.js';

export function Na__MeasurementList__SidebarPanel_Wire(elements, store, uiConfig) {
    const { listEl, clearButton } = elements;

    function render(items) {
        listEl.innerHTML = '';
        if (!items.length) {
            const placeholder = document.createElement('li');
            placeholder.style.color = 'var(--Na__Color__TextDim)';
            placeholder.style.justifyContent = 'center';
            placeholder.textContent = 'No measurements yet. Click two points on the photo.';
            placeholder.style.gridTemplateColumns = '1fr';
            listEl.appendChild(placeholder);
            clearButton.disabled = true;
            return;
        }

        for (const item of items) {
            const li = document.createElement('li');

            const swatch = document.createElement('span');
            swatch.className = 'Na__Measurement__Swatch';
            swatch.style.background = (uiConfig.measurementColors && uiConfig.measurementColors[item.intrinsicsSource]) || '#22d3ee';
            li.appendChild(swatch);

            const meta = document.createElement('div');
            meta.innerHTML = `
                <div class="Na__Measurement__Value">${Na__Measurement__FormatLabel(item.distanceMeters)}</div>
                <div style="font-size:11px; color:var(--Na__Color__TextDim);">
                    ${item.intrinsicsSource} | depth&nbsp;${item.depthA.toFixed(2)}&hairsp;m &rarr; ${item.depthB.toFixed(2)}&hairsp;m
                </div>
            `;
            li.appendChild(meta);

            const del = document.createElement('button');
            del.type = 'button';
            del.className = 'Na__Measurement__DeleteBtn';
            del.title = 'Remove measurement';
            del.textContent = '\u00D7';
            del.addEventListener('click', () => store.remove(item.id));
            li.appendChild(del);

            listEl.appendChild(li);
        }
        clearButton.disabled = false;
    }

    clearButton.addEventListener('click', () => store.clear());

    return { render };
}
