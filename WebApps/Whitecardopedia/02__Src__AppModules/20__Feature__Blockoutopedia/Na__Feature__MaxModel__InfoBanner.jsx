// =============================================================================
// WHITECARDOPEDIA - MAX MODEL INFO BANNER COMPONENT
// =============================================================================
//
// FILE       : Na__Feature__MaxModel__InfoBanner.jsx
// NAMESPACE  : Whitecardopedia
// MODULE     : MaxModelInfoBanner Component
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Info banner displayed above cards in the Max Models gallery tab
// CREATED    : 10-Jun-2026
//
// DESCRIPTION:
// - Renders an informational banner explaining what Max Models are.
// - Only rendered when galleryMode is 'maxmodel'.
// - Max Models are projects tagged with ProjectType: "MaxModel" (set by the
//   WCP builder when the source folder has the __MaxModel suffix).
//   ValeVision3D automatically boots into MaxEngine for these projects,
//   enabling full PBR materials, ambient occlusion, and glass/mirror
//   environment reflections.
//
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | MaxModelInfoBanner Component
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Info Banner Content Text
    // ------------------------------------------------------------
    const MAX_MODEL_BANNER_CONTENT = {
        title       : 'Max Models',
        subtitle    : 'Full PBR Render Quality',
        description : 'Max Models are premium architectural visualisations that use the full PBR render engine (MaxEngine). These models include physically-based materials, screen-space ambient occlusion, and environment reflections for glass and mirrors/ Opening a Max Model in ValeVision3D will automatically activate the MaxEngine render pipeline.',
    };
    // ------------------------------------------------------------


    // COMPONENT | Max Model Info Banner
    // ------------------------------------------------------------
    function MaxModelInfoBanner() {
        return (
            <div className="max-model-info-banner">
                <div className="max-model-info-banner__header">
                    <span className="max-model-info-banner__icon">&#10025;</span>
                    <div className="max-model-info-banner__title-group">
                        <h3 className="max-model-info-banner__title">{MAX_MODEL_BANNER_CONTENT.title}</h3>
                        <span className="max-model-info-banner__subtitle">{MAX_MODEL_BANNER_CONTENT.subtitle}</span>
                    </div>
                </div>
                <p className="max-model-info-banner__text">
                    {MAX_MODEL_BANNER_CONTENT.description}
                </p>
            </div>
        );
    }
    // ---------------------------------------------------------------

// endregion -------------------------------------------------------------------
