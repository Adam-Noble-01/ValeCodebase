# W0-08 scratch: anchor-based line editing that preserves a file's own line endings and encoding.
# Every anchor must match exactly once (or once after a given start line), otherwise the edit aborts.
import hashlib

COMMENT_COL_DEFAULT = 132


class LineDoc:
    def __init__(self, data: bytes, label: str):
        self.label = label
        self.raw = data
        crlf = data.count(b'\r\n')
        lf = data.count(b'\n')
        if crlf and crlf != lf:
            raise SystemExit(f'{label}: mixed line endings ({crlf} CRLF of {lf} LF) - refusing to edit')
        self.eol = '\r\n' if crlf else '\n'
        text = data.decode('utf-8')
        self.trailing_eol = text.endswith(self.eol)
        body = text[:-len(self.eol)] if self.trailing_eol else text
        self.lines = body.split(self.eol)

    # -- lookups -------------------------------------------------------------------------------
    def find_one(self, needle: str, start: int = 0, end: int = None) -> int:
        end = len(self.lines) if end is None else end
        hits = [i for i in range(start, end) if needle in self.lines[i]]
        if len(hits) != 1:
            raise SystemExit(f'{self.label}: anchor {needle!r} matched {len(hits)} times in lines {start + 1}-{end}')
        return hits[0]

    def find_first(self, needle: str, start: int = 0) -> int:
        for i in range(start, len(self.lines)):
            if needle in self.lines[i]:
                return i
        raise SystemExit(f'{self.label}: anchor {needle!r} not found after line {start + 1}')

    def expect(self, index: int, needle: str):
        if needle not in self.lines[index]:
            raise SystemExit(f'{self.label}: line {index + 1} expected to contain {needle!r}, found {self.lines[index]!r}')

    # -- edits ---------------------------------------------------------------------------------
    def replace(self, first: int, last: int, new_lines):
        """Replace lines first..last (inclusive, 0-based) with new_lines."""
        self.lines[first:last + 1] = list(new_lines)

    def insert_after(self, index: int, new_lines):
        self.lines[index + 1:index + 1] = list(new_lines)

    def insert_before(self, index: int, new_lines):
        self.lines[index:index] = list(new_lines)

    # -- output --------------------------------------------------------------------------------
    def to_bytes(self) -> bytes:
        for i, line in enumerate(self.lines):
            if '\r' in line or '\n' in line:
                raise SystemExit(f'{self.label}: line {i + 1} carries a raw line break')
        text = self.eol.join(self.lines) + (self.eol if self.trailing_eol else '')
        return text.encode('utf-8')


def pad(code: str, comment: str, col: int = COMMENT_COL_DEFAULT) -> str:
    """Pad code so the trailing '// <-- comment' starts at col (at least one space)."""
    gap = max(1, col - len(code))
    return f'{code}{" " * gap}// <-- {comment}'


def sha1(data: bytes) -> str:
    return hashlib.sha1(data).hexdigest()
