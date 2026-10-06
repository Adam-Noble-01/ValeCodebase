// =============================================================================
// VALEVISION3D - LAYOUT EDITOR - DRAWING DELETION CONFIRMATION
// =============================================================================
// FILE       : Na__LayoutEditor__Register__DeleteDialog__.js
// NAMESPACE  : Na__LeRegDelete
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Require the exact drawing number before a destructive sheet delete.
// CREATED    : 19-Sep-2026
//
// -----------------------------------------------------------------------------
//
// PORT NOTE:
// - Ported from   : TrueVision3D 02__Src__AppModules/51__System__LayoutEditor/51__Feature__DrawingRegister/Na__LayoutEditor__Register__DeleteDialog__.js
// - Source version: none - TrueVision's file carries no MODULE line, no module version and no DEVELOPMENT
//                   LOG (S07a B1). First committed in TrueVision commit 32767407 (19-Sep-2026, devlog then at v2.75.0)
//                   with no release entry of its own; first named by the devlog in v2.78.1 (its dialog colours);
//                   unchanged since; read at b2aa9151
// - Ported on     : 02-Oct-2026 for ValeVision3D {{VVREL:W4-18}}, inert: nothing imports it until the register
//                   tab lands (W4-10). Its TrueVision release is not confirmed by Adam in TrueVision; ported under DR-01 (c).
// - Parity        : verbatim
// - Divergences   :
//   - Banner reads ValeVision3D. (No console output in this file.)
//   - This PORT NOTE block is added (TrueVision's file has none); the code and every other header
//     line are TrueVision's, so the house MODULE line and DEVELOPMENT LOG stay missing here too.
// - Back-port     : TrueVision's header wants a MODULE line, a PORT NOTE and a DEVELOPMENT LOG (WT-08 record
//                   hygiene, with Adam's approval, DR-36).
// - Legacy        : no module version or DEVELOPMENT LOG to carry - TrueVision's file has neither (S07a B1);
//                   the gap is TrueVision's to close (WT-08), so this copy stays byte-for-byte below the header.
//
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Typed Confirmation
// -----------------------------------------------------------------------------

    // FUNCTION | Resolve True Only After the Exact Number Is Typed and Submitted
    // ------------------------------------------------------------
    function Na__LeRegDelete__Confirm(number, name) {
        return new Promise((resolve) => {
            const previous = document.activeElement;
            const dialog = document.createElement('dialog');
            dialog.className = 'na-le-register__saving na-le-register__delete-dialog';
            const heading = document.createElement('h2');
            heading.id = 'na-register-delete-title';
            heading.textContent = 'Delete drawing ' + number + '?';
            dialog.setAttribute('aria-labelledby', heading.id);
            const warning = document.createElement('p');
            warning.textContent = 'This permanently removes “' + name + '”, its sheet contents and revision history from the drawing pack. It is saved to the server. This cannot be undone. Remaining drawings are renumbered using the current series.';
            const label = document.createElement('label');
            label.textContent = 'Type ' + number + ' exactly to confirm:';
            const input = document.createElement('input');
            input.type = 'text'; input.autocomplete = 'off'; input.spellcheck = false;
            input.setAttribute('aria-label', 'Drawing number to confirm deletion');
            label.appendChild(input);
            const actions = document.createElement('div');
            actions.className = 'na-le-register__delete-actions';
            const cancel = document.createElement('button');
            cancel.type = 'button'; cancel.textContent = 'Cancel';
            const remove = document.createElement('button');
            remove.type = 'button'; remove.textContent = 'Delete drawing';
            remove.className = 'na-le-register__danger'; remove.disabled = true;
            let settled = false;
            const finish = (confirmed) => {
                if (settled) return;
                settled = true; dialog.close(); dialog.remove();
                if (previous && previous.isConnected) previous.focus();
                resolve(confirmed);
            };
            input.addEventListener('input', () => { remove.disabled = input.value !== number; });
            input.addEventListener('keydown', (event) => {
                event.stopPropagation();
                if (event.key === 'Enter') { event.preventDefault(); if (input.value === number) finish(true); }
            });
            remove.addEventListener('click', () => { if (input.value === number) finish(true); });
            cancel.addEventListener('click', () => finish(false));
            dialog.addEventListener('cancel', (event) => { event.preventDefault(); finish(false); });
            actions.append(cancel, remove); dialog.append(heading, warning, label, actions);
            document.body.appendChild(dialog); dialog.showModal(); input.focus();
        });
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

    export { Na__LeRegDelete__Confirm };
