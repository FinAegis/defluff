import { startGmail } from './hosts/gmail.js';
import { startOutlook } from './hosts/outlook.js';

const host = window.location.hostname;

if (host === 'mail.google.com') {
  startGmail();
} else if (
  host === 'outlook.office.com' ||
  host === 'outlook.office365.com' ||
  host === 'outlook.live.com'
) {
  startOutlook();
}
