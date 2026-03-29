// src/app/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { signOut } from 'next-auth/react';
import { LogOut, Zap, Trash2, Plus, RefreshCw, Clock, CheckCircle2, AlertCircle, Play, Database, Globe, Layers, BarChart3 } from 'lucide-react';

interface XmlConfig {
  url: string;
  autoSync: boolean;
}

export default function Dashboard() {
  const [configs, setConfigs] = useState<XmlConfig[]>([]);
  const [newUrl, setNewUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentSyncIndex, setCurrentSyncIndex] = useState<number>(-1);
  const [syncResults, setSyncResults] = useState<{ [url: string]: any }>({});
  const [syncErrors, setSyncErrors] = useState<{ [url: string]: string }>({});
  const [limit, setLimit] = useState<number>(0); // Default to 0 (All) for background sync expectation

  // Load configuration from server
  useEffect(() => {
    fetch('/api/config')
      .then(res => res.json())
      .then(data => {
        if (data.configs) {
          setConfigs(data.configs);
        }
      })
      .catch(err => console.error('Config yükleme hatası:', err));
  }, []);

  // Save configuration to server
  const saveConfigs = async (newConfigs: XmlConfig[]) => {
    try {
      await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ configs: newConfigs }),
      });
    } catch (err) {
      console.error('Config kaydetme hatası:', err);
    }
  };

  const handleAddUrl = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUrl) return;
    if (!configs.some(c => c.url === newUrl)) {
      const updated = [...configs, { url: newUrl, autoSync: false }];
      setConfigs(updated);
      saveConfigs(updated);
    }
    setNewUrl('');
  };

  const handleRemoveUrl = (urlToRemove: string) => {
    const updated = configs.filter(c => c.url !== urlToRemove);
    setConfigs(updated);
    saveConfigs(updated);
  };

  const toggleAutoSync = (url: string) => {
    const updated = configs.map(c => 
      c.url === url ? { ...c, autoSync: !c.autoSync } : c
    );
    setConfigs(updated);
    saveConfigs(updated);
  };

  const handleSyncAll = async () => {
    if (configs.length === 0) return;
    
    setLoading(true);
    setSyncResults({});
    setSyncErrors({});
    
    for (let i = 0; i < configs.length; i++) {
        const config = configs[i];
        setCurrentSyncIndex(i);
        
        try {
            const response = await fetch('/api/sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    xmlUrl: config.url, 
                    limit: limit > 0 ? limit : undefined 
                }), 
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || 'Failed to sync');
            }
            
            setSyncResults(prev => ({ ...prev, [config.url]: data.results }));
        } catch (err: any) {
            setSyncErrors(prev => ({ ...prev, [config.url]: err.message }));
        }
    }
    
    setCurrentSyncIndex(-1);
    setLoading(false);
  };

  // Helper formats
  const getTotalProcessed = () => Object.values(syncResults).reduce((acc, curr) => acc + (curr.processedTotal || 0), 0);
  const getTotalSuccess = () => Object.values(syncResults).reduce((acc, curr) => acc + (curr.success || 0), 0);
  const getTotalFailed = () => Object.values(syncResults).reduce((acc, curr) => acc + (curr.failed || 0), 0);
  const hasStarted = Object.keys(syncResults).length > 0 || Object.keys(syncErrors).length > 0 || loading;

  return (
    <div className="min-h-screen bg-[#070709] text-gray-200 font-sans selection:bg-indigo-500/30 overflow-hidden relative">
      <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[120px] -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-purple-600/10 rounded-full blur-[150px] translate-x-1/3 translate-y-1/3 pointer-events-none" />

      <div className="max-w-6xl mx-auto px-6 py-12 relative z-10">
        <header className="mb-12 border-b border-white/5 pb-8 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center border border-indigo-500/30 shadow-[0_0_30px_rgba(99,102,241,0.15)] group transition-all hover:scale-105 active:scale-95 cursor-default">
              <Zap className="w-8 h-8 text-indigo-400 group-hover:text-indigo-300 transition-colors" />
            </div>
            <div>
              <div className="inline-flex items-center gap-2 mb-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 backdrop-blur-md">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-xs font-semibold text-gray-300 tracking-wider uppercase">Sistem Aktif</span>
              </div>
              <h1 className="text-4xl font-bold tracking-tight text-white mb-1">NazarDev <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">E-entegrasyon</span></h1>
              <p className="text-gray-400 text-sm max-w-xl leading-relaxed">Çoklu XML kaynaklarınızı yönetin, her 5 dakikada bir otomatik stok ve fiyat güncellemelerini takip edin.</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <button onClick={() => signOut()} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/10 hover:border-white/20 transition-all text-sm font-medium group">
              <LogOut className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
              Çıkış Yap
            </button>
          </div>
        </header>

        <main className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <section className="lg:col-span-5 flex flex-col gap-6">
            <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-6 backdrop-blur-xl shadow-2xl transition-all duration-300 hover:bg-white/[0.03]">
              <h2 className="text-xl font-medium text-white mb-5 flex items-center gap-2">
                <Database className="w-5 h-5 text-indigo-400" />
                XML Kaynakları & Otomasyon
              </h2>
              
              <form onSubmit={handleAddUrl} className="flex gap-2 mb-6">
                <input
                  type="url"
                  value={newUrl}
                  onChange={(e) => setNewUrl(e.target.value)}
                  placeholder="https://tedarikci.com/feed.xml"
                  className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all text-white placeholder-gray-600"
                />
                <button type="submit" disabled={!newUrl || loading} className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl px-5 py-3 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-600/20">
                  <Plus className="w-4 h-4" />
                </button>
              </form>

              <div className="space-y-3 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
                {configs.length === 0 ? (
                  <div className="text-center py-10 text-gray-500 text-sm border border-dashed border-white/10 rounded-xl italic">Henüz bir XML kaynağı eklenmedi.</div>
                ) : (
                  configs.map((config, idx) => (
                    <div key={idx} className="group relative bg-black/40 border border-white/5 rounded-2xl p-4 hover:border-white/10 transition-all hover:bg-black/50">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3 overflow-hidden">
                          <div className={`w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-lg ${currentSyncIndex === idx ? 'bg-indigo-500/20 text-indigo-400' : 'bg-white/5 text-gray-500'}`}>
                            {currentSyncIndex === idx ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Globe className="w-4 h-4" />}
                          </div>
                          <p className="text-sm text-gray-300 truncate font-mono text-xs" title={config.url}>{config.url}</p>
                        </div>
                        <button onClick={() => handleRemoveUrl(config.url)} disabled={loading} className="text-gray-600 hover:text-red-400 transition-colors p-1"><Trash2 className="w-4 h-4" /></button>
                      </div>

                      <div className="flex items-center justify-between pt-3 border-t border-white/5">
                        <div className="flex items-center gap-2">
                           <div className={`w-2 h-2 rounded-full ${config.autoSync ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]' : 'bg-gray-600'}`} />
                           <span className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">{config.autoSync ? 'Otomatik Aktif' : 'Otomatik Kapalı'}</span>
                        </div>
                        
                        <button 
                          onClick={() => toggleAutoSync(config.url)}
                          className={`relative inline-flex h-5 w-10 items-center rounded-full transition-colors focus:outline-none ${config.autoSync ? 'bg-indigo-600' : 'bg-white/10'}`}
                        >
                          <span className={`${config.autoSync ? 'translate-x-5' : 'translate-x-1'} inline-block h-3 w-3 transform rounded-full bg-white transition-transform`} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-6 backdrop-blur-xl shadow-2xl">
                <div className="mb-6">
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">İşlem Limiti (0 = Sınırsız)</label>
                    <div className="relative">
                        <input 
                            type="number" 
                            value={limit === 0 ? '' : limit} 
                            onChange={(e) => setLimit(e.target.value === '' ? 0 : parseInt(e.target.value, 10) || 0)} 
                            placeholder="Tümü"
                            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 text-white placeholder-gray-600" 
                        />
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] text-gray-500 font-mono">ADET</div>
                    </div>
                </div>

                <button
                    onClick={handleSyncAll}
                    disabled={loading || configs.length === 0}
                    className="w-full relative flex items-center justify-center bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl px-4 py-4 text-base font-bold tracking-wide transition-all disabled:opacity-50 disabled:cursor-not-allowed group overflow-hidden shadow-[0_0_40px_rgba(99,102,241,0.2)]"
                >
                  <div className="absolute inset-0 w-full h-full bg-white/10 scale-x-0 group-hover:scale-x-100 origin-left transition-transform duration-500 ease-out" />
                  {loading ? (
                    <div className="flex items-center space-x-3 relative z-10">
                      <RefreshCw className="w-5 h-5 animate-spin" />
                      <span>{currentSyncIndex + 1} / {configs.length} Senkronize Ediliyor</span>
                    </div>
                  ) : (
                    <span className="relative z-10 flex items-center gap-2">
                        <Play className="w-4 h-4 fill-current" />
                        Manuel Eşitlemeyi Başlat
                    </span>
                  )}
                </button>
            </div>
          </section>

          <section className="lg:col-span-7">
            <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-8 backdrop-blur-xl shadow-2xl h-full min-h-[500px] flex flex-col relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-[80px]" />
              
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-xl font-medium text-white flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-purple-400" />
                  Senkronizasyon Durumu
                </h2>
                {hasStarted && (
                  <div className="flex items-center gap-1.5 text-xs text-gray-500 bg-white/5 px-3 py-1.5 rounded-full">
                    <Clock className="w-3 h-3" />
                    Son Sonuçlar
                  </div>
                )}
              </div>
              
              {!hasStarted && (
                <div className="flex-1 flex flex-col items-center justify-center text-gray-500 space-y-6">
                  <div className="w-24 h-24 bg-white/[0.03] rounded-3xl flex items-center justify-center rotation-slow">
                    <Layers className="w-10 h-10 opacity-20" />
                  </div>
                  <div className="text-center space-y-2">
                    <p className="text-base text-gray-300 font-medium">Veri Bekleniyor</p>
                    <p className="text-xs text-gray-500 max-w-xs mx-auto leading-relaxed">Otomatik veya manuel senkronizasyon başladığında işlem detayları burada anlık olarak akacaktır.</p>
                  </div>
                </div>
              )}
              
              {hasStarted && (
                <div className="space-y-8 animate-in fade-in duration-700">
                  <div className="grid grid-cols-3 gap-6">
                    <div className="bg-black/20 p-6 rounded-2xl border border-white/5 relative group">
                      <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity"><Layers className="w-12 h-12" /></div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2">İşlenen</p>
                      <p className="text-4xl font-bold text-white tracking-tight">{getTotalProcessed()}</p>
                    </div>
                    <div className="bg-emerald-500/5 p-6 rounded-2xl border border-emerald-500/10 relative group">
                      <div className="absolute top-0 right-0 p-4 text-emerald-500 opacity-5 group-hover:opacity-10 transition-opacity"><CheckCircle2 className="w-12 h-12" /></div>
                      <p className="text-xs font-semibold text-emerald-500/80 uppercase tracking-widest mb-2">Başarılı</p>
                      <p className="text-4xl font-bold text-emerald-400 tracking-tight">{getTotalSuccess()}</p>
                    </div>
                    <div className="bg-red-500/5 p-6 rounded-2xl border border-red-500/10 relative group">
                      <div className="absolute top-0 right-0 p-4 text-red-500 opacity-5 group-hover:opacity-10 transition-opacity"><AlertCircle className="w-12 h-12" /></div>
                      <p className="text-xs font-semibold text-red-500/80 uppercase tracking-widest mb-2">Hatalı</p>
                      <p className="text-4xl font-bold text-red-400 tracking-tight">{getTotalFailed()}</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                      {configs.map((config, idx) => {
                          const result = syncResults[config.url];
                          const error = syncErrors[config.url];
                          if (!result && !error && currentSyncIndex !== idx) return null;

                          return (
                              <div key={idx} className="bg-black/30 p-5 rounded-2xl border border-white/5 relative overflow-hidden group">
                                  <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500/30 opacity-0 group-hover:opacity-100 transition-opacity" />
                                  <div className="flex items-center justify-between mb-4">
                                      <p className="text-xs font-mono text-gray-500 truncate w-2/3">{config.url}</p>
                                      <div className="flex items-center gap-2">
                                          {currentSyncIndex === idx && <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full animate-pulse border border-indigo-500/20">AKTİF</span>}
                                          {result && <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/20">BİTTİ</span>}
                                          {error && <span className="text-[10px] bg-red-500/20 text-red-300 px-2 py-0.5 rounded-full border border-red-500/20">HATA</span>}
                                      </div>
                                  </div>
                                  
                                  {error && <p className="text-xs text-red-400/80 bg-red-500/5 p-3 rounded-xl border border-red-500/10 leading-relaxed">{error}</p>}
                                  {result && (
                                      <div className="grid grid-cols-3 gap-2 text-[11px] pt-4 border-t border-white/5">
                                          <div className="text-gray-400">Toplam: <span className="text-white font-bold ml-1">{result.processedTotal}</span></div>
                                          <div className="text-emerald-500/80">Tamam: <span className="text-emerald-400 font-bold ml-1">{result.success}</span></div>
                                          <div className="text-red-500/80">Hata: <span className="text-red-400 font-bold ml-1">{result.failed}</span></div>
                                      </div>
                                  )}

                                  {result?.errors?.length > 0 && (
                                    <div className="mt-4 pt-4 border-t border-white/5">
                                      <div className="max-h-40 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                                        {result.errors.map((err: any, errIdx: number) => (
                                          <div key={errIdx} className="bg-red-500/5 p-2 rounded-lg flex flex-col gap-0.5 border border-red-500/5">
                                            <span className="text-[10px] font-mono text-red-300/70">SKU: {err.sku}</span>
                                            <span className="text-[10px] text-red-400/60 truncate">{err.error}</span>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                              </div>
                          );
                      })}
                  </div>
                </div>
              )}
            </div>
          </section>
        </main>
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(255,255,255,0.01); }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.05); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.1); }
        @keyframes rotation { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .rotation-slow { animation: rotation 20s infinite linear; }
      `}} />
    </div>
  );
}
