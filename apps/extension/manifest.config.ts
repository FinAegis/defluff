import { defineManifest, type ManifestV3Export } from '@crxjs/vite-plugin';

// Host-scoped permissions only — never `<all_urls>`. The Chrome Web Store will
// reject an email-scoped extension that asks for access to every page, and
// users have no reason to grant it.
const EMAIL_HOSTS = [
  'https://mail.google.com/*',
  'https://outlook.office.com/*',
  'https://outlook.office365.com/*',
  'https://outlook.live.com/*',
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
// yet, so widen the inferred shape to accept it.
type Manifest = ManifestV3Export & { optional_host_permissions?: readonly string[] };

export default defineManifest({
  manifest_version: 3,
  name: 'Defluff',
  version: '0.0.1',
  description: 'Strip AI-generated padding from emails. Your keys, your models, no servers.',
  icons: ICONS,
  action: {
    default_title: 'Defluff',
    default_icon: ICONS,
  },
  options_ui: { page: 'src/options/index.html', open_in_tab: true },
  background: { service_worker: 'src/background.ts', type: 'module' },
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
