export async function register() {
  // Scheduler disabled for now — enable when DB migration is stable
  // if (process.env.NEXT_RUNTIME === 'nodejs') {
  //   const { startNotificationScheduler } = await import('./lib/notificationScheduler');
  //   startNotificationScheduler();
  // }
}
