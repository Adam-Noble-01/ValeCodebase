

def spec_for(x, loaded_by):
    """The column functions for one row: the generic rule where the file was taken whole (or landed) with a Source
    version, overlaid by the explicit entry; a row the generic rule does not fit must have an explicit entry."""
    rel = x['rel']
    f = x.get('f', {})
    par = f.get('Parity', '')
    fits = bool(f.get('Source version')) and not HUNKLIKE.search(par) and not x.get('deleted')
    spec = generic(x, loaded_by) if fits else {}
    if rel in OVR:
        spec.update(OVR[rel])
    elif not fits:
        raise SystemExit('no explicit entry for a row the generic rule does not fit: %s (%s)' % (rel, par[:60]))
    if x['landed']:
        spec.setdefault(0, SET('`%s`' % rel))
        spec.setdefault(1, SET('same path'))
    if 7 not in spec:
        if loaded_by == '-':
            spec[7] = R('- (nothing imports it yet)')
        else:
            spec[7] = R(loaded_by)
    spec[10] = lambda old, pk=x['pk']: pk_add(old, pk)
    return spec
