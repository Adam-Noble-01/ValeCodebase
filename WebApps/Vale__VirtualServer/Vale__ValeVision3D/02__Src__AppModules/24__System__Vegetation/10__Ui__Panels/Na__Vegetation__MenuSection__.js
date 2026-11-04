// =============================================================================
// VALEVISION3D - VEGETATION - THE MENU SECTION
// =============================================================================
//
// FILE       : Na__Vegetation__MenuSection__.js
// NAMESPACE  : Na__VegMenu
// MODULE     : System - Vegetation
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : The Vegetation section of Tools & Settings: Show Vegetation and
//              Transparency for everyone, and the way into the dev panels for an author
// CREATED    : 04-Nov-2026
//
// DESCRIPTION:
// - Adam, 04-Nov-2026: "add a menu section called vegetation which can be toggled on if
//   required via dev menu for the main menu". Dev Tools > Vegetation is the toggle, and
//   the section is hidden on every project where that is off, so a project without plants
//   shows nothing new at all.
// - TWO ROWS FOR EVERYONE, clients and phones included (plan, D07): "Vegetation toggle
//   on/of - All users if the menu is active", "Vegetation transparency slider - All users
//   if the menu is active". The <li> carries data-na-client-menu for that reason.
// - THE DEV ROWS ARE NEVER IN A CLIENT'S PAGE. They are built here, for an author only,
//   and each panel is fetched the first time its button is pressed.
// - EACH DEVICE REMEMBERS ITS OWN CHOICE, per project (plan, D19). The project's own
//   ShowByDefault and DefaultTransparencyPercent are where a device starts until it has
//   chosen, and a viewer choosing changes nothing in the file.
//
// INTEGRATION:
// - Loaded by Na__Vegetation__.js on an enabled project, and by nothing else.
// - Markup: #naVegetationMenuItem and its children in index.html.
// - Reported by 03__AppUtils/Na__AppUtils__ActivityLog__.js, which listens for the two ids.
// - @delegate: ../03__System__SceneLayer/Na__Vegetation__Runtime__.js
// - @delegate: ./Na__Vegetation__AssetBrowser__.js
// - @delegate: ./Na__Vegetation__LineworkPanel__.js
// - @delegate: ../20__System__Tools/Na__Vegetation__LinearTool__.js
// - @delegate: ../20__System__Tools/Na__Vegetation__BushTool__.js
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 04-Nov-2026 - Version 1.0.0 (ValeVision3D v2.85.0)
// - Initial build: Stage 3 of ValeVision__PLAN__VegetationSystem__.md.
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Markup Ids and the Device's Memory
    // ------------------------------------------------------------
    const Na__VegMenu__ITEM_ID       = 'naVegetationMenuItem';
    const Na__VegMenu__TOGGLE_ID     = 'naVegetationToggle';
    const Na__VegMenu__PANEL_ID      = 'naVegetationPanel';
    const Na__VegMenu__SHOW_ID       = 'naVegetationShowToggle';
    const Na__VegMenu__SLIDER_ID     = 'naVegetationTransparencySlider';
    const Na__VegMenu__VALUE_ID      = 'naVegetationTransparencyValue';
    const Na__VegMenu__DEV_ROWS_ID   = 'naVegetationDevRows';
    const Na__VegMenu__STORAGE_STEM  = 'ValeVision3D__Vegetation__';            // <-- Followed by the project's id: this device's choice for that project
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Variables
// -----------------------------------------------------------------------------

    // MODULE VARIABLES | What Has Been Wired
    // ------------------------------------------------------------
    const Na__VegMenu__State = {
        context : null,
        wired   : false,
        devDone : false
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | This Device's Memory
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | The Key for This Project on This Device
    // ------------------------------------------------------------
    function Na__VegMenu__StorageKey() {
        const params = new URLSearchParams(window.location.search);
        return Na__VegMenu__STORAGE_STEM + (params.get('project') || params.get('project-folder') || 'none');
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Read What This Device Chose, or Null (storage can throw)
    // ------------------------------------------------------------
    function Na__VegMenu__ReadChoice() {
        try {
            const text = window.localStorage.getItem(Na__VegMenu__StorageKey());
            return text ? JSON.parse(text) : null;
        } catch (error) {
            return null;
        }
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Remember What This Device Chose
    // ------------------------------------------------------------
    function Na__VegMenu__WriteChoice(shown, transparencyPercent) {
        try {
            window.localStorage.setItem(Na__VegMenu__StorageKey(), JSON.stringify({ shown, transparencyPercent }));
        } catch (error) { /* a device that cannot remember starts from the project's values each time */ }
    }
    // ------------------------------------------------------------


    // FUNCTION | Where This Device Starts on This Project
    // ------------------------------------------------------------
    function Na__VegMenu__StartingState(sceneData) {
        const choice = Na__VegMenu__ReadChoice();
        return {
            shown               : choice && typeof choice.shown === 'boolean' ? choice.shown : sceneData.Vegetation__SceneData__ShowByDefault !== false,
            transparencyPercent : choice && Number.isFinite(choice.transparencyPercent) ? choice.transparencyPercent : (sceneData.Vegetation__SceneData__DefaultTransparencyPercent || 0)
        };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | The Two Rows Everyone Gets
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | The Runtime, Already Loaded Once a Project Is On
    // ------------------------------------------------------------
    function Na__VegMenu__Runtime() {
        return import('../03__System__SceneLayer/Na__Vegetation__Runtime__.js');
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Write the Slider's Words
    // ------------------------------------------------------------
    function Na__VegMenu__WriteValue(percent) {
        const value = document.getElementById(Na__VegMenu__VALUE_ID);
        if (value) value.textContent = Math.round(percent) + '%';
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Wire the Section Once
    // ------------------------------------------------------------
    function Na__VegMenu__Wire() {
        if (Na__VegMenu__State.wired) return;
        const toggle = document.getElementById(Na__VegMenu__TOGGLE_ID);
        const panel  = document.getElementById(Na__VegMenu__PANEL_ID);
        const show   = document.getElementById(Na__VegMenu__SHOW_ID);
        const slider = document.getElementById(Na__VegMenu__SLIDER_ID);
        if (!toggle || !panel || !show || !slider) return;
        Na__VegMenu__State.wired = true;

        toggle.addEventListener('click', () => {
            panel.classList.toggle('is-open');
        });

        show.addEventListener('change', async () => {
            const runtime = await Na__VegMenu__Runtime();
            runtime.Na__VegRun__SetShown(show.checked);
            Na__VegMenu__WriteChoice(show.checked, Number(slider.value));
        });

        slider.addEventListener('input', async () => {
            const percent = Number(slider.value);
            Na__VegMenu__WriteValue(percent);
            const runtime = await Na__VegMenu__Runtime();
            runtime.Na__VegRun__SetTransparency(percent);
        });
        slider.addEventListener('change', () => {
            Na__VegMenu__WriteChoice(show.checked, Number(slider.value));
        });
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | The Dev Rows
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | One Row That Opens Something
    // ------------------------------------------------------------
    function Na__VegMenu__DevButton(id, text, title, open) {
        const button = document.createElement('button');
        button.type        = 'button';
        button.id          = id;
        button.className   = 'na-dropdown-menu__action na-dropdown-menu__action--secondary';
        button.textContent = text;
        button.title       = title;
        button.addEventListener('click', () => {
            open().catch((error) => {
                console.warn('[ValeVision3D Vegetation] ' + text + ' could not open:', error);
                const context = Na__VegMenu__State.context;
                if (context && context.showToast) context.showToast(text + ' could not open: ' + (error && error.message), true);
            });
        });
        return button;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | A Small Heading Among the Dev Rows
    // ------------------------------------------------------------
    function Na__VegMenu__DevHeading(text) {
        const heading = document.createElement('div');
        heading.className   = 'na-dropdown-menu__panel-title';
        heading.style.marginTop = '12px';
        heading.style.marginBottom = '0';
        heading.textContent = text;
        return heading;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Build the Rows Only an Author Gets
    // ------------------------------------------------------------
    // The gate only decides what the page offers: every save is refused by the server
    // for anyone else, whatever a page does.
    // ------------------------------------------------------------
    async function Na__VegMenu__BuildDevRows() {
        if (Na__VegMenu__State.devDone) return;
        const holder = document.getElementById(Na__VegMenu__DEV_ROWS_ID);
        if (!holder) return;
        const gate = await import('../../03__AppUtils/Na__AppUtils__DevGate__.js');
        if (!gate.Na__DevGate__IsAuthoringEnabled()) return;
        if (Na__VegMenu__State.devDone) return;
        Na__VegMenu__State.devDone = true;

        const context = Na__VegMenu__State.context;
        holder.hidden = false;

        const divider = document.createElement('hr');
        divider.className = 'na-dropdown-menu__panel-divider';
        holder.appendChild(divider);

        holder.appendChild(Na__VegMenu__DevButton('naVegetationAssetsButton', 'Vegetation Assets', 'The asset browser: click a card, then click the model', async () => {
            const panel = await import('./Na__Vegetation__AssetBrowser__.js');
            await panel.Na__VegCards__Toggle(context);
        }));

        holder.appendChild(Na__VegMenu__DevHeading('Placement Tools'));
        holder.appendChild(Na__VegMenu__DevButton('naVegetationLinearButton', 'Linear Tool', 'Draw and edit paths that make vegetation', async () => {
            const tool = await import('../20__System__Tools/Na__Vegetation__LinearTool__.js');
            await tool.Na__VegLinear__Toggle(context);
        }));
        holder.appendChild(Na__VegMenu__DevButton('naVegetationBushButton', 'Bush Tool', 'Brush plants on from a palette', async () => {
            const tool = await import('../20__System__Tools/Na__Vegetation__BushTool__.js');
            await tool.Na__VegBushTool__Toggle(context);
        }));

        holder.appendChild(Na__VegMenu__DevHeading('Line Rules'));
        holder.appendChild(Na__VegMenu__DevButton('naVegetationLineworkButton', 'Vegetation Linework', 'The demo\'s line rules: every value saves in this project', async () => {
            const panel = await import('./Na__Vegetation__LineworkPanel__.js');
            await panel.Na__VegLine__Toggle(context);
        }));

        // DRAWINGS | Off by default (plan, D04). A sheet's viewport has its own tick, in its
        // render composites. This is for a plan or elevation on screen in the 3D view.
        holder.appendChild(Na__VegMenu__DevHeading('Drawings'));
        const liveRow = document.createElement('label');
        liveRow.className = 'na-dropdown-menu__panel-row na-dropdown-menu__panel-row--toggle';
        liveRow.style.marginTop = '8px';
        const liveText = document.createElement('span');
        liveText.textContent = 'Show on live plans and elevations';
        liveRow.appendChild(liveText);
        const liveTick = document.createElement('input');
        liveTick.type = 'checkbox';
        liveTick.id = 'naVegetationLiveDrawingsToggle';
        liveTick.className = 'na-dropdown-menu__checkbox';
        const runtime = await Na__VegMenu__Runtime();
        liveTick.checked = runtime.Na__VegRun__GetSceneData().Vegetation__SceneData__ShowOnLiveDrawings === true;
        liveTick.addEventListener('change', () => {
            runtime.Na__VegRun__GetSceneData().Vegetation__SceneData__ShowOnLiveDrawings = liveTick.checked;
            import('../02__Core__Data/Na__Vegetation__SceneData__.js').then((data) => data.Na__VegData__SetDirty(true));
            runtime.Na__VegRun__SetShown(runtime.Na__VegRun__IsShown());       // <-- A way to ask for a frame, and the sheet stamp stays right
        });
        liveRow.appendChild(liveTick);
        holder.appendChild(liveRow);

        // SAVING | One button, the same state as every panel's
        const shell = await import('./Na__Vegetation__PanelShell__.js');
        await shell.Na__VegShell__Prepare(context);
        const save = shell.Na__VegShell__MakeSaveButton();
        save.classList.add('na-veg-save--menu');
        holder.appendChild(save);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public API
// -----------------------------------------------------------------------------

    // FUNCTION | Show the Section, Set to Where This Device Starts
    // ------------------------------------------------------------
    function Na__VegMenu__Show(context, starting) {
        Na__VegMenu__State.context = context;
        const item = document.getElementById(Na__VegMenu__ITEM_ID);
        if (!item) return false;                                               // <-- Markup absent: plants still draw

        Na__VegMenu__Wire();
        const show   = document.getElementById(Na__VegMenu__SHOW_ID);
        const slider = document.getElementById(Na__VegMenu__SLIDER_ID);
        if (show) show.checked = starting.shown;
        if (slider) slider.value = String(starting.transparencyPercent);
        Na__VegMenu__WriteValue(starting.transparencyPercent);

        item.style.display = '';
        Na__VegMenu__BuildDevRows().catch((error) => {
            console.warn('[ValeVision3D Vegetation] The dev rows could not be built:', error && error.message);
        });
        return true;
    }
    // ------------------------------------------------------------


    // FUNCTION | Hide the Section, and Close Anything Opened from It
    // ------------------------------------------------------------
    function Na__VegMenu__Hide() {
        const item = document.getElementById(Na__VegMenu__ITEM_ID);
        if (item) item.style.display = 'none';
        const panel = document.getElementById(Na__VegMenu__PANEL_ID);
        if (panel) panel.classList.remove('is-open');
        if (Na__VegMenu__State.devDone) {
            import('./Na__Vegetation__PanelShell__.js').then((shell) => shell.Na__VegShell__CloseAll()).catch(() => {});
        }
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | Menu Section API
    // ------------------------------------------------------------
    export {
        Na__VegMenu__StartingState,
        Na__VegMenu__Show,
        Na__VegMenu__Hide
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
