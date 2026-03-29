// src/instrumentation.ts
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const cron = await import('node-cron');
    const { runSync } = await import('@/lib/sync-service');
    const fs = await import('fs');
    const path = await import('path');

    const configPath = path.join(process.cwd(), 'sync_config.json');

    console.log('--- Background Cron Job Initializing (Every 5 Minutes) ---');

    // Run every 5 minutes
    cron.schedule('*/5 * * * *', async () => {
      console.log(`[Cron] Background sync started at ${new Date().toISOString()}`);

      try {
        if (!fs.existsSync(configPath)) return;

        const data = fs.readFileSync(configPath, 'utf8');
        const { configs } = JSON.parse(data);

        if (!Array.isArray(configs)) return;

        const autoSyncConfigs = configs.filter((c: any) => c.autoSync === true);

        if (autoSyncConfigs.length === 0) {
          console.log('[Cron] No XML URLs marked for auto-sync.');
          return;
        }

        for (const config of autoSyncConfigs) {
          console.log(`[Cron] Auto-syncing: ${config.url}`);
          try {
            // Auto-sync always syncs ALL products (no limit)
            await runSync(config.url);
            console.log(`[Cron] Success: ${config.url}`);
          } catch (err: any) {
            console.error(`[Cron] Failed: ${config.url} - ${err.message}`);
          }
        }
      } catch (err: any) {
        console.error(`[Cron] Global Error: ${err.message}`);
      }
    });
  }
}
