# @defluff/extension

Browser extension (Manifest V3) for Gmail and Outlook Web.

## Development

```bash
pnpm install          # at the repo root
pnpm --filter @defluff/extension dev
```

The `dev` script starts Vite with HMR. Then load the unpacked extension:

1. Open `chrome://extensions`
2. Enable Developer mode
3. Click **Load unpacked**, pick `apps/extension/dist`
4. Open the options page (Details → Extension options) and configure a provider

## Regenerating icons

Icons live in `public/icons/` and are generated from `assets/icon.svg` at the repo root:

```bash
pnpm icons   # writes 16/32/48/128 PNGs to apps/extension/public/icons/
```

## Known TODOs before Chrome Web Store submission

- **Gmail DOM selectors** in `src/content/hosts/gmail.ts` are a best-effort starting point. Validate against live Gmail and update the `bodySelector` + `findAnchor` strategy when Gmail reshuffles its DOM.
- **Outlook Web DOM selectors** in `src/content/hosts/outlook.ts` likewise need live validation.
- **Store screenshots**: Chrome Web Store wants 1280x800 promo shots; Edge Add-ons wants 1366x768. Capture once the extension is verified against live Gmail/Outlook.

## Architecture

- `src/background.ts` — service worker. Owns all LLM calls. Content scripts message in with `{ type: 'summarize', text }`, SW looks up provider config from `chrome.storage.sync` and delegates to `@defluff/core.summarize()`.
- `src/content/index.ts` — host dispatcher. Picks the Gmail or Outlook strategy based on `window.location.hostname`.
- `src/content/hosts/*` — host-specific DOM strategies (where to find email body, where to inject the button).
- `src/content/ui/*` — Shadow-DOM-hosted button and summary panel. Styles live inside the shadow tree to avoid host-page CSS conflicts.
- `src/options/*` — React-based settings page for provider + API key.

The extension never calls a FinAegis-operated backend. All provider requests go direct from the service worker to the user's chosen LLM endpoint.
