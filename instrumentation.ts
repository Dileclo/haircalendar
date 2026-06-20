export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { warmup } = await import('./lib/warmup');
    await warmup();
    const { startNotificationScheduler } = await import('./lib/notificationScheduler');
    startNotificationScheduler();
    console.log('[Instrumentation] Scheduler started');
  }
}
