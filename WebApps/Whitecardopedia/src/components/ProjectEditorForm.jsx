// =============================================================================
// WHITECARDOPEDIA - PROJECT EDITOR FORM COMPONENT
// =============================================================================
//
// FILE       : ProjectEditorForm.jsx
// NAMESPACE  : Whitecardopedia
// MODULE     : ProjectEditorForm Component
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Form for editing project.json fields
// CREATED    : 2025
//
// DESCRIPTION:
// - Form component for editing project metadata
// - Editable fields: projectName, projectCode, projectDate, productionData, scheduleData, sketchUp URL
// - Schedule data includes: timeAllocated (expected hours) and timeTaken (actual hours)
// - Validates input before saving to Flask API (positive numbers for time fields)
// - Displays success/error messages after save operation
// - Disabled state during save operation
//
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | ProjectEditorForm Component
// -----------------------------------------------------------------------------

    // COMPONENT | Project Data Editor Form
    // ------------------------------------------------------------
    function ProjectEditorForm({ project, onCancel, onSaveSuccess }) {
        const [formData, setFormData] = React.useState({
            projectName         : project.projectName || '',                 // <-- Project name field
            projectCode         : project.projectCode || '',                 // <-- Project code field
            projectDate         : project.projectDate || '',                 // <-- Project date field
            productionInput     : project.productionData?.input || '',       // <-- Production input field
            productionNotes     : project.productionData?.additionalNotes || '',  // <-- Production notes field
            sketchUpUrl         : project.sketchUpModel?.url || '',          // <-- SketchUp URL field
            timeAllocated       : project.scheduleData?.timeAllocated || '', // <-- Time expected field
            timeTaken           : project.scheduleData?.timeTaken || ''      // <-- Time taken field
        });
        
        const [isSaving, setIsSaving] = React.useState(false);               // <-- Saving state
        const [message, setMessage] = React.useState(null);                  // <-- Status message state
        
        
        // SUB FUNCTION | Handle Input Field Changes
        // ---------------------------------------------------------------
        const handleInputChange = (field, value) => {
            setFormData({
                ...formData,                                                 // <-- Spread existing data
                [field]: value                                               // <-- Update changed field
            });
            setMessage(null);                                                // <-- Clear message on change
        };
        // ---------------------------------------------------------------
        
        
        // SUB FUNCTION | Validate Form Data
        // ---------------------------------------------------------------
        const validateForm = () => {
            if (!formData.projectName.trim()) {
                setMessage({ type: 'error', text: 'Project name is required' });  // <-- Validation error
                return false;                                                // <-- Validation failed
            }
            
            if (!formData.projectCode.trim()) {
                setMessage({ type: 'error', text: 'Project code is required' });  // <-- Validation error
                return false;                                                // <-- Validation failed
            }
            
            if (!formData.projectDate.trim()) {
                setMessage({ type: 'error', text: 'Project date is required' });  // <-- Validation error
                return false;                                                // <-- Validation failed
            }
            
            // VALIDATE TIME ALLOCATED (OPTIONAL BUT MUST BE POSITIVE IF PROVIDED)
            if (formData.timeAllocated !== '') {
                const timeAllocatedNum = parseFloat(formData.timeAllocated);     // <-- Parse to number
                if (isNaN(timeAllocatedNum) || timeAllocatedNum < 0) {
                    setMessage({ type: 'error', text: 'Time expected must be a positive number' });  // <-- Validation error
                    return false;                                            // <-- Validation failed
                }
            }
            
            // VALIDATE TIME TAKEN (OPTIONAL BUT MUST BE POSITIVE IF PROVIDED)
            if (formData.timeTaken !== '') {
                const timeTakenNum = parseFloat(formData.timeTaken);             // <-- Parse to number
                if (isNaN(timeTakenNum) || timeTakenNum < 0) {
                    setMessage({ type: 'error', text: 'Time taken must be a positive number' });  // <-- Validation error
                    return false;                                            // <-- Validation failed
                }
            }
            
            return true;                                                     // <-- Validation passed
        };
        // ---------------------------------------------------------------
        
        
        // SUB FUNCTION | Build Updated Project JSON Object
        // ---------------------------------------------------------------
        const buildUpdatedProject = () => {
            const updatedProject = {
                ...project,                                                  // <-- Spread existing project data
                projectName         : formData.projectName.trim(),           // <-- Update project name
                projectCode         : formData.projectCode.trim(),           // <-- Update project code
                projectDate         : formData.projectDate.trim(),           // <-- Update project date
                productionData      : {
                    ...project.productionData,                               // <-- Spread existing production data
                    input           : formData.productionInput.trim(),       // <-- Update input field
                    additionalNotes : formData.productionNotes.trim()        // <-- Update notes field
                },
                sketchUpModel       : {
                    ...project.sketchUpModel,                                // <-- Spread existing SketchUp data
                    url             : formData.sketchUpUrl.trim()            // <-- Update URL field
                }
            };
            
            // ADD SCHEDULE DATA IF ANY TIME VALUES PROVIDED
            if (formData.timeAllocated !== '' || formData.timeTaken !== '') {
                updatedProject.scheduleData = {
                    ...project.scheduleData                                  // <-- Spread existing schedule data
                };
                
                if (formData.timeAllocated !== '') {
                    updatedProject.scheduleData.timeAllocated = parseInt(formData.timeAllocated);  // <-- Set time allocated
                }
                
                if (formData.timeTaken !== '') {
                    updatedProject.scheduleData.timeTaken = parseInt(formData.timeTaken);  // <-- Set time taken
                }
            }
            
            return updatedProject;                                           // <-- Return updated project
        };
        // ---------------------------------------------------------------
        
        
        // FUNCTION | Handle Form Submission
        // ------------------------------------------------------------
        const handleSubmit = async (e) => {
            e.preventDefault();                                              // <-- Prevent default form submit
            
            if (!validateForm()) {
                return;                                                      // <-- Exit if validation fails
            }
            
            setIsSaving(true);                                               // <-- Set saving state
            setMessage(null);                                                // <-- Clear previous message
            
            try {
                const updatedProject = buildUpdatedProject();                // <-- Build updated JSON
                
                const response = await fetch(`/api/projects/${project.folderId}`, {
                    method  : 'POST',                                        // <-- POST request
                    headers : {
                        'Content-Type': 'application/json'                   // <-- JSON content type
                    },
                    body    : JSON.stringify(updatedProject)                 // <-- Send updated data
                });
                
                const result = await response.json();                        // <-- Parse response
                
                if (!response.ok) {
                    throw new Error(result.error || 'Failed to save project');  // <-- Handle error response
                }
                
                setMessage({
                    type : 'success',                                        // <-- Success message type
                    text : 'Project saved successfully!'                     // <-- Success message text
                });
                
                if (onSaveSuccess) {
                    setTimeout(() => {
                        onSaveSuccess(updatedProject);                       // <-- Call success callback
                    }, 1500);                                                // <-- Delay for user to see message
                }
                
            } catch (error) {
                console.error('Error saving project:', error);               // <-- Log error
                setMessage({
                    type : 'error',                                          // <-- Error message type
                    text : `Error: ${error.message}`                         // <-- Error message text
                });
            } finally {
                setIsSaving(false);                                          // <-- Clear saving state
            }
        };
        // ---------------------------------------------------------------
        
        
        return (
            <form className="editor-form" onSubmit={handleSubmit}>
                <h2 className="editor-form__title">
                    Edit Project: {project.projectName}
                </h2>
                
                {message && (
                    <div className={`editor-form__message editor-form__message--${message.type}`}>
                        {message.text}
                    </div>
                )}
                
                {/* PROJECT NAME FIELD */}
                <div className="editor-form__field">
                    <label className="editor-form__label" htmlFor="projectName">
                        Project Name
                    </label>
                    <input
                        type="text"
                        id="projectName"
                        className="editor-form__input"
                        value={formData.projectName}
                        onChange={(e) => handleInputChange('projectName', e.target.value)}
                        disabled={isSaving}
                        required
                    />
                </div>
                
                {/* PROJECT CODE FIELD */}
                <div className="editor-form__field">
                    <label className="editor-form__label" htmlFor="projectCode">
                        Project Code
                    </label>
                    <input
                        type="text"
                        id="projectCode"
                        className="editor-form__input"
                        value={formData.projectCode}
                        onChange={(e) => handleInputChange('projectCode', e.target.value)}
                        disabled={isSaving}
                        required
                    />
                </div>
                
                {/* PROJECT DATE FIELD */}
                <div className="editor-form__field">
                    <label className="editor-form__label" htmlFor="projectDate">
                        Project Date
                    </label>
                    <input
                        type="text"
                        id="projectDate"
                        className="editor-form__input"
                        value={formData.projectDate}
                        onChange={(e) => handleInputChange('projectDate', e.target.value)}
                        placeholder="DD-MMM-YYYY (e.g., 16-Oct-2025)"
                        disabled={isSaving}
                        required
                    />
                    <span className="editor-form__help-text">
                        Format: DD-MMM-YYYY (e.g., 16-Oct-2025)
                    </span>
                </div>
                
                {/* PRODUCTION INPUT FIELD */}
                <div className="editor-form__field">
                    <label className="editor-form__label" htmlFor="productionInput">
                        Production Input
                    </label>
                    <input
                        type="text"
                        id="productionInput"
                        className="editor-form__input"
                        value={formData.productionInput}
                        onChange={(e) => handleInputChange('productionInput', e.target.value)}
                        placeholder="e.g., CAD File, Hand Drawing, etc."
                        disabled={isSaving}
                    />
                </div>
                
                {/* PRODUCTION NOTES FIELD */}
                <div className="editor-form__field">
                    <label className="editor-form__label" htmlFor="productionNotes">
                        Additional Notes
                    </label>
                    <textarea
                        id="productionNotes"
                        className="editor-form__textarea"
                        value={formData.productionNotes}
                        onChange={(e) => handleInputChange('productionNotes', e.target.value)}
                        placeholder="Additional production notes and details..."
                        disabled={isSaving}
                    />
                </div>
                
                {/* TIME EXPECTED FIELD */}
                <div className="editor-form__field">
                    <label className="editor-form__label" htmlFor="timeAllocated">
                        Time Expected (Hours)
                    </label>
                    <input
                        type="text"
                        id="timeAllocated"
                        className="editor-form__input"
                        value={formData.timeAllocated}
                        onChange={(e) => handleInputChange('timeAllocated', e.target.value)}
                        placeholder="e.g., 2"
                        disabled={isSaving}
                    />
                    <span className="editor-form__help-text">
                        Optional - Planned time for project in hours
                    </span>
                </div>
                
                {/* TIME TAKEN FIELD */}
                <div className="editor-form__field">
                    <label className="editor-form__label" htmlFor="timeTaken">
                        Time Taken (Hours)
                    </label>
                    <input
                        type="text"
                        id="timeTaken"
                        className="editor-form__input"
                        value={formData.timeTaken}
                        onChange={(e) => handleInputChange('timeTaken', e.target.value)}
                        placeholder="e.g., 3"
                        disabled={isSaving}
                    />
                    <span className="editor-form__help-text">
                        Optional - Actual time taken to complete project in hours
                    </span>
                </div>
                
                {/* SKETCHUP MODEL URL FIELD */}
                <div className="editor-form__field">
                    <label className="editor-form__label" htmlFor="sketchUpUrl">
                        SketchUp Model URL
                    </label>
                    <input
                        type="text"
                        id="sketchUpUrl"
                        className="editor-form__input"
                        value={formData.sketchUpUrl}
                        onChange={(e) => handleInputChange('sketchUpUrl', e.target.value)}
                        placeholder="https://app.sketchup.com/..."
                        disabled={isSaving}
                    />
                    <span className="editor-form__help-text">
                        Leave blank or set to 'None', 'nil', or 'False' if not available
                    </span>
                </div>
                
                {/* FORM BUTTONS */}
                <div className="editor-form__buttons">
                    <button
                        type="button"
                        className="editor-form__button editor-form__button--secondary"
                        onClick={onCancel}
                        disabled={isSaving}
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        className="editor-form__button editor-form__button--primary"
                        disabled={isSaving}
                    >
                        {isSaving ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
            </form>
        );
    }
    // ---------------------------------------------------------------

// endregion -------------------------------------------------------------------

