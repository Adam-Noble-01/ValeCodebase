// -----------------------------------------------------------------------------
// REGION | PhotoMeasurePro DOM Utility Helpers
// -----------------------------------------------------------------------------
const PhotoMeasurePro__AppUtils__DomHelpers = (function() {

    // FUNCTION | Get Required Element By ID
    // ------------------------------------------------------------
    function PhotoMeasurePro__DomHelpers__GetElementById(elementId) {
        const domElement = document.getElementById(elementId);
        if (!domElement) {
            throw new Error("Missing DOM element: " + elementId);
        }
        return domElement;
    }
    // ------------------------------------------------------------

    // FUNCTION | Set Hidden Class State
    // ------------------------------------------------------------
    function PhotoMeasurePro__DomHelpers__SetHiddenByClass(domElement, isHidden, hiddenClassName) {
        if (!domElement) return;
        if (isHidden) domElement.classList.add(hiddenClassName);
        else domElement.classList.remove(hiddenClassName);
    }
    // ------------------------------------------------------------

    // FUNCTION | Set Active Button In Group
    // ------------------------------------------------------------
    function PhotoMeasurePro__DomHelpers__SetActiveButton(buttonNodeList, activePredicate, activeClassName) {
        buttonNodeList.forEach(function(domButton) {
            if (activePredicate(domButton)) domButton.classList.add(activeClassName);
            else domButton.classList.remove(activeClassName);
        });
    }
    // ------------------------------------------------------------

    return {
        PhotoMeasurePro__DomHelpers__GetElementById: PhotoMeasurePro__DomHelpers__GetElementById,
        PhotoMeasurePro__DomHelpers__SetHiddenByClass: PhotoMeasurePro__DomHelpers__SetHiddenByClass,
        PhotoMeasurePro__DomHelpers__SetActiveButton: PhotoMeasurePro__DomHelpers__SetActiveButton
    };
})();

window.PhotoMeasurePro__AppUtils__DomHelpers = PhotoMeasurePro__AppUtils__DomHelpers;
// endregion ----------------------------------------------------
