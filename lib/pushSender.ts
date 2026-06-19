import webpush from 'web-push';

const publicKey = process.env.VAPID_PUBLIC_KEY || '';
const privateKey = process.env.VAPID_PRIVATE_KEY || '';
const subject = process.env.VAPID_SUBJECT || 'mailto:hail@local';

if (publicKey && privateKey) {
  webpush.setVapidDetails(subject, publicKey, privateKey);
}

export async function sendPushNotification(
  subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
  title: string,
  body: string,
  url: string = '/calendar'
) {
  try {
    await webpush.sendNotification(subscription, JSON.stringify({ title, body, url }));
    return true;
  } catch (err: any) {
    // 410 = subscription expired, 404 = not found — should be cleaned up
    if (err.statusCode === 410 || err.statusCode === 404) return false;
    throw err;
  }
}
