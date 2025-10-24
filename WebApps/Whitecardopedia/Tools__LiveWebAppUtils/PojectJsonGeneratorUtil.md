## Objective - Create A Tool For Editing Project Data Files

---

### Current Issue 

- Have to edit each Json File each time I make a new project.
- Relies on me opening an IDE each time I use the tool even if minor edits are required.

#### Solution

- The limitation using the Static web version is that no edits would be possible, however using the Local Hosted Version should allow for editing of each projects project.json using a simple form like page



### Design

- Like with the Gallery and Project views, this new Project Editor tool should be a new page with an option to return to the gallery
- It should be nested in a new Hamburger menu, add the hamburger menu besides the search bar (left of search bar) nudging search bar over slightly.
- Hamburger menu will eventually contain other tools from the /Tools__LiveWebAppUtils folder



### Function

Step 01 - User selects "Project Editor" from the new hamburger menu

  IF Web Version used THEN Popup "Sorry this tool is not yet available in the Web Version, Run on Local Host To Edit Project Details"