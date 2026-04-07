// =============================================================================
// WHITECARDOPEDIA - BLOCKOUT WARNING BANNER COMPONENT
// =============================================================================
//
// FILE       : Na__Feature__Blockoutopedia__WarningBanner.jsx
// NAMESPACE  : Whitecardopedia
// MODULE     : BlockoutWarningBanner Component
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Warning banner displayed above cards in Blockout gallery mode
// CREATED    : 07-Apr-2026
//
// DESCRIPTION:
// - Renders a warning banner explaining what blockout models are
// - Displays confidentiality restrictions and usage guidelines
// - Includes a placeholder "Request Full Whitecard Model" button
// - Only rendered when galleryMode is 'blockout'
//
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | BlockoutWarningBanner Component
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Warning Banner Content Text
    // ------------------------------------------------------------
    const BLOCKOUT_BANNER_CONTENT = {
        title           : 'Blockout Models',
        subtitle        : 'Rough Massing Pass Only',
        description     : 'A blockout model is purely about shape, scale, and proportion. It is the rough massing pass only, modelled at very low detail with simple blocks and boxes. The artist\'s CAD is mapped to faces only, with little or no concern to profiles, projections, guttering, columns, or architectural details. It is a completely flat and stripped-back model with no depth or fine details applied.',
        limitationsList : [
            'Not validated in the same way as Whitecard models and may not be as accurate.',
            'Missing windows, elevations, or architectural details will not be filled in by the 3D Modelling Technician.',
            'Only what is provided in the CAD file will be modelled.',
            'Areas not provided will be left blank or have the fog effect applied to exclude unknown areas of the building.',
            'Profiles, projections, guttering, columns, and fine architectural details are not included.',
        ],
        confidentiality : 'These models must not under any circumstance be shown to clients or other departments apart from the Concept Artists. They are for internal use only, for the production of concept design paintings and should not be used for any other purpose.',
        requestButton   : 'Request Full Whitecard Model',
    };
    // ------------------------------------------------------------


    // COMPONENT | Blockout Warning Banner with Usage Guidelines
    // ------------------------------------------------------------
    function BlockoutWarningBanner() {
        // SUB FUNCTION | Handle Request Button Click (placeholder)
        // ---------------------------------------------------------------
        const handleRequestWhitecard = () => {
            alert('Whitecard model request feature coming soon. Please contact Closet Adam directly for now.');
        };
        // ---------------------------------------------------------------

        return (
            <div className="blockout-warning-banner">
                <div className="blockout-warning-banner__header">
                    <span className="blockout-warning-banner__icon">&#9888;</span>
                    <div className="blockout-warning-banner__title-group">
                        <h3 className="blockout-warning-banner__title">{BLOCKOUT_BANNER_CONTENT.title}</h3>
                        <span className="blockout-warning-banner__subtitle">{BLOCKOUT_BANNER_CONTENT.subtitle}</span>
                    </div>
                </div>

                <p className="blockout-warning-banner__text">
                    {BLOCKOUT_BANNER_CONTENT.description}
                </p>

                <ul className="blockout-warning-banner__limitations-list">
                    {BLOCKOUT_BANNER_CONTENT.limitationsList.map((item, index) => (
                        <li key={index} className="blockout-warning-banner__limitations-item">{item}</li>
                    ))}
                </ul>

                <div className="blockout-warning-banner__confidential">
                    <strong>Confidential &mdash; Internal Use Only</strong>
                    <p>{BLOCKOUT_BANNER_CONTENT.confidentiality}</p>
                </div>

                <button
                    className="blockout-warning-banner__request-button"
                    onClick={handleRequestWhitecard}
                >
                    {BLOCKOUT_BANNER_CONTENT.requestButton}
                </button>
            </div>
        );
    }
    // ---------------------------------------------------------------

// endregion -------------------------------------------------------------------
