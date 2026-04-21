import { MSG_TRIGGER_ACTIVE, type AppRequest } from '../shared/messages.js';
import { getHostsConfig } from '../shared/storage.js';
import { startGmail } from './hosts/gmail.js';
import { startLinkedIn } from './hosts/linkedin.js';
import { startOutlook } from './hosts/outlook.js';
import { triggerClosestButton } from './ui/wireHost.js';

void (async () => {
  const hosts = await getHostsConfig();
  const host = window.location.hostname;

  if (host === 'mail.google.com') {
    if (hosts.gmail) startGmail();
  } else if (
    host === 'outlook.office.com' ||
    host === 'outlook.office365.com' ||
    host === 'outlook.live.com' ||
    host === 'outlook.cloud.microsoft'
  ) {
    if (hosts.outlook) startOutlook();
  } else if (host === 'www.linkedin.com') {
    if (hosts.linkedin) startLinkedIn();
  }
})();

// Keyboard shortcut handler: background SW forwards the command; we find the
// button closest to the viewport center and trigger it.
chrome.runtime.onMessage.addListener((message: unknown) => {
  if (!isAppRequest(message)) return;
  if (message.type === MSG_TRIGGER_ACTIVE) {
    triggerClosestButton();
  }
});

function isAppRequest(value: unknown): value is AppRequest {
  return !!value && typeof value === 'object' && 'type' in value;
}
