/* =============================================================================
   NOBLEIMAGETOOLS - MASKING TOOLS - LAYER MANAGER
   =============================================================================

   FILE       : NobleImageTools__MaskingTools__LayerManager__.js
   NAMESPACE  : NobleImageTools
   MODULE     : MaskingTools - Layer Manager
   PURPOSE    : CRUD operations for the mask layer stack. Manages layer state
                (id, name, color, visible, maskData), fires DOM updates, and
                coordinates with the Renderer to add/remove offscreen bitmaps.

   ============================================================================= */

(function () {
    'use strict';

// =============================================================================
// REGION | Layer Helpers
// =============================================================================

    // MODULE VARIABLES | Layer counter and multi-selection state
    // ------------------------------------------------------------
    let _layerCounter   = 0;                                         // <-- Incrementing id seed
    let _multiSelected  = new Set();                                 // <-- IDs of multi-selected layers
    // ---------------------------------------------------------------


    // HELPER FUNCTION | Pick the next default colour from config palette
    // ------------------------------------------------------------
    function NobleImageTools__LayerManager__NextColor() {
        const config    = window.NobleImageTools__State.config;
        const palette   = config.NobleImageTools__Layers__DefaultColors || ['#4f8cff'];
        const count     = window.NobleImageTools__State.layers.length;
        return palette[count % palette.length];
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Generate a unique layer id
    // ------------------------------------------------------------
    function NobleImageTools__LayerManager__NewId() {
        _layerCounter++;
        return 'layer_' + Date.now() + '_' + _layerCounter;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// =============================================================================
// REGION | Layer CRUD
// =============================================================================

    // FUNCTION | Add a new layer from a SAM2 mask result
    // ------------------------------------------------------------
    function NobleImageTools__LayerManager__AddLayer(maskData, nameOverride) {
        const state     = window.NobleImageTools__State;
        const img       = state.image;

        const layer     = {
            id          : NobleImageTools__LayerManager__NewId(),
            name        : nameOverride || ('Mask ' + (state.layers.length + 1)),
            color       : NobleImageTools__LayerManager__NextColor(),
            visible     : true,
            maskData    : maskData
        };

        state.layers.push(layer);
        state.selectedLayerId = layer.id;

        if (img.width && img.height) {
            window.NobleImageTools__Canvas__Renderer.NobleImageTools__Renderer__AddLayerOffscreen(
                layer, img.width, img.height
            );
        }

        NobleImageTools__LayerManager__RenderLayersList();
        window.NobleImageTools__Canvas__Renderer.NobleImageTools__Renderer__RequestRedraw();

        return layer;
    }
    // ------------------------------------------------------------


    // FUNCTION | Remove a layer by id
    // ------------------------------------------------------------
    function NobleImageTools__LayerManager__RemoveLayer(layerId) {
        const state         = window.NobleImageTools__State;
        const idx           = state.layers.findIndex(function (l) { return l.id === layerId; });
        if (idx === -1) return;

        state.layers.splice(idx, 1);
        if (state.selectedLayerId === layerId) {
            state.selectedLayerId = state.layers.length ? state.layers[state.layers.length - 1].id : null;
        }

        window.NobleImageTools__Canvas__Renderer.NobleImageTools__Renderer__RemoveLayerOffscreen(layerId);
        NobleImageTools__LayerManager__RenderLayersList();
    }
    // ------------------------------------------------------------


    // FUNCTION | Toggle visibility of a layer
    // ------------------------------------------------------------
    function NobleImageTools__LayerManager__ToggleVisibility(layerId) {
        const state = window.NobleImageTools__State;
        const layer = state.layers.find(function (l) { return l.id === layerId; });
        if (!layer) return;

        layer.visible = !layer.visible;
        NobleImageTools__LayerManager__RenderLayersList();
        window.NobleImageTools__Canvas__Renderer.NobleImageTools__Renderer__RequestRedraw();
    }
    // ------------------------------------------------------------


    // FUNCTION | Rename a layer
    // ------------------------------------------------------------
    function NobleImageTools__LayerManager__RenameLayer(layerId, newName) {
        const state = window.NobleImageTools__State;
        const layer = state.layers.find(function (l) { return l.id === layerId; });
        if (layer) {
            layer.name = newName.trim() || layer.name;
            NobleImageTools__LayerManager__RenderLayersList();
        }
    }
    // ------------------------------------------------------------


    // FUNCTION | Select a layer (single, ctrl-add, or shift-range)
    // ------------------------------------------------------------
    function NobleImageTools__LayerManager__SelectLayer(layerId, ctrlKey, shiftKey) {
        const state     = window.NobleImageTools__State;

        if (ctrlKey) {
            if (_multiSelected.has(layerId)) {
                _multiSelected.delete(layerId);
                if (state.selectedLayerId === layerId) {
                    state.selectedLayerId = _multiSelected.size
                        ? Array.from(_multiSelected).slice(-1)[0]
                        : null;
                }
            } else {
                _multiSelected.add(layerId);
                state.selectedLayerId = layerId;
            }

        } else if (shiftKey && state.selectedLayerId) {
            const reversed  = state.layers.slice().reverse();
            const anchorIdx = reversed.findIndex(function (l) { return l.id === state.selectedLayerId; });
            const targetIdx = reversed.findIndex(function (l) { return l.id === layerId; });
            if (anchorIdx !== -1 && targetIdx !== -1) {
                const lo = Math.min(anchorIdx, targetIdx);
                const hi = Math.max(anchorIdx, targetIdx);
                for (let i = lo; i <= hi; i++) {
                    _multiSelected.add(reversed[i].id);
                }
            }
            state.selectedLayerId = layerId;

        } else {
            _multiSelected.clear();
            _multiSelected.add(layerId);
            state.selectedLayerId = layerId;
        }

        NobleImageTools__LayerManager__UpdateMultiSelectUI();
        NobleImageTools__LayerManager__RenderLayersList();
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Show/hide the merge/delete-selected buttons based on count
    // ------------------------------------------------------------
    function NobleImageTools__LayerManager__UpdateMultiSelectUI() {
        const count     = _multiSelected.size;
        const mergeBtn  = document.getElementById('Nit__Layers__MergeSelected');
        const delSelBtn = document.getElementById('Nit__Layers__DeleteSelected');
        const countEl   = document.getElementById('Nit__Layers__SelectCount');

        if (mergeBtn)   mergeBtn.style.display    = count >= 2 ? '' : 'none';
        if (delSelBtn)  delSelBtn.style.display   = count >= 2 ? '' : 'none';
        if (countEl)    countEl.textContent        = count >= 2 ? count + ' selected' : '';
    }
    // ------------------------------------------------------------


    // FUNCTION | Merge all multi-selected layers into one (union) → new layer, delete originals
    // ------------------------------------------------------------
    function NobleImageTools__LayerManager__MergeMultiSelected() {
        const state     = window.NobleImageTools__State;
        const toMerge   = state.layers.filter(function (l) { return _multiSelected.has(l.id); });

        if (toMerge.length < 2) {
            window.NobleImageTools__AppCore__Toast.NobleImageTools__Toast__Show(
                'Select 2 or more layers to merge (Ctrl+click).', 'warning'
            );
            return;
        }

        const first     = toMerge[0];
        const len       = first.maskData.length;
        const resultData = new Array(len).fill(false);

        for (const layer of toMerge) {
            for (let i = 0; i < len; i++) {
                if (layer.maskData[i]) resultData[i] = true;
            }
        }

        const names     = toMerge.map(function (l) { return l.name; }).join(' + ');
        NobleImageTools__LayerManager__AddLayer(resultData, names);

        for (const layer of toMerge) {
            NobleImageTools__LayerManager__RemoveLayer(layer.id);
        }

        _multiSelected.clear();
        NobleImageTools__LayerManager__UpdateMultiSelectUI();

        window.NobleImageTools__AppCore__Toast.NobleImageTools__Toast__Show(
            'Merged ' + toMerge.length + ' layers.', 'success'
        );
    }
    // ------------------------------------------------------------


    // FUNCTION | Delete all multi-selected layers
    // ------------------------------------------------------------
    function NobleImageTools__LayerManager__DeleteMultiSelected() {
        const state     = window.NobleImageTools__State;
        const toDelete  = state.layers.filter(function (l) { return _multiSelected.has(l.id); });
        const count     = toDelete.length;

        for (const layer of toDelete) {
            NobleImageTools__LayerManager__RemoveLayer(layer.id);
        }

        _multiSelected.clear();
        NobleImageTools__LayerManager__UpdateMultiSelectUI();

        window.NobleImageTools__AppCore__Toast.NobleImageTools__Toast__Show(
            'Deleted ' + count + ' layers.', 'success', 2000
        );
    }
    // ------------------------------------------------------------


    // FUNCTION | Subtract one layer's mask from the selected layer → new layer
    // ------------------------------------------------------------
    function NobleImageTools__LayerManager__SubtractFromSelected(subtractLayerId) {
        const state         = window.NobleImageTools__State;
        const baseLayer     = state.layers.find(function (l) { return l.id === state.selectedLayerId; });
        const subLayer      = state.layers.find(function (l) { return l.id === subtractLayerId; });

        if (!baseLayer || !subLayer) {
            window.NobleImageTools__AppCore__Toast.NobleImageTools__Toast__Show(
                'Select a base layer first, then subtract another from it.', 'warning'
            );
            return;
        }

        if (baseLayer.maskData.length !== subLayer.maskData.length) {
            window.NobleImageTools__AppCore__Toast.NobleImageTools__Toast__Show('Layer size mismatch — cannot subtract.', 'error');
            return;
        }

        const resultData    = new Array(baseLayer.maskData.length);
        let   hasPixels     = false;

        for (let i = 0; i < baseLayer.maskData.length; i++) {
            resultData[i] = baseLayer.maskData[i] && !subLayer.maskData[i];
            if (resultData[i]) hasPixels = true;
        }

        if (!hasPixels) {
            window.NobleImageTools__AppCore__Toast.NobleImageTools__Toast__Show(
                'Subtraction result is empty — no overlap or layers are identical.', 'warning'
            );
            return;
        }

        NobleImageTools__LayerManager__AddLayer(resultData, baseLayer.name + ' − ' + subLayer.name);
        window.NobleImageTools__AppCore__Toast.NobleImageTools__Toast__Show(
            'Created subtracted layer.', 'success', 2000
        );
    }
    // ------------------------------------------------------------


    // FUNCTION | Union of two layers → new layer (A ∪ B)
    // ------------------------------------------------------------
    function NobleImageTools__LayerManager__MergeSelected(mergeLayerId) {
        const state         = window.NobleImageTools__State;
        const baseLayer     = state.layers.find(function (l) { return l.id === state.selectedLayerId; });
        const mergeLayer    = state.layers.find(function (l) { return l.id === mergeLayerId; });

        if (!baseLayer || !mergeLayer) return;
        if (baseLayer.maskData.length !== mergeLayer.maskData.length) return;

        const resultData    = baseLayer.maskData.map(function (v, i) { return v || mergeLayer.maskData[i]; });
        NobleImageTools__LayerManager__AddLayer(resultData, baseLayer.name + ' + ' + mergeLayer.name);
        window.NobleImageTools__AppCore__Toast.NobleImageTools__Toast__Show('Created merged layer.', 'success', 2000);
    }
    // ------------------------------------------------------------


    // FUNCTION | Clear all layers
    // ------------------------------------------------------------
    function NobleImageTools__LayerManager__ClearAll() {
        const state = window.NobleImageTools__State;

        for (const layer of state.layers) {
            window.NobleImageTools__Canvas__Renderer.NobleImageTools__Renderer__RemoveLayerOffscreen(layer.id);
        }

        state.layers            = [];
        state.selectedLayerId   = null;
        _multiSelected.clear();
        NobleImageTools__LayerManager__UpdateMultiSelectUI();
        NobleImageTools__LayerManager__RenderLayersList();
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// =============================================================================
// REGION | DOM Rendering
// =============================================================================

    // HELPER FUNCTION | Build a single layer item DOM element
    // ------------------------------------------------------------
    function NobleImageTools__LayerManager__BuildLayerItemEl(layer) {
        const state         = window.NobleImageTools__State;
        const isSelected    = layer.id === state.selectedLayerId;
        const isMulti       = _multiSelected.has(layer.id);
        const hasSelected   = !!state.selectedLayerId && state.selectedLayerId !== layer.id;

        const item          = document.createElement('div');
        item.className      = 'Nit__LayerItem'
            + (isSelected ? ' Nit__LayerItem--selected' : '')
            + (isMulti && !isSelected ? ' Nit__LayerItem--multi' : '');
        item.dataset.layerId = layer.id;

        const visBtn        = document.createElement('button');
        visBtn.className    = 'Nit__LayerItem__VisibilityBtn' + (layer.visible ? '' : ' Nit__LayerItem__VisibilityBtn--hidden');
        visBtn.textContent  = layer.visible ? '👁' : '🙈';
        visBtn.title        = layer.visible ? 'Hide layer' : 'Show layer';
        visBtn.addEventListener('click', function (e) {
            e.stopPropagation();
            NobleImageTools__LayerManager__ToggleVisibility(layer.id);
        });

        const swatch        = document.createElement('div');
        swatch.className    = 'Nit__LayerItem__ColorSwatch';
        swatch.style.backgroundColor = layer.color;

        const nameEl        = document.createElement('span');
        nameEl.className    = 'Nit__LayerItem__Name';
        nameEl.textContent  = layer.name;
        nameEl.title        = 'Double-click to rename';
        nameEl.addEventListener('dblclick', function (e) {
            e.stopPropagation();
            NobleImageTools__LayerManager__BeginInlineRename(layer.id, nameEl);
        });

        const actionsEl     = document.createElement('div');
        actionsEl.className = 'Nit__LayerItem__Actions';
        actionsEl.style.cssText = 'display:flex;gap:2px;opacity:0;transition:opacity 150ms ease;flex-shrink:0;';

        if (hasSelected) {
            const subBtn    = document.createElement('button');
            subBtn.className = 'Nit__LayerItem__ActionBtn';
            subBtn.textContent = '⊖';
            subBtn.title    = 'Subtract this from selected layer → new layer';
            subBtn.style.cssText = 'background:none;border:none;cursor:pointer;color:#e2a23b;font-size:13px;padding:1px 3px;border-radius:3px;';
            subBtn.addEventListener('click', function (e) {
                e.stopPropagation();
                NobleImageTools__LayerManager__SubtractFromSelected(layer.id);
            });

            const mergeBtn  = document.createElement('button');
            mergeBtn.className = 'Nit__LayerItem__ActionBtn';
            mergeBtn.textContent = '⊕';
            mergeBtn.title  = 'Merge (union) this with selected layer → new layer';
            mergeBtn.style.cssText = 'background:none;border:none;cursor:pointer;color:#2db87a;font-size:13px;padding:1px 3px;border-radius:3px;';
            mergeBtn.addEventListener('click', function (e) {
                e.stopPropagation();
                NobleImageTools__LayerManager__MergeSelected(layer.id);
            });

            actionsEl.appendChild(subBtn);
            actionsEl.appendChild(mergeBtn);
        }

        const delBtn        = document.createElement('button');
        delBtn.className    = 'Nit__LayerItem__DeleteBtn';
        delBtn.textContent  = '✕';
        delBtn.title        = 'Delete layer';
        delBtn.style.cssText = 'background:none;border:none;cursor:pointer;color:#6b7280;font-size:12px;padding:1px 4px;border-radius:3px;opacity:0;transition:opacity 150ms ease;';
        delBtn.addEventListener('click', function (e) {
            e.stopPropagation();
            NobleImageTools__LayerManager__RemoveLayer(layer.id);
        });

        item.appendChild(visBtn);
        item.appendChild(swatch);
        item.appendChild(nameEl);
        item.appendChild(actionsEl);
        item.appendChild(delBtn);

        item.addEventListener('mouseenter', function () {
            actionsEl.style.opacity = '1';
            delBtn.style.opacity    = '1';
            if (delBtn.style.color === '') delBtn.style.color = '#6b7280';
        });
        item.addEventListener('mouseleave', function () {
            actionsEl.style.opacity = '0';
            delBtn.style.opacity    = '0';
        });

        item.addEventListener('click', function (e) {
            NobleImageTools__LayerManager__SelectLayer(layer.id, e.ctrlKey || e.metaKey, e.shiftKey);
        });

        return item;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Start inline rename for a layer name element
    // ------------------------------------------------------------
    function NobleImageTools__LayerManager__BeginInlineRename(layerId, nameEl) {
        const oldName   = nameEl.textContent;
        const input     = document.createElement('input');
        input.type      = 'text';
        input.value     = oldName;
        input.className = 'Nit__LayerItem__Name Nit__LayerItem__Name--editing';

        nameEl.parentElement.replaceChild(input, nameEl);
        input.focus();
        input.select();

        function commit() {
            const newName = input.value.trim() || oldName;
            NobleImageTools__LayerManager__RenameLayer(layerId, newName);
        }

        input.addEventListener('blur', commit);
        input.addEventListener('keydown', function (e) {
            if (e.key === 'Enter') { e.preventDefault(); commit(); }
            if (e.key === 'Escape') { NobleImageTools__LayerManager__RenderLayersList(); }
        });
    }
    // ------------------------------------------------------------


    // FUNCTION | Re-render the entire layers list DOM
    // ------------------------------------------------------------
    function NobleImageTools__LayerManager__RenderLayersList() {
        const listEl    = document.getElementById('Nit__LayersList');
        if (!listEl) return;

        const state     = window.NobleImageTools__State;
        listEl.innerHTML = '';

        if (!state.layers.length) {
            const empty         = document.createElement('div');
            empty.className     = 'Nit__LayersList__Empty';
            empty.textContent   = 'No masks yet. Use Click or Box mode to create masks.';
            listEl.appendChild(empty);
            return;
        }

        const reversed = state.layers.slice().reverse();
        for (const layer of reversed) {
            listEl.appendChild(NobleImageTools__LayerManager__BuildLayerItemEl(layer));
        }
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// =============================================================================
// REGION | Public API
// =============================================================================

    window.NobleImageTools__MaskingTools__LayerManager = {
        NobleImageTools__LayerManager__AddLayer             : NobleImageTools__LayerManager__AddLayer,
        NobleImageTools__LayerManager__RemoveLayer          : NobleImageTools__LayerManager__RemoveLayer,
        NobleImageTools__LayerManager__ToggleVisibility     : NobleImageTools__LayerManager__ToggleVisibility,
        NobleImageTools__LayerManager__SelectLayer          : NobleImageTools__LayerManager__SelectLayer,
        NobleImageTools__LayerManager__ClearAll             : NobleImageTools__LayerManager__ClearAll,
        NobleImageTools__LayerManager__RenderLayersList     : NobleImageTools__LayerManager__RenderLayersList,
        NobleImageTools__LayerManager__SubtractFromSelected  : NobleImageTools__LayerManager__SubtractFromSelected,
        NobleImageTools__LayerManager__MergeSelected        : NobleImageTools__LayerManager__MergeSelected,
        NobleImageTools__LayerManager__MergeMultiSelected   : NobleImageTools__LayerManager__MergeMultiSelected,
        NobleImageTools__LayerManager__DeleteMultiSelected  : NobleImageTools__LayerManager__DeleteMultiSelected
    };

// endregion -------------------------------------------------------------------

}());
