/* =============================================================================
   VGHLANTERN - CLIENT DOC | BLOCK EDITOR
   =============================================================================

   FILE       : VghLantern__ClientDoc__BlockEditor__.js
   NAMESPACE  : VghLantern
   MODULE     : System - ClientDocumentMode - BlockEditor
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : The one editable block card, built once and used by three panels
   CREATED    : 04-Aug-2026

   DESCRIPTION:
   - Builds the markup for a list of editable text blocks: a card each, an
     auto-growing textarea, a drag handle, a delete control and an optional reset.
   - Emits markup and reads events. It owns no data. Which list it is editing, and
     what happens to a change, is entirely the caller's business.
   - Used three times over: letter paragraphs, critical terms and special terms. The
     interaction is therefore authored once, and the three panels cannot drift into
     behaving differently from each other.

   -----------------------------------------------------------------------------

   WHY THE CARDS ARE NOT INDIVIDUALLY BOUND:
   Every panel rebuilds its list wholesale on any structural change, so a listener
   attached to a card would be attached to a card that is about to be replaced. The
   caller binds once to the persistent panel container and this module supplies the
   data attributes that let a delegated handler work out what was clicked.

   WHY A TEXTAREA AND NOT A CONTENTEDITABLE:
   The blocks carry plain prose that becomes plain PDF text. A contenteditable would
   accept pasted markup, styling and nested elements that all then have to be
   sanitised back down to the plain string the PDF painter can actually draw.

   ============================================================================= */

// =============================================================================
// REGION | Client Document Block Editor Module
// =============================================================================

