// =============================================================================
// WHITECARDOPEDIA - FILTER PANEL COMPONENT
// =============================================================================
//
// FILE       : Na__Feature__ProjectGallery__FilterPanel.jsx
// NAMESPACE  : Whitecardopedia
// MODULE     : FilterPanel Component
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Collapsible filter panel wrapping all gallery filter and sort controls
// CREATED    : 26-Jun-2026
//
// DESCRIPTION:
// - Renders a toggle button (funnel icon + "Project Filters" text) in the gallery toolbar
// - Clicking the button animates open a drawer containing all three filter dropdowns
// - Search bar naturally expands and shrinks as the drawer claims and releases flex space
// - "Project Filters" text fades out when open, leaving only the funnel icon as a close trigger
// - Owns isOpen state; all filter and sort state remains in ProjectGallery Main
// - Funnel icon loaded from SVG asset file for easy vector editing
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 26-Jun-2026 - Version 1.1.0
// - Funnel icon offloaded to Na__Icon__FilterFunnel__.svg for vector editing
// - Button label updated to "Project Filters"
//
// 26-Jun-2026 - Version 1.0.0
// - Initial Release
// - Collapsible drawer with CSS max-width and opacity transition
//
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | FilterPanel Component
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Asset Paths
    // ------------------------------------------------------------
    const Whitecardopedia__FilterPanel__FUNNEL_ICON_SRC = '04__Assets__AppGraphics/Na__Icon__FilterFunnel__.svg'; // <-- Funnel SVG asset path
    // ---------------------------------------------------------------


    // COMPONENT | Collapsible Filter Panel with Animated Drawer
    // ------------------------------------------------------------
    function FilterPanel({ filterArtist, filterDesigner, artistOptions, designerOptions, onArtistChange, onDesignerChange, sortBy, onSortChange }) {

        // MODULE VARIABLES | Open/Closed Toggle State
        // ---------------------------------------------------------------
        const [isOpen, setIsOpen] = React.useState(false);                   // <-- Tracks drawer visibility
        // ---------------------------------------------------------------


        // SUB FUNCTION | Toggle Drawer Open or Closed
        // ---------------------------------------------------------------
        const handleToggle = () => {
            setIsOpen(prev => !prev);                                         // <-- Flip open state on each click
        };
        // ---------------------------------------------------------------


        return (
            <div className="filter-panel">

                <button
                    className={`filter-panel__toggle${isOpen ? ' filter-panel__toggle--open' : ''}`}
                    onClick={handleToggle}
                    aria-expanded={isOpen}
                    aria-label={isOpen ? 'Close project filters' : 'Open project filters'}
                    type="button"
                >
                    <img
                        src={Whitecardopedia__FilterPanel__FUNNEL_ICON_SRC}
                        alt=""
                        className="filter-panel__toggle-icon"
                        aria-hidden="true"
                        width="14"
                        height="14"
                    />
                    <span className={`filter-panel__toggle-text${isOpen ? ' filter-panel__toggle-text--hidden' : ''}`}>
                        Project Filters
                    </span>
                </button>

                <div
                    className={`filter-panel__drawer${isOpen ? ' filter-panel__drawer--open' : ''}`}
                    aria-hidden={!isOpen}
                >
                    <FilterControls
                        filterArtist={filterArtist}
                        filterDesigner={filterDesigner}
                        artistOptions={artistOptions}
                        designerOptions={designerOptions}
                        onArtistChange={onArtistChange}
                        onDesignerChange={onDesignerChange}
                    />
                    <SortControls
                        sortBy={sortBy}
                        onSortChange={onSortChange}
                    />
                </div>

            </div>
        );
    }
    // ---------------------------------------------------------------

// endregion -------------------------------------------------------------------
