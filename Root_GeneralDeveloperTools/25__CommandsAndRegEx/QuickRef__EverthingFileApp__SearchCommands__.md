# Everything Search Queries

###### This file contains useful queries for searching for files in Everything file browser

---

### Search For Vale Logo In PNG Format Excluding Recycle Bin.

**Query**

```EverythingQuery
!D:\$RECYCLE.BIN\  D:\  Vale logo  *.png
```

---

## Component Breakdown

**Query**

```EverythingQuery
!D:\$RECYCLE.BIN\  D:\  Vale logo  *.png
```
- This search command uses Boolean operators, path restrictions, and wildcards to find a highly specific file while filtering out junk.

#### !D:\$RECYCLE.BIN\
  - **Operator:** `!` (NOT)
  - **Meaning:** Exclude any files located inside the D: drive's Recycle Bin. This prevents deleted files from showing up in your search results./


#### [Space]
   - **Operator:** ` ` (AND)
   - **Meaning:** In Everything, a space between terms means *both* conditions must be met.

#### D:
   - **Operator:** Path matching
   - **Meaning:** Restricts the search entirely to the D: drive. 
   - **Usage:** The D:Drive is where Assets are kept locally.
     - C:\ is the location of System files on Vale PC.


#### Vale logo
   - **Operator:** Text match (with an invisible AND space)
   - **Meaning:** The filename or folder path must contain the word "Vale" AND the word "logo".

#### `*.png`
   - **Operator:** Wildcard extension
   - **Meaning:** Matches any file name (`*`) that ends specifically with the `.png` image file extension.

---

### Summary
- Find all **.png** image files on the **D: drive** 
- Files must have **'Vale'** and **'logo'** in their name.
- Exclude** any deleted files sitting in the **Recycle Bin**."

----

---

### Show Only Root-Level Files (No Subfolders)

**Query**

```EverythingQuery
parent:"C:\Users\adamw\AppData\Roaming\SketchUp\SketchUp 2026\SketchUp\Plugins"  !folder:
```

---

## Component Breakdown

**Query**

```EverythingQuery
parent:"C:\Users\adamw\AppData\Roaming\SketchUp\SketchUp 2026\SketchUp\Plugins"  !folder:
```

- This search command restricts results to only the **immediate contents** of a folder and excludes all subfolder contents.

#### parent:"C:\Users\adamw\AppData\Roaming\SketchUp\SketchUp 2026\SketchUp\Plugins"

- **Operator:** `parent:`
- **Meaning:** Limits results strictly to items whose **direct parent folder** is the specified directory.
- **Key Behaviour:**  
  - Includes only first-level items inside the Plugins folder  
  - Prevents recursion into deeper nested folders  
- **Use Case:** Ideal for inspecting plugin root structure without noise from `.git`, modules, or nested assets

#### [Space]

- **Operator:** ` ` (AND)
- **Meaning:** Both conditions must be true

#### !folder:

- **Operator:** `!` (NOT) + `folder:`
- **Meaning:** Excludes all folders from results
- **Result:** Only files are shown (e.g. `.rb`, `.json`, `.txt`)

---

### Summary

- Shows only files located directly inside the **Plugins** directory  
- Ignores all nested folder contents (no recursion)  
- Filters out folders entirely, leaving only usable file-level assets  

---

---

###### End Of Document 

