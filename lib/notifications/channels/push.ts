export async function sendPushNotification(_params: {
  ownerId: string;
  shieldName: string;
  shieldId: string;
}): Promise<void> {
  throw new Error('Push notifications are not yet implemented');
}
