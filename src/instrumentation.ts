// src/instrumentation.ts

/**
 * Bu dosya Next.js uygulamasının başlangıcında (server-side) bir kez çalışır.
 * Arka plan görevlerini (Cron Job) burada başlatıyoruz.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const cron = await import('node-cron');
    const { runV2Sync } = await import('@/lib/v2/syncFlow');
    const db = (await import('@/lib/v2/db')).default;

    console.log('--- V2 Arka Plan Otomasyonu Baslatiliyor (Her 5 Dakikada Bir) ---');

    // Her 5 dakikada bir çalışacak zamanlayıcı
    cron.schedule('*/5 * * * *', async () => {
      const istanbulTime = new Date().toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' });
      console.log(`[Cron] V2 Otomatik senkronizasyon baslatildi: ${istanbulTime}`);

      try {
        // Otomatik senkronizasyonu acik olan kaynaklari cek
        const activeSources = await db.xmlSource.findMany({
          where: { autoSync: true }
        });

        if (activeSources.length === 0) {
          console.log('[Cron] Otomatik senkronizasyonu acik kaynak bulunamadi.');
          return;
        }

        for (const source of activeSources) {
          console.log(`[Cron] Isleniyor: ${source.name} (${source.url})`);
          try {
            const results = await runV2Sync(source.id);
            console.log(`[Cron] Basarili: ${source.name} -> +${results.successCount} basarili, -${results.failedCount} hatali`);
          } catch (err: any) {
            console.error(`[Cron] Kaynak hatasi (${source.name}): ${err.message}`);
          }
        }
      } catch (err: any) {
        console.error(`[Cron] Global V2 Hatasi: ${err.message}`);
      }
    });

    console.log('--- V2 Arka Plan Otomasyonu Hazir ---');
  }
}
