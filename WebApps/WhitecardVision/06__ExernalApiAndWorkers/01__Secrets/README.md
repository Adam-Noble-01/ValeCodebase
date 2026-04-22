# WhitecardVision - Secrets Folder

This folder stores API keys and other secret material used only by the
server-side Flask proxy. The browser NEVER receives these values.

## Setup

1. Copy `.env.example` to `.env` in this folder (if it doesn't already exist).
2. Obtain a Google Gemini API key from <https://aistudio.google.com/apikey>.
3. Paste it after the `=` on the `GEMINI_API_KEY=` line in `.env`.
4. Save. Restart the Flask server for the change to take effect.

## Files

| File           | Purpose                                           | Committed |
|----------------|---------------------------------------------------|-----------|
| `.env`         | Active environment variables (YOUR API key)       | NO        |
| `.env.example` | Template with all supported keys and comments     | YES       |
| `.gitignore`   | Ensures `.env` is never committed                 | YES       |
| `README.md`    | This file                                         | YES       |

## Keys

- `GEMINI_API_KEY` (required): your Google Gemini key.
- `GEMINI_MODEL_ID` (locked to `gemini-3-pro-image-preview`; do NOT change to a
  flash-image model - the proxy hard-rejects flash models per app spec).
- `GEMINI_BASE_URL` (leave at the default unless Google changes the endpoint).
- `GEMINI_DEFAULT_IMAGE_SIZE` (`"512"` / `"1K"` / `"2K"` / `"4K"`).
- `GEMINI_REQUEST_TIMEOUT_SECONDS` (outbound request timeout).

Aspect ratio is ALWAYS derived from the uploaded Whitecard image at runtime.
It is not configurable here.
