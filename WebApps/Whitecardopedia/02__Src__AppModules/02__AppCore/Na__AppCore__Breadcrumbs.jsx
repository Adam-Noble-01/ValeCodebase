// =============================================================================
// WHITECARDOPEDIA - BREADCRUMB NAVIGATION COMPONENT
// =============================================================================
//
// FILE       : Na__AppCore__Breadcrumbs.jsx
// NAMESPACE  : Whitecardopedia
// MODULE     : Breadcrumbs Component
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Trail navigation back to the gallery from the tool views
// CREATED    : 18-Aug-2026
//
// DESCRIPTION:
// - Replaces the floating "Back to Gallery" button that sat inside the header
//   bar, where it collided with the Vale and Whitecardopedia logos.
// - Sits directly beneath the header as a full width bar, so the header stays
//   a clean two-logo band and navigation reads as a location trail rather than
//   a single ambiguous back action.
// - Every trail entry except the last is clickable; the last entry is the
//   current page and is rendered as plain text.
//
// USAGE:
//   <Breadcrumbs
//       trail={[{ label: 'Whitecardopedia', onClick: onBack }]}
//       current="Production Key Performance Indicators"
//   />
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 18-Aug-2026 - Version 1.0.0
// - Initial release, used by the Time Analysis Tool and the Project Editor.
//
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Breadcrumbs Component
// -----------------------------------------------------------------------------

    // COMPONENT | Breadcrumb Trail Navigation Bar
    // ------------------------------------------------------------
    function Breadcrumbs({ trail = [], current = '' }) {
        const steps = Array.isArray(trail) ? trail.filter(Boolean) : [];      // <-- Guard against a malformed trail

        return (
            <nav className="breadcrumbs" aria-label="Breadcrumb">
                <ol className="breadcrumbs__list">
                    {steps.map((step, index) => (
                        <li className="breadcrumbs__item" key={`${step.label}-${index}`}>
                            <button
                                type="button"
                                className="breadcrumbs__link"
                                onClick={step.onClick}
                                disabled={!step.onClick}
                            >
                                {index === 0 && (
                                    <img
                                        src="../assets__CommonApplicationAssets/AppIcons/Icon__BackSymbol__WhiteVersion.svg"
                                        alt=""
                                        aria-hidden="true"
                                        className="breadcrumbs__home-icon"
                                    />
                                )}
                                {step.label}
                            </button>
                            <span className="breadcrumbs__separator" aria-hidden="true">/</span>
                        </li>
                    ))}

                    {current && (
                        <li className="breadcrumbs__item breadcrumbs__item--current" aria-current="page">
                            <span className="breadcrumbs__current">{current}</span>
                        </li>
                    )}
                </ol>
            </nav>
        );
    }
    // ---------------------------------------------------------------

// endregion -------------------------------------------------------------------
