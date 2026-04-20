import { getHostsConfig } from '../shared/storage.js';
import { startGmail } from './hosts/gmail.js';
import { startLinkedIn } from './hosts/linkedin.js';
import { startOutlook } from './hosts/outlook.js';

void (async () => {
  const hosts = await getHostsConfig();
  const host = window.location.hostname;

  if (host === 'mail.google.com') {
    if (hosts.gmail) startGmail();
  } else if (
    host === 'outlook.office.com' ||
    host === 'outlook.office365.com' ||
    host === 'outlook.live.com'
  ) {
    if (hosts.outlook) startOutlook();
  } else if (host === 'www.linkedin.com') {
    if (hosts.linkedin) startLinkedIn();
  }
})();
