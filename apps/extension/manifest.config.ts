import { defineManifest, type ManifestV3Export } from '@crxjs/vite-plugin';

// Host-scoped permissions only — never `<all_urls>`. The Chrome Web Store will
// reject an email-scoped extension that asks for access to every page, and
// users have no reason to grant it.
const EMAIL_HOSTS = [
  'https://mail.google.com/*',
  'https://outlook.office.com/*',
  'https://outlook.office365.com/*',
  'https://outlook.live.com/*',
  // Microsoft is migrating Outlook on the web to the .cloud.microsoft TLD.
  // Tenants are being rolled over to this origin without a redirect from
  // outlook.office.com, so it needs its own host match.
  'https://outlook.cloud.microsoft/*',
] as const;

// LinkedIn messaging lives here. Granted on demand via the options page's
// "LinkedIn" toggle, not at install — so normal users don't see the LinkedIn
// permission warning unless they actually want the feature.
const OPTIONAL_HOSTS = [
  'https://www.linkedin.com/*',
] as const;

// The service worker fetches LLM provider APIs. These hosts must be in
// host_permissions so MV3 lets the background script bypass CORS on them.
// Ollama / custom OpenAI-compatible endpoints will require additional host
// permissions — either added here for known hosts, or requested via
// chrome.permissions.request() from the options page (TODO).
const PROVIDER_HOSTS = [
  'https://api.anthropic.com/*',
  'https://api.openai.com/*',
  'https://generativelanguage.googleapis.com/*',
] as const;

const ICONS = {
  '16': 'icons/icon-16.png',
  '32': 'icons/icon-32.png',
  '48': 'icons/icon-48.png',
  '128': 'icons/icon-128.png',
} as const;

// @crxjs/vite-plugin 2.0 beta types don't include optional_host_permissions
// or browser_specific_settings yet, so widen the inferred shape.
type Manifest = ManifestV3Export & {
  optional_host_permissions?: readonly string[];
  browser_specific_settings?: {
    gecko?: { id: string; strict_min_version?: string };
  };
  // Firefox AMO (2025+ submissions) requires an explicit declaration of
  // which user-data categories the extension handles. Reviewed at upload
  // time; missing field rejects the submission.
  browser_specific_settings_gecko_only?: never;
  data_collection_permissions?: {
    required?: readonly string[];
    optional?: readonly string[];
  };
};

export default defineManifest({
  manifest_version: 3,
  name: 'Defluff',
  version: '0.1.2',
  description: 'Strip AI-generated padding from emails. Your keys, your models, no servers.',
  // Firefox/AMO requires a stable per-extension id declared in the manifest
  // (Chrome derives its id from the crx signature). Using an email-shaped id
  // is the convention. strict_min_version = 109 is the first release with
  // stable MV3 support.
  browser_specific_settings: {
    gecko: {
      id: 'defluff@finaegis.com',
      strict_min_version: '109.0',
    },
  },
  icons: ICONS,
  // Firefox/AMO transparency requirement (2025+). We declare the category
  // the extension routes to third parties so users see it in the install
  // dialog. `personalCommunications` = the email body the user asks us to
  // summarize; it's sent directly from their browser to the LLM provider
  // they configured (Anthropic / OpenAI / Gemini / self-hosted Ollama).
  // Zero retention beyond that is a function of architecture, not of this
  // declaration — we never see the data on any server we operate.
  // The user's API key is stored locally in chrome.storage.sync and passed
  // through to their chosen provider as auth; not declared here because
  // the user supplies it rather than us collecting it.
  // Chrome ignores this top-level field; Firefox reads it.
  data_collection_permissions: {
    required: ['personalCommunications'],
  },
  action: {
    default_title: 'Defluff',
    default_icon: ICONS,
    // Clicking the toolbar icon opens the paste-and-Defluff popup. The popup
    // links to the options page for provider/host settings.
    default_popup: 'src/popup/index.html',
  },
  options_ui: { page: 'src/options/index.html', open_in_tab: true },
  // Firefox needs `background.scripts` as a fallback for `service_worker`,
  // but @crxjs/vite-plugin strips any `scripts` key we declare here (it only
  // emits Chrome's `service_worker`). The Firefox-compatible fallback is
  // injected into dist/manifest.json at package time —
  // see scripts/package-extension.mjs.
  background: { service_worker: 'src/background.ts', type: 'module' },
  commands: {
    defluff_active: {
      suggested_key: {
        default: 'Ctrl+Shift+D',
        mac: 'Command+Shift+D',
      },
      description: 'De-Fluff the email currently in view',
    },
  },
  permissions: ['storage'],
  host_permissions: [...EMAIL_HOSTS, ...PROVIDER_HOSTS],
  optional_host_permissions: [...OPTIONAL_HOSTS],
  content_scripts: [
    {
      matches: [...EMAIL_HOSTS, ...OPTIONAL_HOSTS],
      js: ['src/content/index.ts'],
      run_at: 'document_idle',
    },
  ],
} as Manifest);
