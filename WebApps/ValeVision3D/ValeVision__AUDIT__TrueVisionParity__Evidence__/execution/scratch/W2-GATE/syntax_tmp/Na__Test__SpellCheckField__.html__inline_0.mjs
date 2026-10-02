
    import { Na__SpellCheck__Ready, Na__SpellCheck__Field, Na__SpellCheck__KNOWN_CLASS, Na__SpellCheck__IsKnown } from '../02__Src__AppModules/55__Feature__SpellCheck/Na__SpellCheck__.js';

    const out = document.getElementById('out');
    const stage = document.getElementById('stage');
    const lines = [];
    let passed = 0, failed = 0;
    out.innerHTML = '';
    function check(name, got, want) {
        const ok = JSON.stringify(got) === JSON.stringify(want);
        ok ? passed++ : failed++;
        const li = document.createElement('li');
        li.className = ok ? 'pass' : 'fail';
        li.textContent = (ok ? 'PASS  ' : 'FAIL  ') + name + (ok ? '' : '\n        got  ' + JSON.stringify(got) + '\n        want ' + JSON.stringify(want));
        out.appendChild(li);
        lines.push(li.textContent);
    }

    // TYPING THE WAY A PERSON TYPES: the browser's own insertText, one character at a time.
    const type  = (text) => { for (const ch of text) document.execCommand('insertText', false, ch); };
    const key   = (el, name, options) => el.dispatchEvent(new KeyboardEvent('keydown', Object.assign({ key : name, bubbles : true, cancelable : true }, options || {})));
    const marks = (el) => Array.from(el.querySelectorAll('.' + Na__SpellCheck__KNOWN_CLASS)).map((span) => span.textContent + (span.getAttribute('spellcheck') === 'false' ? '' : ' (checked!)'));
    const caret = (field) => { const s = field.getSelection(); return s ? [ s.start, s.end ] : null; };
    const settle = () => new Promise((resolve) => setTimeout(resolve, 50));    // <-- A timer, not a frame: a page in a hidden pane gets no frames

    await Na__SpellCheck__Ready();
    check('the dictionary is read: Kingspan and rooflights are known, Kingspam is not', [ Na__SpellCheck__IsKnown('Kingspan'), Na__SpellCheck__IsKnown('rooflights'), Na__SpellCheck__IsKnown('Kingspam') ], [ true, true, false ]);

    // -------------------------------------------------------------------------
    // A BOX OF SEVERAL LINES
    // -------------------------------------------------------------------------
    let submitted = 0, cancelled = 0, heardByPage = 0;
    document.addEventListener('keydown', () => heardByPage++);
    const body = Na__SpellCheck__Field({ text : 'Insulation to be ', multiline : true, label : 'Body', onSubmit : () => submitted++, onCancel : () => cancelled++ });
    stage.appendChild(body.element);
    check('the box is editable plain text, spell-checked, in British English', [ body.element.getAttribute('contenteditable'), body.element.getAttribute('spellcheck'), body.element.getAttribute('lang') ], [ 'plaintext-only', 'true', 'en-GB' ]);
    check('it opens with its text, nothing marked', [ body.getText(), marks(body.element) ], [ 'Insulation to be ', [] ]);

    body.focus('end');
    type('Kingsp');
    check('a word part typed is left alone', [ body.getText(), marks(body.element), caret(body) ], [ 'Insulation to be Kingsp', [], [ 23, 23 ] ]);
    type('an');
    check('the letter that completes a dictionary word marks it, spellcheck="false"', [ body.getText(), marks(body.element) ], [ 'Insulation to be Kingspan', [ 'Kingspan' ] ]);
    check('...and the caret is still at the end of it', caret(body), [ 25, 25 ]);
    type(' K15 board');
    check('typing on after the redraw lands where the caret is', [ body.getText(), marks(body.element), caret(body) ], [ 'Insulation to be Kingspan K15 board', [ 'Kingspan' ], [ 35, 35 ] ]);

    body.select(25, 25);
    type('x');
    check('a letter typed onto the end of a marked word unmarks it for the checker', [ body.getText(), marks(body.element), caret(body) ], [ 'Insulation to be Kingspanx K15 board', [], [ 26, 26 ] ]);
    document.execCommand('delete');
    check('Backspace puts it back, marked again, caret in place', [ body.getText(), marks(body.element), caret(body) ], [ 'Insulation to be Kingspan K15 board', [ 'Kingspan' ], [ 25, 25 ] ]);

    body.focus('end');
    type(' with rooflights');
    check('a plural of a dictionary word is marked', marks(body.element), [ 'Kingspan', 'rooflights' ]);

    // Shift+Enter: a line break, in a box of several lines
    key(body.element, 'Enter', { shiftKey : true });
    type('Second line.');
    check('Shift+Enter is a line break, and the typing carries on after it', body.getText(), 'Insulation to be Kingspan K15 board with rooflights\nSecond line.');
    check('...the caret after the last letter', caret(body), [ body.getText().length, body.getText().length ]);

    // Undo and redo are the box's own
    const before = body.getText();
    await new Promise((resolve) => setTimeout(resolve, 900));                   // <-- Past UndoMergeMs: a new step
    type(' More');
    key(body.element, 'z', { ctrlKey : true });
    check('Ctrl+Z undoes the last typing, in the box', body.getText(), before);
    key(body.element, 'y', { ctrlKey : true });
    check('Ctrl+Y does it again', body.getText(), before + ' More');
    key(body.element, 'z', { ctrlKey : true });
    key(body.element, 'z', { ctrlKey : true });
    check('two more Ctrl+Z take back the typing on the new line, leaving the line break', body.getText(), 'Insulation to be Kingspan K15 board with rooflights\n');
    key(body.element, 'z', { ctrlKey : true });
    check('...and a third takes the line break, a step of its own', body.getText(), 'Insulation to be Kingspan K15 board with rooflights');
    check('...and the marks follow the text back', marks(body.element), [ 'Kingspan', 'rooflights' ]);

    // Enter and Escape are the owner's, and go no further
    heardByPage = 0;
    key(body.element, 'Enter');
    key(body.element, 'Escape');
    check('Enter asks to save, Escape to cancel, and the page never hears either', [ submitted, cancelled, heardByPage ], [ 1, 1, 0 ]);

    // A paste is plain text, line breaks kept in a box of several lines
    body.focus('end');
    const paste = new DataTransfer();
    paste.setData('text/html', '<b>Bold</b> Velux');
    paste.setData('text/plain', ' Velux\r\nroof windows');
    body.element.dispatchEvent(new ClipboardEvent('paste', { clipboardData : paste, bubbles : true, cancelable : true }));
    check('a paste is taken as plain text, its line break kept, the brand marked', [ body.getText().endsWith(' Velux\nroof windows'), marks(body.element).indexOf('Velux') !== -1, body.element.querySelector('b') === null ], [ true, true, true ]);
    key(body.element, 'z', { ctrlKey : true });
    check('...and one Ctrl+Z takes the whole paste back', body.getText(), 'Insulation to be Kingspan K15 board with rooflights');

    // -------------------------------------------------------------------------
    // A BOX OF ONE LINE
    // -------------------------------------------------------------------------
    const title = Na__SpellCheck__Field({ text : 'Loggia Arcade', multiline : false, label : 'Title' });
    stage.appendChild(title.element);
    title.focus('end');
    key(title.element, 'Enter', { shiftKey : true });
    type(' East');
    check('Shift+Enter is nothing in a box of one line', title.getText(), 'Loggia Arcade East');
    const one = new DataTransfer();
    one.setData('text/plain', ' by\nCrittall\n');
    title.element.dispatchEvent(new ClipboardEvent('paste', { clipboardData : one, bubbles : true, cancelable : true }));
    check('a paste of several lines is folded to one', title.getText(), 'Loggia Arcade East by Crittall ');
    check('...and Crittall is marked', marks(title.element), [ 'Crittall' ]);

    // -------------------------------------------------------------------------
    // WHAT IS READ BACK
    // -------------------------------------------------------------------------
    const exact = Na__SpellCheck__Field({ text : 'Two  spaces\n\nand a blank line\n', multiline : true });
    stage.appendChild(exact.element);
    check('a text is read back exactly as it was given: double spaces, a blank line, a last line break', exact.getText(), 'Two  spaces\n\nand a blank line\n');
    exact.focus('end');
    type('x');
    check('...and typing on its empty last line lands on that line', exact.getText(), 'Two  spaces\n\nand a blank line\nx');
    check('the word at the caret is offered, and a selection of one word is too', [ body.wordAtCaret() && body.wordAtCaret().word, (() => { body.select(17, 25); return body.wordAtCaret().word; })() ], [ 'rooflights', 'Kingspan' ]);

    [ body, title, exact ].forEach((field) => field.destroy());
    await settle();
    const summary = document.createElement('li');
    summary.className = failed ? 'fail' : 'pass';
    summary.textContent = failed ? failed + ' FAILED, ' + passed + ' passed' : 'ALL ' + passed + ' PASSED';
    out.insertBefore(summary, out.firstChild);
    window.__NaSpellFieldResults = { passed : passed, failed : failed, lines : lines };
