# Relay Dept — Landing

Self-contained static one-page landing site for Relay Dept.

Dark, editorial / terminal-adjacent visual language. No build step, no
runtime dependencies beyond Google Fonts (loaded via `<link>`). Drop-in
GitHub-Pages compatible.

---

## Files

| File           | Purpose                                                    |
| -------------- | ---------------------------------------------------------- |
| `index.html`   | One-page site: status bar, nav, hero, capabilities, work, process, contact, footer |
| `styles.css`   | All styles. Dark theme, responsive at 1024 / 900 / 520 px |
| `script.js`    | Vanilla JS: status bar, scroll reveal, mobile nav, contact form |
| `favicon`      | Inline SVG data URL in `<link rel="icon">` (no extra file) |

No `node_modules`, no build artifacts, no external runtime JS.

---

## Local preview

The site is plain static HTML. Any of the following work:

```bash
# Python (simplest)
cd /Users/selene/Lunar-Park/lunar-park-sites/relaydept-landing
python3 -m http.server 8000
# → http://localhost:8000

# Node, if installed
npx --yes http-server -p 8000 .
```

Open the URL in a browser. Resize to 1024 / 900 / 520 px to confirm
responsive breakpoints.

You can also open `index.html` directly in a browser (`file://`); the
form's mailto fallback still works. The configured-endpoint path uses
`fetch`, which works from `file://` in modern browsers but logs a CORS
warning for non-relative endpoints — prefer `http://localhost`.

---

## Contact form behavior

The form has **two modes**, controlled by
`window.RELAY_LANDING_CONFIG.endpoint` in `script.js`:

| Mode           | Trigger                              | Submit behavior                                                          |
| -------------- | ------------------------------------ | ------------------------------------------------------------------------ |
| `mailto`       | `endpoint` is empty (default)        | Composes a `mailto:` URL with the form fields and opens the user's mail client |
| `endpoint`     | `endpoint` is set to a URL           | `POST` JSON `{ name, email, project, message, _hp }` to that URL          |

The active mode is shown to the user in a small labeled panel
("Form mode: mailto fallback" / "Form mode: configured endpoint") above
the form so fallback behavior is transparent. No submission endpoint,
third-party secret, or credential is bundled with the site by default.

### Default — mailto fallback

```html
<!-- index.html -->
<script>
  window.RELAY_LANDING_CONFIG = { mailto: 'hello@relaydept.com' };
</script>
<script src="script.js" defer></script>
```

On submit, the browser opens the user's default mail client with a
pre-filled message. No server, no API, no checkout, no embedded
credentials.

### Later — wire a real submission endpoint

After D's review, an endpoint can be configured without code changes
to the form itself:

```html
<!-- index.html, before <script src="script.js"> -->
<script>
  window.RELAY_LANDING_CONFIG = {
    endpoint: 'https://example.com/api/contact',
    mailto: 'hello@relaydept.com'        // kept as a safety net
  };
</script>
```

The endpoint must accept `POST` with a JSON body of:
```json
{ "name": "", "email": "", "project": "", "message": "", "_hp": "" }
```
and respond with HTTP 2xx. A `{ "ok": true }` body is preferred but not
required.

**Important:** the endpoint URL and any keys must be reviewed by D
before being committed. Do not paste API keys, bearer tokens, or
provider secrets into this repo. Front-end code is public; secrets do
not belong here. Use serverless functions, environment-driven builds,
or a backend that holds credentials out of band.

### Spam protection

A single hidden honeypot field (`_hp`) is included. Real users never
see or fill it. If it comes back filled, the form silently accepts and
discards. This is a thin layer — pair it with provider-side filtering
once a real endpoint is configured.

### Accessibility

- Each input has a visible `<label>` (not just a placeholder).
- `aria-live="polite"` status region for submit feedback.
- `aria-invalid="true"` is set on invalid fields, cleared on input.
- Skip-to-main-content link at the top of `<body>`.
- `prefers-reduced-motion` disables scroll-reveal animation and
  smooth scrolling.
