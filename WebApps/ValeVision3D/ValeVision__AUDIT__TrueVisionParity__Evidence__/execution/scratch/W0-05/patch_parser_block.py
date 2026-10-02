"""Replace the strip_comments .. parse_module block of port_order_map.py with a string-masking version (scratch tool)."""
import io, os, re

HERE = os.path.dirname(os.path.abspath(__file__))
TARGET = os.path.join(HERE, "port_order_map.py")

NEW_BLOCK = r'''def strip_comments(src):
    """Return (code, masked): comments removed; in `masked` every string, template and regex
    literal keeps its delimiters but its interior is replaced by 'x' (same length), so statement
    regexes never match text inside a literal while spans still index into `code`."""
    out, msk = [], []
    i, n = 0, len(src)
    prev = ""          # last significant (non-space) character emitted
    word = []          # identifier being emitted
    last_word = ""     # last complete identifier emitted
    while i < n:
        c = src[i]
        nx = src[i + 1] if i + 1 < n else ""
        if c in "\"'`":
            q = c
            j = i + 1
            while j < n:
                d = src[j]
                if d == "\\":
                    j += 2
                    continue
                if d == q:
                    break
                if q != "`" and d == "\n":       # unterminated plain string: stop at the line end
                    break
                j += 1
            lit = src[i:j + 1]
            out.append(lit)
            if len(lit) >= 2 and lit[-1] == q:
                msk.append(q + re.sub(r"[^\n]", "x", lit[1:-1]) + q)
            else:
                msk.append(q + re.sub(r"[^\n]", "x", lit[1:]))
            i = j + 1
            prev = q
            word, last_word = [], ""
            continue
        if c == "/" and nx == "/":
            while i < n and src[i] != "\n":
                i += 1
            continue
        if c == "/" and nx == "*":
            j = src.find("*/", i + 2)
            i = n if j < 0 else j + 2
            out.append(" ")
            msk.append(" ")
            continue
        if c == "/":
            is_regex = (prev == "" or prev in _REGEX_PREV or
                        ((prev.isalnum() or prev in "_$") and last_word in _KW_BEFORE_REGEX))
            if is_regex:
                j = i + 1
                in_class = False
                while j < n:
                    d = src[j]
                    if d == "\\":
                        j += 2
                        continue
                    if d == "\n":
                        break
                    if in_class:
                        if d == "]":
                            in_class = False
                    elif d == "[":
                        in_class = True
                    elif d == "/":
                        break
                    j += 1
                j += 1
                while j < n and (src[j].isalnum() or src[j] in "_$"):
                    j += 1
                lit = src[i:j]
                out.append(lit)
                msk.append("/" + re.sub(r"[^\n]", "x", lit[1:]))
                i = j
                prev = "/"
                word, last_word = [], ""
                continue
        out.append(c)
        msk.append(c)
        if c.isalnum() or c in "_$":
            word.append(c)
            last_word = "".join(word)
        else:
            word = []
            if not c.isspace():
                last_word = ""
        if not c.isspace():
            prev = c
        i += 1
    code, masked = "".join(out), "".join(msk)
    assert len(code) == len(masked)
    return code, masked


# -----------------------------------------------------------------------------
# Import / export parsing
# -----------------------------------------------------------------------------
ID = r"[A-Za-z_$][\w$]*"
RE_IMPORT_FROM = re.compile(r"(?<![\w$.])import\s*((?:" + ID + r"\s*,\s*)?(?:\*\s*as\s+" + ID + r"|\{[^{}'\"`]*\}|" + ID +
                            r"))\s*from\s*(['\"])([^'\"\n]+)\2")
RE_IMPORT_BARE = re.compile(r"(?<![\w$.])import\s*(['\"])([^'\"\n]+)\1")
RE_IMPORT_DYN = re.compile(r"(?<![\w$.])import\s*\(\s*(['\"`])([^'\"`\n$]+)\1\s*[,)]")
RE_IMPORT_DYN_ANY = re.compile(r"(?<![\w$.])import\s*\(")
RE_EXPORT_FROM = re.compile(r"(?<![\w$.])export\s*(\*\s*(?:as\s+" + ID + r"\s*)?|\{[^{}'\"`]*\}\s*)from\s*(['\"])([^'\"\n]+)\2")
RE_EXPORT_DECL = re.compile(r"(?<![\w$.])export\s+(?:async\s+)?(?:function\s*\*?\s*|class\s+|const\s+|let\s+|var\s+)(" + ID + ")")
RE_EXPORT_DEFAULT = re.compile(r"(?<![\w$.])export\s+default\b")
RE_EXPORT_LIST = re.compile(r"(?<![\w$.])export\s*\{([^{}'\"`]*)\}(?!\s*from)")
RE_EXPORT_DESTRUCT = re.compile(r"(?<![\w$.])export\s+(?:const|let|var)\s*\{([^{}'\"`]*)\}\s*=")
RE_NEW_URL = re.compile(r"new\s+URL\s*\(\s*(['\"])([^'\"\n]+)\1\s*,\s*import\.meta\.url\s*\)")


def _split_names(inner):
    res = []
    for part in inner.split(","):
        part = part.strip()
        if not part:
            continue
        pieces = re.split(r"\s+as\s+", part)
        res.append((pieces[0].strip(), (pieces[1] if len(pieces) > 1 else pieces[0]).strip()))
    return res


def parse_module(code, masked=None):
    """code = comment-stripped source, masked = the same with literal interiors masked.
    Statements are found in `masked`; specifier strings are read back from `code` by span."""
    if masked is None:
        masked = code
    imports = []
    for m in RE_IMPORT_FROM.finditer(masked):
        clause, spec = m.group(1).strip(), code[m.start(3):m.end(3)]
        default = ns = None
        names = []
        mm = re.match(r"^(" + ID + r")\s*,\s*(.*)$", clause, re.S)
        if mm and not clause.startswith("{") and not clause.startswith("*"):
            default, clause = mm.group(1), mm.group(2).strip()
        if clause.startswith("*"):
            ns = re.match(r"\*\s*as\s+(" + ID + ")", clause).group(1)
        elif clause.startswith("{"):
            names = [a for a, b in _split_names(clause[1:-1])]
        elif re.match("^" + ID + "$", clause):
            default = clause
        req = list(names)
        if default:
            req.append("default")
        if ns:
            used = sorted(set(re.findall(r"(?<![\w$.])" + re.escape(ns) + r"\s*\.\s*(" + ID + ")", masked)))
            req.extend(used)
        imports.append({"spec": spec, "kind": "static", "names": req, "namespace": ns, "pos": m.start()})
    for m in RE_IMPORT_BARE.finditer(masked):
        imports.append({"spec": code[m.start(2):m.end(2)], "kind": "side-effect", "names": [], "namespace": None, "pos": m.start()})
    for m in RE_EXPORT_FROM.finditer(masked):
        head = m.group(1).strip()
        names = [] if head.startswith("*") else [a for a, b in _split_names(head.strip()[1:-1])]
        imports.append({"spec": code[m.start(3):m.end(3)], "kind": "re-export", "names": names, "namespace": None,
                        "pos": m.start(), "star": head.startswith("*")})
    dyn_literal = 0
    for m in RE_IMPORT_DYN.finditer(masked):
        imports.append({"spec": code[m.start(2):m.end(2)], "kind": "dynamic", "names": [], "namespace": None, "pos": m.start()})
        dyn_literal += 1
    dyn_all = len(RE_IMPORT_DYN_ANY.findall(masked))

    exports, stars = set(), []
    for m in RE_EXPORT_DECL.finditer(masked):
        exports.add(m.group(1))
    if RE_EXPORT_DEFAULT.search(masked):
        exports.add("default")
    for m in RE_EXPORT_LIST.finditer(masked):
        for a, b in _split_names(m.group(1)):
            exports.add(b)
    for m in RE_EXPORT_DESTRUCT.finditer(masked):
        for part in m.group(1).split(","):
            part = part.strip()
            if not part:
                continue
            exports.add(part.split(":")[-1].strip().split("=")[0].strip())
    for m in RE_EXPORT_FROM.finditer(masked):
        head = m.group(1).strip()
        if head.startswith("*"):
            mm = re.match(r"\*\s*as\s+(" + ID + ")", head)
            if mm:
                exports.add(mm.group(1))
            else:
                stars.append(code[m.start(3):m.end(3)])
        else:
            for a, b in _split_names(head[1:-1]):
                exports.add(b)
    urls = [code[m.start(2):m.end(2)] for m in RE_NEW_URL.finditer(masked)]
    return {"imports": imports, "exports": exports, "star_from": stars, "dyn_nonliteral": max(0, dyn_all - dyn_literal),
            "urls": urls}


def parse_source(text):
    code, masked = strip_comments(text)
    return parse_module(code, masked)
'''

with open(TARGET, "rb") as f:
    raw = f.read()
eol = b"\r\n" if b"\r\n" in raw else b"\n"
text = raw.decode("utf-8")
start = text.index("def strip_comments(src):\n")
end_marker = '            "urls": urls}\n'
end = text.index(end_marker, start) + len(end_marker)
assert text.count("def strip_comments(src):\n") == 1
new_text = text[:start] + NEW_BLOCK + text[end:]
with open(TARGET, "wb") as f:
    f.write(new_text.replace("\r\n", "\n").encode("utf-8") if eol == b"\n" else new_text.encode("utf-8"))
print("patched", TARGET, "eol", eol)
