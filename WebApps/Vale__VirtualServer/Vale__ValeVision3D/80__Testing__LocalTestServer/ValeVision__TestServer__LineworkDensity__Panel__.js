// =============================================================================
// VALEVISION3D - TESTING SERVER - LINEWORK DENSITY TEST - PANEL
// =============================================================================
//
// FILE       : ValeVision__TestServer__LineworkDensity__Panel__.js
// NAMESPACE  : Na__LineDensityPanel
// MODULE     : TestServer - Linework Density Test
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : A small panel over the app, on the testing server only, to switch the
//              app's ornament fade off and on and move its settings while looking
// CREATED    : 10-Nov-2026
//
// DESCRIPTION:
// - A TESTING SERVER PANEL, NOT PART OF THE APP. Opened from the testing server's own panel
//   (the badge in the corner, "Linework density test"). It is never in index.html and this
//   folder never syncs. Nothing here is saved: reload the page and the config's values are back.
// - IT DRIVES THE APP'S OWN MODULE, 05__RenderPipeline/Na__RenderEffect__OrnamentFade__.js,
//   loaded by the address the app loaded it from, so it moves the very fade the app draws.
//   (Until 10-Nov-2026 the test had its own engine here; it became that module.)
// - WHAT IT IS FOR. Adam, 10-Nov-2026: "Create a test enviroment and test parameters
//   until the crestings dont look as promitinent, but the remainder of the orangery and
//   building must look exactly the same". The switches, so the look can be judged while
//   orbiting the real model, and the config changed with figures that were seen.
// - EVERY LABEL SAYS WHAT ITS CONTROL DOES. A slider's figure is what the picture gets:
//   a share of ink kept, or a distance in metres worked out from this window and lens.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 10-Nov-2026 - Version 0.2.0
// - Drives the app's ornament fade instead of a test engine of its own. The way of choosing
//   is gone (the app chooses by name only); the switch is the fade's Enabled.
// 10-Nov-2026 - Version 0.1.0
// - First build.
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Imports and Constants
// -----------------------------------------------------------------------------

    // MODULE IMPORTS | The App's Ornament Fade, by the Address the App Loaded It From
    // @delegate: ../02__Src__AppModules/05__RenderPipeline/Na__RenderEffect__OrnamentFade__.js
    // ------------------------------------------------------------
    const {
        Na__OrnamentFade__Set,
        Na__OrnamentFade__GetSettings,
        Na__OrnamentFade__GetStats,
        Na__OrnamentFade__IsAttached
    } = await import(new URL('02__Src__AppModules/05__RenderPipeline/Na__RenderEffect__OrnamentFade__.js', document.baseURI).href);
    // ------------------------------------------------------------

    // MODULE CONSTANTS | Names, and the Three Strengths
    // ------------------------------------------------------------
    const NA__LDPANEL__CLS      = 'ValeVision__TestServer__Ld';                // <-- Every id and class, after the overlay's own token
    const NA__LDPANEL__CSS      = '/_testserver/ValeVision__TestServer__Styles__LineworkDensity__.css';
    const NA__LDPANEL__STRENGTH = {
        Light  : { Fade__DetailKeepShare : 0.15, Fade__StructureKeepShare : 0.85, Fade__ProfileKeepShare : 0.70 },
        Medium : { Fade__DetailKeepShare : 0,    Fade__StructureKeepShare : 0.70, Fade__ProfileKeepShare : 0.50 },
        Strong : { Fade__DetailKeepShare : 0,    Fade__StructureKeepShare : 0.45, Fade__ProfileKeepShare : 0.35 }
    };
    // ------------------------------------------------------------

    // MODULE VARIABLES | The Panel
    // ------------------------------------------------------------
    let Na__LdPanel__Root = null;
    let Na__LdPanel__Busy = false;
    let Na__LdPanel__Note = '';                                               // <-- What the last change said, if it failed
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Helpers
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Make an Element (text always as text)
    // ------------------------------------------------------------
    function Na__LdPanel__El(tag, className, text) {
        const el = document.createElement(tag);
        if (className) el.className = NA__LDPANEL__CLS + className;
        if (text !== undefined && text !== null) el.textContent = String(text);
        return el;
    }
    // ------------------------------------------------------------

    // HELPER FUNCTION | How Far Off a Line Is This Many Millimetres Wide in the Model
    // ------------------------------------------------------------
    // A line is a fixed width on screen, so its width in the model grows with
    // distance. For this window's height and a 33 degree lens, 0.8 px lines.
    // ------------------------------------------------------------
    function Na__LdPanel__MetresFor(lineMm) {
        const canvas = document.getElementById('renderCanvas');
        const height = canvas ? canvas.clientHeight : window.innerHeight;
        return lineMm / 1000 * (height * 3.333 * 0.5) / 0.8;
    }
    // ------------------------------------------------------------

    // HELPER FUNCTION | Run a Change, Then Draw the Panel Again
    // ------------------------------------------------------------
    async function Na__LdPanel__Do(work) {
        if (Na__LdPanel__Busy) return;
        Na__LdPanel__Busy = true;
        Na__LdPanel__Note = '';
        try { await work(); }
        catch (error) { Na__LdPanel__Note = 'It failed: ' + (error && error.message ? error.message : error); }
        Na__LdPanel__Busy = false;
        Na__LdPanel__Draw();
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Drawing the Panel
// -----------------------------------------------------------------------------

    // SUB FUNCTION | A Row of Buttons, One of Them Current
    // ------------------------------------------------------------
    function Na__LdPanel__Choice(label, options, current, onPick) {
        const row = Na__LdPanel__El('div', 'Row');
        row.appendChild(Na__LdPanel__El('span', 'Label', label));
        const group = Na__LdPanel__El('span', 'Buttons');
        options.forEach((option) => {
            const button = Na__LdPanel__El('button', 'Button' + (option.value === current ? ' ' + NA__LDPANEL__CLS + 'Button--current' : ''), option.text);
            button.type = 'button';
            if (option.title) button.title = option.title;
            button.addEventListener('click', () => onPick(option.value));
            group.appendChild(button);
        });
        row.appendChild(group);
        return row;
    }
    // ------------------------------------------------------------

    // SUB FUNCTION | A Slider With Its Figure Said in Words
    // ------------------------------------------------------------
    function Na__LdPanel__Slider(label, key, min, max, step, say) {
        const settings = Na__OrnamentFade__GetSettings();
        const row = Na__LdPanel__El('label', 'Row');
        row.appendChild(Na__LdPanel__El('span', 'Label', label));
        const input = document.createElement('input');
        input.type = 'range'; input.min = String(min); input.max = String(max); input.step = String(step);
        input.value = String(settings[key]);
        input.className = NA__LDPANEL__CLS + 'Range';
        const figure = Na__LdPanel__El('span', 'Figure', say(settings[key]));
        input.addEventListener('input', () => {
            figure.textContent = say(Number(input.value));
            Na__OrnamentFade__Set({ [key] : Number(input.value) });                // <-- A uniform: the next frame has it
        });
        row.appendChild(input);
        row.appendChild(figure);
        return row;
    }
    // ------------------------------------------------------------

    // FUNCTION | Draw Everything From the Engine's State
    // ------------------------------------------------------------
    function Na__LdPanel__Draw() {
        const root = Na__LdPanel__Root;
        if (!root) return;
        const settings = Na__OrnamentFade__GetSettings(), stats = Na__OrnamentFade__GetStats(), attached = Na__OrnamentFade__IsAttached();
        const percent = (value) => Math.round(value * 100) + '% of its ink';
        root.textContent = '';

        const head = Na__LdPanel__El('div', 'Head');
        head.appendChild(Na__LdPanel__El('h2', 'Title', 'Linework density test'));
        const close = Na__LdPanel__El('button', 'Small', 'Close');
        close.type = 'button';
        close.title = 'Close this panel. What was set stays on this page until it is reloaded';
        close.addEventListener('click', () => { root.remove(); Na__LdPanel__Root = null; });
        head.appendChild(close);
        root.appendChild(head);
        root.appendChild(Na__LdPanel__El('p', 'Note', 'The app\'s ornament fade, on this page only. Nothing is saved, and reloading the page puts the config\'s values back. Ornament (a part named ' + settings.Choose__SeedNames.split('|').join(' or ') + ', the ' + settings.Choose__CompanionNames.split('|').join(', ') + ' beside it, and its pieces flattened into the building) is drawn with a lighter pen the further off it is. Every other line is left as it was.'));

        root.appendChild(Na__LdPanel__Choice('The fade', [
            { value : 'off', text : 'Off: as before' },
            { value : 'on',  text : 'On' }
        ], attached && settings.Enabled ? 'on' : 'off', (value) => Na__LdPanel__Do(() => Na__OrnamentFade__Set({ Enabled : value === 'on' }))));

        if (attached && settings.Enabled) {

            const strength = Object.keys(NA__LDPANEL__STRENGTH).find((name) => Object.keys(NA__LDPANEL__STRENGTH[name]).every((key) => Math.abs(settings[key] - NA__LDPANEL__STRENGTH[name][key]) < 0.001)) || '';
            root.appendChild(Na__LdPanel__Choice('How light', Object.keys(NA__LDPANEL__STRENGTH).map((name) => ({ value : name, text : name })), strength,
                (value) => Na__LdPanel__Do(() => Na__OrnamentFade__Set(NA__LDPANEL__STRENGTH[value]))));

            root.appendChild(Na__LdPanel__Slider('Small detail keeps', 'Fade__DetailKeepShare', 0, 1, 0.05, percent));
            root.appendChild(Na__LdPanel__Slider('Posts, rails and arches keep', 'Fade__StructureKeepShare', 0, 1, 0.05, percent));
            root.appendChild(Na__LdPanel__Slider('Profile lines keep', 'Fade__ProfileKeepShare', 0, 1, 0.05, percent));
            root.appendChild(Na__LdPanel__Slider('Starts to lighten from', 'Fade__StartLineMm', 1, 12, 0.5, (value) => 'about ' + Math.round(Na__LdPanel__MetresFor(value)) + ' m away'));
            root.appendChild(Na__LdPanel__Slider('Fully light by', 'Fade__FullLineMm', 2, 24, 0.5, (value) => 'about ' + Math.round(Na__LdPanel__MetresFor(value)) + ' m away'));

            root.appendChild(Na__LdPanel__Choice('Show what was chosen', [
                { value : 'no',  text : 'No' },
                { value : 'yes', text : 'Yes: ornament in red', title : 'Red is drawn lightly. Blue was measured and left alone.' }
            ], settings.Show__Picked ? 'yes' : 'no', (value) => Na__LdPanel__Do(() => Na__OrnamentFade__Set({ Show__Picked : value === 'yes' }))));

            if (stats) {
                const names = Object.keys(stats.HeldBy).sort((a, b) => stats.HeldBy[b] - stats.HeldBy[a]);
                const found = stats.OrnamentSegments === 0
                    ? 'No ornament was found in this model, so nothing changes.'
                    : stats.OrnamentSegments.toLocaleString('en-GB') + ' of ' + stats.Segments.toLocaleString('en-GB') + ' line segments are ornament, in: ' + names.slice(0, 6).join(', ') + (names.length > 6 ? ' and ' + (names.length - 6) + ' more' : '') + '.';
                root.appendChild(Na__LdPanel__El('p', 'Found', found));
                root.appendChild(Na__LdPanel__El('p', 'Note', 'Measured in ' + (stats.Ms.Measure + stats.Ms.SplitAndMeshes) + ' ms, once.'));
            }
        }
        if (Na__LdPanel__Note) root.appendChild(Na__LdPanel__El('p', 'Warning', Na__LdPanel__Note));
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public API
// -----------------------------------------------------------------------------

    // FUNCTION | Open the Panel (once), Switched Off
    // ------------------------------------------------------------
    function Na__LineDensityPanel__Open() {
        if (Na__LdPanel__Root) { Na__LdPanel__Draw(); return; }
        if (!document.querySelector('link[href="' + NA__LDPANEL__CSS + '"]')) {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = NA__LDPANEL__CSS;
            document.head.appendChild(link);
        }
        Na__LdPanel__Root = Na__LdPanel__El('section', 'Panel');
        Na__LdPanel__Root.setAttribute('aria-label', 'Linework density test');
        document.body.appendChild(Na__LdPanel__Root);
        Na__LdPanel__Draw();
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    export {
        Na__LineDensityPanel__Open
    };

// endregion -------------------------------------------------------------------
