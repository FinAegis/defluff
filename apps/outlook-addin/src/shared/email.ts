/**
 * Grab the current message's body as plain text via Office.js. Resolves with
 * the trimmed body; rejects on Office error.
 */
export function getCurrentEmailText(): Promise<string> {
  return new Promise((resolve, reject) => {
    const item = Office.context.mailbox.item;
    if (!item || !('body' in item) || !item.body) {
      reject(new Error('No message selected'));
      return;
    }
    item.body.getAsync(Office.CoercionType.Text, (result) => {
      if (result.status === Office.AsyncResultStatus.Succeeded) {
        resolve(String(result.value ?? '').trim());
      } else {
        reject(new Error(result.error?.message ?? 'Failed to read message body'));
      }
    });
  });
}
