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

## Known TODOs before Chrome Web Store submission

- **Icons**: the manifest currently omits `icons`. Add 16/48/128 PNGs in `public/icons/` and reference from `manifest.config.ts`.
- **Gmail DOM selectors** in `src/content/hosts/gmail.ts` are a best-effort starting point. Validate against live Gmail and update `MESSAGE_SELECTOR` / `BODY_SELECTOR` as Gmail reshuffles its DOM (frequent).
- **Outlook Web DOM selectors** in `src/content/hosts/outlook.ts` likewise need live validation.
- **Optional host permissions** for OpenAI-compatible endpoints: the current manifest allows any `http`/`https` under `optional_host_permissions`. Consider prompting the user to grant the specific host instead of leaving it open-ended.

## Architecture

- `src/background.ts` — service worker. Owns all LLM calls. Content scripts message in with `{ type: 'summarize', text }`, SW looks up provider config from `chrome.storage.sync` and delegates to `@defluff/core.summarize()`.
- `src/content/index.ts` — host dispatcher. Picks the Gmail or Outlook strategy based on `window.location.hostname`.
- `src/content/hosts/*` — host-specific DOM strategies (where to find email body, where to inject the button).
- `src/content/ui/*` — Shadow-DOM-hosted button and summary panel. Styles live inside the shadow tree to avoid host-page CSS conflicts.
- `src/options/*` — React-based settings page for provider + API key.

The extension never calls a FinAegis-operated backend. All provider requests go direct from the service worker to the user's chosen LLM endpoint.