const VghLantern__ClientDoc__BlockEditor = (function() {

// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | CSS Class Names
    // ------------------------------------------------------------
    const CSS_LIST        =  'VghLantern__ClientDoc__BlockList';
    const CSS_CARD        =  'VghLantern__ClientDoc__BlockCard';
    const CSS_CARD_DRAG   =  'VghLantern__ClientDoc__BlockCard--dragging';
    const CSS_CARD_CRIT   =  'VghLantern__ClientDoc__BlockCard--critical';
    const CSS_HEAD        =  'VghLantern__ClientDoc__BlockHead';
    const CSS_LABEL       =  'VghLantern__ClientDoc__BlockLabel';
    const CSS_TOOLS       =  'VghLantern__ClientDoc__BlockTools';
    const CSS_TOOL        =  'VghLantern__ClientDoc__BlockTool';
    const CSS_HANDLE      =  'VghLantern__ClientDoc__BlockHandle';
    const CSS_TEXTAREA    =  'VghLantern__ClientDoc__BlockInput';
    const CSS_ADD         =  'VghLantern__ClientDoc__BlockAdd';
    const CSS_EMPTY       =  'VghLantern__ClientDoc__BlockEmpty';
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Data Attributes
    // ------------------------------------------------------------
    // Read by the delegated handlers the panels bind. PanelKey is what lets one
    // container host three lists and still route a click to the right one.
    const ATTR_PANEL      =  'data-vgh-block-panel';
    const ATTR_BLOCK_ID   =  'data-vgh-block-id';
    const ATTR_INDEX      =  'data-vgh-block-index';
    const ATTR_ACTION     =  'data-vgh-block-action';
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Textarea Auto-Grow Bounds
    // ------------------------------------------------------------
    // A textarea cannot size itself to its content in CSS, so the height is set from
    // the scroll height on input. These are the rails that keeps a card from
    // collapsing to nothing or growing past the panel.
    const MIN_ROWS_PX     =  54;
    const MAX_ROWS_PX     =  420;
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Helpers
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Escape Text for Safe Markup Insertion
    // ------------------------------------------------------------
    function VghLantern__BlockEditor__Escape(value) {
        return String(value === undefined || value === null ? '' : value)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Build One Tool Button
    // ------------------------------------------------------------
    // Buttons carry a title rather than an icon font, because the application has no
    // icon set and a one-character glyph with a tooltip is honest about what it is.
    function VghLantern__BlockEditor__Tool(panelKey, blockId, action, glyph, title) {
        return '<button type="button" class="' + CSS_TOOL + '" ' +
               ATTR_PANEL + '="' + VghLantern__BlockEditor__Escape(panelKey) + '" ' +
               ATTR_BLOCK_ID + '="' + VghLantern__BlockEditor__Escape(blockId) + '" ' +
               ATTR_ACTION + '="' + action + '" ' +
               'title="' + VghLantern__BlockEditor__Escape(title) + '" ' +
               'aria-label="' + VghLantern__BlockEditor__Escape(title) + '">' + glyph + '</button>';
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Markup
// -----------------------------------------------------------------------------

    // SUB FUNCTION | Build One Block Card
    // ------------------------------------------------------------
    function VghLantern__BlockEditor__BuildCard(options, block, index) {
        var cardClass  =  CSS_CARD + (options.IsCritical ? ' ' + CSS_CARD_CRIT : '');
        var label      =  options.LabelForIndex
            ? options.LabelForIndex(index, block)
            : (options.ItemLabel + ' ' + (index + 1));

        var tools  =  '';
        if (options.AllowReset && block.CanReset) {
            tools  +=  VghLantern__BlockEditor__Tool(options.PanelKey, block.Id, 'reset', '&#8635;', options.ResetLabel);
        }
        tools  +=  VghLantern__BlockEditor__Tool(options.PanelKey, block.Id, 'delete', '&#10005;', options.DeleteLabel);

        return '<div class="' + cardClass + '" draggable="true" ' +
               ATTR_PANEL + '="' + VghLantern__BlockEditor__Escape(options.PanelKey) + '" ' +
               ATTR_BLOCK_ID + '="' + VghLantern__BlockEditor__Escape(block.Id) + '" ' +
               ATTR_INDEX + '="' + index + '">' +

               '<div class="' + CSS_HEAD + '">' +
               '<span class="' + CSS_HANDLE + '" title="Drag to reorder" aria-hidden="true">&#8942;&#8942;</span>' +
               '<span class="' + CSS_LABEL + '">' + VghLantern__BlockEditor__Escape(label) + '</span>' +
               '<span class="' + CSS_TOOLS + '">' + tools + '</span>' +
               '</div>' +

               '<textarea class="' + CSS_TEXTAREA + '" ' +
               ATTR_PANEL + '="' + VghLantern__BlockEditor__Escape(options.PanelKey) + '" ' +
               ATTR_BLOCK_ID + '="' + VghLantern__BlockEditor__Escape(block.Id) + '" ' +
               'maxlength="' + options.MaxCharacters + '" ' +
               'placeholder="' + VghLantern__BlockEditor__Escape(options.Placeholder) + '" ' +
               'rows="3">' + VghLantern__BlockEditor__Escape(block.Text) + '</textarea>' +

               '</div>';
    }
    // ------------------------------------------------------------


    // FUNCTION | Build a Whole Block List With Its Add Control
    // ------------------------------------------------------------
    // options is { PanelKey, ItemLabel, LabelForIndex, Placeholder, MaxCharacters,
    // AddLabel, ResetLabel, DeleteLabel, AllowReset, IsCritical, EmptyMessage }.
    // blocks is [{ Id, Text, CanReset }].
    function VghLantern__ClientDoc__BlockEditor__BuildList(options, blocks) {
        var list  =  blocks || [];
        var html  =  '<div class="' + CSS_LIST + '" ' +
                     ATTR_PANEL + '="' + VghLantern__BlockEditor__Escape(options.PanelKey) + '">';
        var i;

        if (!list.length && options.EmptyMessage) {
            html  +=  '<p class="' + CSS_EMPTY + '">' +
                      VghLantern__BlockEditor__Escape(options.EmptyMessage) + '</p>';
        }

        for (i = 0; i < list.length; i++) {
            html  +=  VghLantern__BlockEditor__BuildCard(options, list[i], i);
        }

        html  +=  '</div>' +
                  '<button type="button" class="' + CSS_ADD + '" ' +
                  ATTR_PANEL + '="' + VghLantern__BlockEditor__Escape(options.PanelKey) + '" ' +
                  ATTR_ACTION + '="add">' +
                  VghLantern__BlockEditor__Escape(options.AddLabel) + '</button>';

        return html;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Behaviour
// -----------------------------------------------------------------------------

    // FUNCTION | Size a Textarea to Its Content
    // ------------------------------------------------------------
    // Called on render and on every input, so a card is always exactly as tall as
    // what is in it and the panel never carries a scrollbar inside a scrollbar.
    function VghLantern__ClientDoc__BlockEditor__AutoGrow(textareaElement) {
        if (!textareaElement) return;

        textareaElement.style.height  =  'auto';                               // <-- Collapse first, or scrollHeight only ever grows
        textareaElement.style.height  =
            Math.max(MIN_ROWS_PX, Math.min(MAX_ROWS_PX, textareaElement.scrollHeight + 2)) + 'px';
    }
    // ------------------------------------------------------------


    // FUNCTION | Size Every Textarea Inside a Container
    // ------------------------------------------------------------
    function VghLantern__ClientDoc__BlockEditor__AutoGrowAll(containerElement) {
        if (!containerElement) return;

        var fields  =  containerElement.querySelectorAll('.' + CSS_TEXTAREA);
        var i;
        for (i = 0; i < fields.length; i++) VghLantern__ClientDoc__BlockEditor__AutoGrow(fields[i]);
    }
    // ------------------------------------------------------------


    // FUNCTION | Bind Drag Reordering Within One Container
    // ------------------------------------------------------------
    // Delegated onto the persistent container so it survives every rebuild of the
    // cards. onReorder(panelKey, blockId, targetIndex) is called when a card is
    // dropped somewhere new; the caller performs the move and re-renders.
    function VghLantern__ClientDoc__BlockEditor__BindDragReorder(containerElement, onReorder) {
        if (!containerElement) return;

        var draggedId     =  null;
        var draggedPanel  =  null;

        containerElement.addEventListener('dragstart', function(e) {
            var card  =  e.target.closest ? e.target.closest('.' + CSS_CARD) : null;
            if (!card) return;

            draggedId     =  card.getAttribute(ATTR_BLOCK_ID);
            draggedPanel  =  card.getAttribute(ATTR_PANEL);
            card.classList.add(CSS_CARD_DRAG);

            // Firefox will not start a drag without data on the transfer object.
            if (e.dataTransfer) {
                e.dataTransfer.effectAllowed  =  'move';
                e.dataTransfer.setData('text/plain', draggedId);
            }
        });

        containerElement.addEventListener('dragend', function(e) {
            var card  =  e.target.closest ? e.target.closest('.' + CSS_CARD) : null;
            if (card) card.classList.remove(CSS_CARD_DRAG);
            draggedId     =  null;
            draggedPanel  =  null;
        });

        containerElement.addEventListener('dragover', function(e) {
            if (!draggedId) return;

            var card  =  e.target.closest ? e.target.closest('.' + CSS_CARD) : null;
            if (!card || card.getAttribute(ATTR_PANEL) !== draggedPanel) return; // <-- A term never drops into the letter

            e.preventDefault();
            if (e.dataTransfer) e.dataTransfer.dropEffect  =  'move';
        });

        containerElement.addEventListener('drop', function(e) {
            if (!draggedId) return;

            var card  =  e.target.closest ? e.target.closest('.' + CSS_CARD) : null;
            if (!card || card.getAttribute(ATTR_PANEL) !== draggedPanel) return;

            e.preventDefault();

            var targetIndex  =  parseInt(card.getAttribute(ATTR_INDEX), 10);
            var movedId      =  draggedId;
            var movedPanel   =  draggedPanel;

            draggedId     =  null;
            draggedPanel  =  null;

            if (!isNaN(targetIndex) && onReorder) onReorder(movedPanel, movedId, targetIndex);
        });
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public API
// -----------------------------------------------------------------------------

    // PUBLIC API
    // ------------------------------------------------------------
    return {
        VghLantern__ClientDoc__BlockEditor__PanelAttribute   : ATTR_PANEL,
        VghLantern__ClientDoc__BlockEditor__BlockIdAttribute : ATTR_BLOCK_ID,
        VghLantern__ClientDoc__BlockEditor__ActionAttribute  : ATTR_ACTION,
        VghLantern__ClientDoc__BlockEditor__TextareaClass    : CSS_TEXTAREA,

        VghLantern__ClientDoc__BlockEditor__BuildList        : VghLantern__ClientDoc__BlockEditor__BuildList,
        VghLantern__ClientDoc__BlockEditor__AutoGrow         : VghLantern__ClientDoc__BlockEditor__AutoGrow,
        VghLantern__ClientDoc__BlockEditor__AutoGrowAll      : VghLantern__ClientDoc__BlockEditor__AutoGrowAll,
        VghLantern__ClientDoc__BlockEditor__BindDragReorder  : VghLantern__ClientDoc__BlockEditor__BindDragReorder
    };

// endregion -------------------------------------------------------------------

})();

// endregion ===================================================================

window.VghLantern__ClientDoc__BlockEditor  =  VghLantern__ClientDoc__BlockEditor;
