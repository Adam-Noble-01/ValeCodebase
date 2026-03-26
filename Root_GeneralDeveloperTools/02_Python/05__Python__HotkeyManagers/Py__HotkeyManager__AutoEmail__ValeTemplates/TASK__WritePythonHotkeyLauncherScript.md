## You an expert python Developer with 30 years experience 

Objective : Create a hotkey script.

- Create a script that allows me the ability to bind the Alt Graphic Key (Alt Gr key) which is unused in the UK to more useful functions.

- Im already using AHK but I'm growing tired of its dated and problematic structure.
- My plan is to put a script in ShellStartup that does the same thing but allows for greater extensibility, realiability, modularity etc.
- As a test now a python script with embedded json with the mappings at the very start that can be extended over time.
- Keys are targetting function further in the code
- values are the key combo (Cntl) (Shift) (Alt) (AltGr) Noted in brackets like that opr paired such as 
    - `(Alt Gr  +  E)`  
    - So modifier  space space + space space like that
- For the first make Alt Gr open this literal absolulte path 
    -  D:\01_Notebooks\10__StandardEmails\EMAIL__StandardDevlieryEmail__WhiteCardDelivery.md
- Make it open in Cursor AI App (I used this app for markdown files)



Debug Mode

- Add in the json a simple Debug Mode On / Off in its own json level (debig tools willbe extended)
- When set to FALSE it runs with no black python cli both appearing
- If True it loads with CLI For debugging etc
