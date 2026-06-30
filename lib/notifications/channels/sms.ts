export async function sendSmsNotification(_params: {
  to: string;
  shieldName: string;
  shieldId: string;
}): Promise<void> {
  throw new Error('SMS notifications are not yet implemented');
}
