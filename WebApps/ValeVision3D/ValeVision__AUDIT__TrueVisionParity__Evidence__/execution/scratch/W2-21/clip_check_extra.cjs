// ---------------------------------------------------------------------------
// W2-21 acceptance checks (appended to TrueVision's suite; same fixture)
// ---------------------------------------------------------------------------

function trio(f) {
    const text  = f.add('annotation', 'textA', { Annotation__Text: 'Note A', Annotation__PosXMm: 120, Annotation__PosYMm: 80 });
    const lineA = f.add('shape', 'lineA', { Shape__Points: [[10, 20], [60, 20]], Shape__LayerId: 'vector' });
    const lineB = f.add('shape', 'lineB', { Shape__Points: [[10, 30], [60, 30]], Shape__LayerId: 'vector' });
    const vec   = f.add('shape', 'vec', { Shape__Points: [[200, 200], [250, 240], [210, 260]], Shape__LayerId: 'vector', Shape__Closed: true });
    const group = f.add('group', 'grp', { Group__Members: [lineA, lineB] });
    return { text, vec, group };
}

for (const [name, pick] of [['text', t => t.text], ['a group', t => t.group], ['a vector', t => t.vec]]) {
    test('W2-21: Ctrl+C / Ctrl+V of ' + name + ' on the SAME sheet lands exactly in place (DR-40 item 1)', () => {
        const f = fixture(); const t = trio(f); const item = pick(t);
        f.select([item]);
        assert.equal(f.key('Copy'), true);
        const before = plain(f.from);
        assert.equal(f.key('Paste'), true);
        const sel = f.selected(); assert.equal(sel.length, 1); assert.equal(sel[0].kind, item.kind); assert.notEqual(sel[0].id, item.id);
        if (item.kind === 'annotation') {
            const made = f.from.Sheet__Annotations.find(r => r.Annotation__Id === sel[0].id);
            assert.equal(made.Annotation__PosXMm, 120); assert.equal(made.Annotation__PosYMm, 80); assert.equal(made.Annotation__Text, 'Note A');
        } else if (item.kind === 'shape') {
            const made = f.from.Sheet__Shapes.find(r => r.Shape__Id === sel[0].id);
            assert.deepEqual(made.Shape__Points, before.Sheet__Shapes.find(r => r.Shape__Id === 'vec').Shape__Points);
        } else {
            const made = f.from.Sheet__Groups.find(r => r.Group__Id === sel[0].id);
            assert.equal(made.Group__Members.length, 2);
            const pts = made.Group__Members.map(m => f.from.Sheet__Shapes.find(r => r.Shape__Id === m.id).Shape__Points);
            assert.deepEqual(pts, [[[10, 20], [60, 20]], [[10, 30], [60, 30]]]);
            assert.ok(made.Group__Members.every(m => m.id !== 'lineA' && m.id !== 'lineB'));
        }
    });
    test('W2-21: Ctrl+C on one sheet, Ctrl+V of ' + name + ' on ANOTHER sheet lands at the same paper coordinates', () => {
        const f = fixture(); const t = trio(f); const item = pick(t);
        f.select([item]); assert.equal(f.key('Copy'), true);
        f.switchSheet(f.to); assert.equal(f.key('Paste'), true);
        const sel = f.selected(); assert.equal(sel.length, 1); assert.equal(sel[0].kind, item.kind);
        if (item.kind === 'annotation') {
            const made = f.to.Sheet__Annotations[0]; assert.equal(made.Annotation__PosXMm, 120); assert.equal(made.Annotation__PosYMm, 80);
        } else if (item.kind === 'shape') {
            assert.deepEqual(f.to.Sheet__Shapes[0].Shape__Points, [[200, 200], [250, 240], [210, 260]]);
        } else {
            assert.equal(f.to.Sheet__Groups.length, 1);
            assert.deepEqual(f.to.Sheet__Shapes.map(s => s.Shape__Points), [[[10, 20], [60, 20]], [[10, 30], [60, 30]]]);
        }
    });
}

test('W2-21: a Scrapbook / Custom Scrapbook drop - InsertSet(sheet, set, topLeft) - lands its top-left at the drop point', () => {
    const f = fixture();
    // A set built the way the scrapbooks build one: roots, entries, origin, size - no source sheet, no layers.
    const set = {
        roots: [{ kind: 'shape', id: 's1' }, { kind: 'annotation', id: 'a1' }],
        entries: [
            { kind: 'shape', id: 's1', record: { Shape__Id: 's1', Shape__Points: [[0, 0], [20, 0], [20, 10]], Shape__LayerId: 'vector' } },
            { kind: 'annotation', id: 'a1', record: { Annotation__Id: 'a1', Annotation__Text: 'Label', Annotation__PosXMm: 5, Annotation__PosYMm: 5 } }
        ],
        origin: { x: 0, y: 0 }, size: { WidthMm: 20, HeightMm: 10 }
    };
    const landed = f.ctx.Na__LeClip__InsertSet(f.to, set, { x: 30, y: 40 });
    assert.equal(landed.length, 2);
    assert.deepEqual(f.to.Sheet__Shapes[0].Shape__Points, [[30, 40], [50, 40], [50, 50]]);
    assert.equal(f.to.Sheet__Annotations[0].Annotation__PosXMm, 35); assert.equal(f.to.Sheet__Annotations[0].Annotation__PosYMm, 45);
    assert.equal(f.selected().length, 2);
});

test('W2-21: a Parametric drop - InsertSet(sheet, set, set.origin) - lands where its origin says', () => {
    const f = fixture();
    const set = {
        roots: [{ kind: 'shape', id: 'p1' }],
        entries: [{ kind: 'shape', id: 'p1', record: { Shape__Id: 'p1', Shape__Points: [[12, 14], [32, 14]], Shape__LayerId: 'vector' } }],
        origin: { x: 12, y: 14 }, size: { WidthMm: 20, HeightMm: 1 }
    };
    const landed = f.ctx.Na__LeClip__InsertSet(f.from, set, { x: set.origin.x, y: set.origin.y });
    assert.equal(landed.length, 1);
    assert.deepEqual(f.from.Sheet__Shapes[0].Shape__Points, [[12, 14], [32, 14]]);
});

test('W2-21: the right-click rows are Cut / Copy / Duplicate selection and Paste; empty paper offers Paste alone', () => {
    const f = fixture(); const t = trio(f);
    f.select([t.vec]);
    assert.deepEqual(plain(f.ctx.Na__LeClip__MenuItems(f.from, t.vec, { x: 0, y: 0 }).map(r => r.label)), ['Cut selection', 'Copy selection', 'Duplicate selection', 'Paste']);
    f.select([]);
    const empty = f.ctx.Na__LeClip__MenuItems(f.from, null, { x: 0, y: 0 });
    assert.equal(empty.length, 1); assert.equal(empty[0].disabled, true);
});
