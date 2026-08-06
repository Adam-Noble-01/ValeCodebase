# Vale Database - Valid Test Job Numbers
# =========================================================

- FILE       : Na__ValeDatabase__ValidTestCodes__.md
- MODULE     : 12__System__ValeDatabaseApi
- AUTHOR     : Adam Noble - Noble Architecture
- CREATED    : 06-Aug-2026
- NOTE       : Keep this list in step with Na__ValeDatabase__ClientRecords__.json

The placeholder client table resolves exactly these job numbers.
Any other well-formed 4 or 5 digit number reports "not in the database".

| Job Number | Client                    | Site                            |
| ---------- | ------------------------- | ------------------------------- |
| 1234       | Mr Sylvester Stallone     | Rocky Ridge, Grantham           |
| 1235       | Mr Arnold Schwarzenegger  | Oak Villa, Grantham             |
| 1236       | Mr Jean-Claude Van Damme  | The Brussels House, Grantham    |
| 1237       | Mr Bruce Willis           | Nakatomi Lodge, Grantham        |
| 1256       | Mr & Mrs Harrington       | The Old Rectory, Grantham       |
| 2456       | Dr Eleanor Whitfield      | Willow Barn, Oakham             |
| 3417       | Mr James Pemberton        | 14 Castlegate, Newark-on-Trent  |
| 15134      | Mrs Sarah Ellison         | Ashworth Hall, Melton Mowbray   |
| 94756      | Mr & Mrs Okafor           | The Coach House, Stamford       |

Entry rules enforced by the modal: digits only, 4 or 5 of them, no leading
zero. Anything else shows a red validation message in real time.
