# @defluff/outlook-addin

Office Add-in for Outlook (desktop and web). Adds a **De-Fluff** ribbon button on the Message Read surface that opens a task pane with the bulleted summary.

## Development

```bash
pnpm install                                    # at the repo root
pnpm --filter @defluff/outlook-addin dev        # starts Vite on https://localhost:3000
```

`@vitejs/plugin-basic-ssl` generates a self-signed cert automatically. The first time you hit `https://localhost:3000` you'll need to trust the cert in your browser (and for desktop Outlook, the OS cert store).

### Sideloading into Outlook

1. Keep `pnpm dev` running.
2. In Outlook (web): **Get Add-ins → My add-ins → Add a custom add-in → Add from File** and pick `manifest.xml`.
3. Open a message. The **De-Fluff** button appears in the ribbon's Home tab.

For desktop Outlook on Windows, install the manifest via **File → Options → Trust Center → Trust Center Settings → Trusted Add-in Catalogs** (shared network path) or use the [Microsoft 365 admin center](https://admin.microsoft.com) for org-wide deployment.

## Regenerating icons

Icons live in `public/icons/` (Vite serves them at `https://localhost:3000/icons/*` in dev) and are generated from `assets/icon.svg` at the repo root:

```bash
pnpm icons   # writes 16/32/64/80/128 PNGs to apps/outlook-addin/public/icons/
```

## Known TODOs before AppSource / production

- **Stable hosting URL**: replace every `https://localhost:3000` in `manifest.xml` with the production URL.
- **Replace the Id GUID**: the current one is a dev-only placeholder. Generate a real GUID.
- **AppSource validation**: Microsoft validates manifests strictly. Run `npx office-addin-manifest validate manifest.xml` before submission.
- **CORS verification**: test direct calls from the task pane webview to each provider (Anthropic, OpenAI, Gemini). If any provider blocks the add-in origin, fall back to `packages/proxy` (Cloudflare Worker) rather than introducing a FinAegis-operated server.

## Architecture

- `manifest.xml` — Office Add-in manifest, targets the Message Read surface.
- `src/taskpane/` — the pane UI. Plain TS + HTML + CSS (no React — keeps the bundle minimal).
- `src/commands/` — function file. Currently unused (the ribbon button opens the task pane); reserved for future ExecuteFunction commands.
- `src/shared/storage.ts` — `Office.context.roamingSettings` wrapper for storing the user's provider config (per-user, synced across devices by Office).
- `src/shared/email.ts` — reads the current message body via `Office.context.mailbox.item.body.getAsync(Text)`.

The task pane calls `@defluff/core.summarize()` directly. No backend, no service-worker indirection — the webview hits the user's chosen LLM endpoint.
