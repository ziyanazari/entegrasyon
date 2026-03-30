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
      const istanbulTime = new Date().toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' });
      console.log(`[Cron] Background sync started at ${istanbulTime}`);

      try {
        if (!fs.existsSync(configPath)) return;

        const data = fs.readFileSync(configPath, 'utf8');
        const configData = JSON.parse(data);
        const { configs } = configData;

        if (!Array.isArray(configs)) return;

        const autoSyncConfigs = configs.filter((c: any) => c.autoSync === true);

        if (autoSyncConfigs.length === 0) {
          console.log('[Cron] No XML URLs marked for auto-sync.');
          return;
        }

        let updated = false;
        for (const config of autoSyncConfigs) {
          console.log(`[Cron] Auto-syncing: ${config.url}`);
          try {
            // New parameters from config
            const results = await runSync(
                config.url, 
                config.name, 
                undefined, 
                config.minPrice || 0, 
                config.profitMargin || 0
            );
            
            // Save stats back to config
            const idx = configData.configs.findIndex((c: any) => c.url === config.url);
            if (idx !== -1) {
                configData.configs[idx].lastSync = {
                    status: 'success',
                    date: new Date().toISOString(),
                    processed: results.processedTotal,
                    success: results.success,
                    failed: results.failed
                };
                updated = true;
            }
            
            console.log(`[Cron] Success: ${config.url} (${results.success}/${results.processedTotal})`);
          } catch (err: any) {
            console.error(`[Cron] Failed: ${config.url} - ${err.message}`);
          }
        }

        if (updated) {
            fs.writeFileSync(configPath, JSON.stringify(configData, null, 2), 'utf8');
        }
      } catch (err: any) {
        console.error(`[Cron] Global Error: ${err.message}`);
      }
    });
  }
}