- Focus styles preserved on all interactive elements.

---

## Safety assumptions

- **No secrets in repo.** No API keys, bearer tokens, OAuth client IDs,
  or credentials are committed. The site works with no third-party
  account at all in its default mailto configuration.
- **No external runtime JS.** Only Google Fonts is loaded externally
  (`fonts.googleapis.com`, `fonts.gstatic.com`). If those are blocked
  or unavailable, the site still works — system font stack falls back
  to `-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`.
- **No client data fabricated.** "Selected work" cards are explicitly
  labeled `Placeholder` with `Engagement · category TBD` and a disclaimer
  noting that no clients are invented or implied. Names, credits, and
  outcomes will only be added after explicit written permission.
- **No legal claims.** Copy describes capabilities in general terms.
  No fabricated production credits, awards, partnerships, or company
  facts.
- **Honeypot only — no third-party bot service.** No Cloudflare
  Turnstile, reCAPTCHA, or equivalent third-party widget is loaded.
  This keeps the page fully static and dependency-free. Add a real
  provider later if abuse appears.

---

## Publishing to GitHub Pages

When D gives the go-ahead:

1. Move the `relaydept-landing` directory into a GitHub repository
   (Lunar-Park / relaydept-landing, or similar — D's call).
2. In repository settings → Pages:
   - Source: **Deploy from a branch**
   - Branch: `main` (or whichever), folder: `/ (root)`
3. Custom domain (relaydept.com or similar) is configured in the same
   Pages settings panel *after* the site is live, and an apex redirect
   is added if needed. **Do not touch DNS until D approves.**
4. Optional: enable HTTPS enforcement in Pages settings.

The site uses only static files and absolute-path-independent links
(anchor links are `#section`), so it works at any subpath
(`https://user.github.io/repo/` or `https://relaydept.com/`).

---

## Validating locally

```bash
cd /Users/selene/Lunar-Park/lunar-park-sites/relaydept-landing

# 1. Confirm directory layout
ls -la

# 2. Confirm no unintended files / no node_modules / no .git
find . -type d -name node_modules   # expect: nothing
find . -type f -name "*.min.js"    # expect: nothing
ls -la .git 2>/dev/null            # expect: no such file or directory

# 3. JS syntax check
node --check script.js && echo "script.js OK"

# 4. HTML well-formedness (best-effort)
python3 - <<'PY'
import html.parser, sys
class V(html.parser.HTMLParser):
    def __init__(self):
        super().__init__()
        self.stack = []
        self.errors = []
    def handle_starttag(self, tag, attrs):
        if tag not in ('br','hr','img','input','link','meta','source','area','base','col','embed','param','track','wbr'):
            self.stack.append(tag)
    def handle_endtag(self, tag):
        if not self.stack:
            self.errors.append(f'Unexpected </{tag}>')
            return
        if self.stack[-1] != tag:
            self.errors.append(f'Mismatch: expected </{self.stack[-1]}>, got </{tag}>')
        else:
            self.stack.pop()
v = V()
with open('index.html') as f:
    v.feed(f.read())
print('Unclosed:', v.stack)
print('Errors:', v.errors)
PY

# 5. Secret scan (matches the wider repo policy)
command -v gitleaks && gitleaks detect --no-banner --source . || echo "gitleaks not installed; manual review"
```

Run the local preview server (see above) and confirm:
- Status bar shows current date.
- Nav links scroll smoothly to sections.
- Mobile hamburger appears at ≤ 900 px.
- Form: `mailto fallback` tag is visible; submit opens the mail
  client with a pre-filled message.
- Tabbing through the page lands focus visibly on every interactive
  element; skip-link appears on the first Tab.

---

## Out of scope (intentionally)

- No blog, no resources pages, no post templates. Single one-page
  landing only.
- No favicon file — an inline SVG data URL is used to keep the
  directory to four files.
- No analytics, no third-party embeds, no A/B testing.
- No service worker, no PWA manifest.
- No DSPURY, no edits to `../relaydept/`, no DNS, no repo creation.