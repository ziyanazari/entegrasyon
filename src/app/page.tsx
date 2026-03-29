// src/app/page.tsx
'use client';

import { useState, useEffect } from 'react';

export default function Dashboard() {
  const [xmlUrls, setXmlUrls] = useState<string[]>([]);
  const [newUrl, setNewUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentSyncIndex, setCurrentSyncIndex] = useState<number>(-1);
  const [syncResults, setSyncResults] = useState<{ [url: string]: any }>({});
  const [syncErrors, setSyncErrors] = useState<{ [url: string]: string }>({});
  const [limit, setLimit] = useState<number>(10);

  // Load from local storage
  useEffect(() => {
    const saved = localStorage.getItem('ikas_xml_urls');
    if (saved) {
      try {
        setXmlUrls(JSON.parse(saved));
      } catch (e) {}
    } else {
        // Default example
        setXmlUrls(['http://xml.ebijuteri.com/api/xml/69c7a7400dc8522e600426f4?format=old']);
    }
  }, []);

  // Save to local storage whenever urls change
  useEffect(() => {
    if (xmlUrls.length > 0) {
      localStorage.setItem('ikas_xml_urls', JSON.stringify(xmlUrls));
    }
  }, [xmlUrls]);

  const handleAddUrl = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUrl) return;
    if (!xmlUrls.includes(newUrl)) {
      setXmlUrls([...xmlUrls, newUrl]);
    }
    setNewUrl('');
  };

  const handleRemoveUrl = (urlToRemove: string) => {
    setXmlUrls(xmlUrls.filter(url => url !== urlToRemove));
  };

  const handleSyncAll = async () => {
    if (xmlUrls.length === 0) return;
    
    setLoading(true);
    setSyncResults({});
    setSyncErrors({});
    
    for (let i = 0; i < xmlUrls.length; i++) {
      const url = xmlUrls[i];
      setCurrentSyncIndex(i);
      
      try {
        const response = await fetch('/api/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ xmlUrl: url, limit: limit > 0 ? limit : undefined }), 
        });
        
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.error || 'Failed to sync');
        }
        
        setSyncResults(prev => ({ ...prev, [url]: data.results }));
      } catch (err: any) {
        setSyncErrors(prev => ({ ...prev, [url]: err.message }));
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
      
      {/* Background Ornaments */}
      <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-indigo-600/20 rounded-full blur-[120px] -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-purple-600/10 rounded-full blur-[150px] translate-x-1/3 translate-y-1/3 pointer-events-none" />

      <div className="max-w-6xl mx-auto px-6 py-12 relative z-10">
        
        <header className="mb-12 border-b border-white/5 pb-8 flex items-center justify-between">
          <div>
            <div className="inline-flex items-center gap-2 mb-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 backdrop-blur-md">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs font-semibold text-gray-300 tracking-wider uppercase">Sistem Aktif</span>
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-white mb-2">ikas <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">Entegrasyon</span></h1>
            <p className="text-gray-400 text-sm max-w-xl leading-relaxed">Çoklu XML kaynaklarınızı yönetin, stok ve fiyat değişikliklerini eşzamanlı olarak ikas mağazanıza aktarın.</p>
          </div>
          <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center border border-indigo-500/30 shadow-[0_0_30px_rgba(99,102,241,0.15)]">
            <svg className="w-7 h-7 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
        </header>

        <main className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Controls Segment */}
          <section className="lg:col-span-5 flex flex-col gap-6">
            
            <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-6 backdrop-blur-xl shadow-2xl transition-all duration-300 hover:bg-white/[0.03]">
              <h2 className="text-xl font-medium text-white mb-5 flex items-center gap-2">
                <svg className="w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                XML Kaynakları
              </h2>
              
              <form onSubmit={handleAddUrl} className="flex gap-2 mb-6">
                <input
                  type="url"
                  value={newUrl}
                  onChange={(e) => setNewUrl(e.target.value)}
                  placeholder="https://tedarikci.com/feed.xml"
                  className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all text-white placeholder-gray-600"
                />
                <button
                  type="submit"
                  disabled={!newUrl || loading}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl px-5 py-3 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-600/20"
                >
                  Ekle
                </button>
              </form>

              <div className="space-y-3 max-h-[250px] overflow-y-auto pr-2 custom-scrollbar">
                {xmlUrls.length === 0 ? (
                  <div className="text-center py-6 text-gray-500 text-sm border border-dashed border-white/10 rounded-xl">Haklı olarak XML eklemeden bir işlem yapamazsınız. Bir bağlantı girin.</div>
                ) : (
                  xmlUrls.map((url, idx) => (
                    <div key={idx} className="group relative flex items-center justify-between bg-black/40 border border-white/5 rounded-xl p-3 hover:border-white/10 transition-colors">
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div className={`w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-lg ${currentSyncIndex === idx ? 'bg-indigo-500/20 text-indigo-400' : 'bg-white/5 text-gray-500'}`}>
                          {currentSyncIndex === idx ? (
                            <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                          ) : (
                            <span className="text-xs font-bold">{idx + 1}</span>
                          )}
                        </div>
                        <p className="text-sm text-gray-300 truncate font-mono" title={url}>{url}</p>
                      </div>
                      <button
                        onClick={() => handleRemoveUrl(url)}
                        disabled={loading}
                        className="opacity-0 group-hover:opacity-100 p-2 text-gray-500 hover:text-red-400 transition-all rounded-lg hover:bg-red-400/10 focus:outline-none"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-6 backdrop-blur-xl shadow-2xl">
                <div className="flex items-center justify-between gap-4 mb-6">
                    <div className="w-full">
                        <label className="block text-sm font-medium text-gray-400 mb-2">İşlem Limiti (0 veya boş bırakarak test modunu kapatıp hepsini gönderebilirsiniz)</label>
                        <input 
                            type="number" 
                            value={limit === 0 ? '' : limit} 
                            onChange={(e) => setLimit(e.target.value === '' ? 0 : parseInt(e.target.value, 10) || 0)} 
                            placeholder="Örn: 10 (Sınır koymak istemiyorsanız boş bırakın)"
                            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 text-white placeholder-gray-600" 
                        />
                    </div>
                </div>

                <button
                    onClick={handleSyncAll}
                    disabled={loading || xmlUrls.length === 0}
                    className="w-full relative flex items-center justify-center bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl px-4 py-4 text-base font-semibold tracking-wide transition-all disabled:opacity-50 disabled:cursor-not-allowed group overflow-hidden shadow-[0_0_40px_rgba(99,102,241,0.3)] hover:shadow-[0_0_60px_rgba(99,102,241,0.5)]"
                >
                  <div className="absolute inset-0 w-full h-full bg-white/10 scale-x-0 group-hover:scale-x-100 origin-left transition-transform duration-500 ease-out" />
                  
                  {loading ? (
                    <div className="flex items-center space-x-3 relative z-10">
                      <div className="w-5 h-5 rounded-full border-2 border-white/20 border-t-white animate-spin" />
                      <span>Senkronize Ediliyor ({currentSyncIndex + 1} / {xmlUrls.length})</span>
                    </div>
                  ) : (
                    <span className="relative z-10 flex items-center gap-2">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                        Eşitlemeyi Başlat
                    </span>
                  )}
                </button>
            </div>

          </section>

          {/* Results Segment */}
          <section className="lg:col-span-7">
            <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-8 backdrop-blur-xl shadow-2xl h-full min-h-[500px] flex flex-col relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-[80px]" />
                
              <h2 className="text-xl font-medium text-white mb-8 flex items-center gap-2">
                <svg className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                Genel İstatistikler
              </h2>
              
              {!hasStarted && (
                <div className="flex-1 flex flex-col items-center justify-center text-gray-500 space-y-4">
                  <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-2">
                    <svg className="w-8 h-8 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                  </div>
                  <p className="text-base text-gray-400">Verileri içeri aktardığınızda sonuçlar burada görünecektir.</p>
                </div>
              )}
              
              {hasStarted && (
                <div className="space-y-8 animate-in fade-in duration-700">
                  <div className="grid grid-cols-3 gap-6">
                    <div className="bg-black/20 p-6 rounded-2xl border border-white/5 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-10"><svg className="w-12 h-12" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 2a8 8 0 100 16 8 8 0 000-16zm1 11H9v-2h2v2zm0-4H9V5h2v4z" clipRule="evenodd"></path></svg></div>
                      <p className="text-sm font-medium text-gray-400 mb-2">İşlenen Ürün</p>
                      <p className="text-4xl font-bold text-white">{getTotalProcessed()}</p>
                    </div>
                    <div className="bg-emerald-500/5 p-6 rounded-2xl border border-emerald-500/10 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 text-emerald-500 opacity-10"><svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg></div>
                      <p className="text-sm font-medium text-emerald-400 mb-2">Başarılı</p>
                      <p className="text-4xl font-bold text-emerald-400">{getTotalSuccess()}</p>
                    </div>
                    <div className="bg-red-500/5 p-6 rounded-2xl border border-red-500/10 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 text-red-500 opacity-10"><svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></div>
                      <p className="text-sm font-medium text-red-400 mb-2">Hatalı / Pas Geçilen</p>
                      <p className="text-4xl font-bold text-red-400">{getTotalFailed()}</p>
                    </div>
                  </div>

                  {/* Per URL Results */}
                  <div className="space-y-4">
                      {xmlUrls.map((url, idx) => {
                          const result = syncResults[url];
                          const error = syncErrors[url];
                          if (!result && !error && currentSyncIndex !== idx) return null;

                          return (
                              <div key={idx} className="bg-black/30 p-5 rounded-xl border border-white/5 relative">
                                  <div className="flex items-center justify-between mb-3">
                                      <p className="text-sm font-mono text-gray-400 truncate w-3/4">{url}</p>
                                      {currentSyncIndex === idx && <span className="text-xs bg-indigo-500/20 text-indigo-300 px-2 py-1 rounded-full animate-pulse">İşleniyor...</span>}
                                      {result && <span className="text-xs bg-emerald-500/20 text-emerald-300 px-2 py-1 rounded-full">Tamamlandı</span>}
                                      {error && <span className="text-xs bg-red-500/20 text-red-300 px-2 py-1 rounded-full">Hata</span>}
                                  </div>
                                  
                                  {error && <p className="text-sm text-red-400 mt-2 bg-red-500/10 p-2 rounded">{error}</p>}
                                  {result && (
                                      <div className="flex gap-4 text-sm mt-3 border-t border-white/5 pt-3">
                                          <span className="text-gray-300">İşlenen: <b className="text-white">{result.processedTotal}</b></span>
                                          <span className="text-emerald-400">Başarılı: <b className="text-emerald-300">{result.success}</b></span>
                                          <span className="text-red-400">Hatalı: <b className="text-red-300">{result.failed}</b></span>
                                      </div>
                                  )}

                                  {result?.errors?.length > 0 && (
                                    <div className="mt-4 pt-4 border-t border-white/5">
                                      <h3 className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wider">Hata Kayıtları</h3>
                                      <div className="max-h-40 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                                        {result.errors.map((err: any, errIdx: number) => (
                                          <div key={errIdx} className="bg-red-500/5 p-2 rounded flex flex-col gap-1 border border-red-500/10">
                                            <span className="text-xs font-mono text-red-300 font-medium">SKU: {err.sku}</span>
                                            <span className="text-xs text-red-400/80">{err.error}</span>
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

      {/* Global CSS for scrollbar */}
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(255,255,255,0.02); }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }
      `}} />
    </div>
  );
}
