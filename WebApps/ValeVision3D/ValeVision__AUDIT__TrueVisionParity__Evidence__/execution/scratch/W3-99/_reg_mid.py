HUNKLIKE = re.compile(r'hunk|not yet whole|moved code|shim|less one|^new\b', re.I)


def generic(x, loaded_by):
    """The spec for a row whose file Wave 2 took whole (or landed new) at TrueVision's path."""
    f, pk = x['f'], x['pk']
    cells = x['cells']
    sv = f.get('Source version', '')
    par = f.get('Parity', '')
    div = f.get('Divergences', '')
    mv = modver(sv)
    spec = {}
    if sv:
        spec[2] = R('%s - taken whole (%s)' % (src_head(sv), pks(pk)))
    tvcur = cells[3].strip()
    if x['landed']:
        spec[0] = SET('`%s`' % x['rel'])
        spec[1] = SET('same path')
        spec[4] = R('%s - landed %s, %s' % (short(first_sentence(par), 150), pks(pk), REL))
        spec[5] = A('%s: %s' % (pks(pk), short(bullets(div), 220) if div else 'banner and PORT NOTE only'))
    else:
        what = 'TrueVision %s taken whole' % mv if mv else 'taken whole'
        spec[4] = R('%s - %s (%s, %s)' % (short(first_sentence(par), 150), what, pks(pk), REL))
        if div:
            spec[5] = R(short(bullets(div), 240))
    if mv and tvcur not in ('', '-') and tvcur != mv:
        spec[6] = R('%s at b2aa9151 is newer than the %s taken - see the file\'s PORT NOTE' % (tvcur, mv))
    else:
        spec[6] = R('none (TV %s taken whole at b2aa9151)' % mv if mv else 'none (taken whole at b2aa9151)')
    return spec


