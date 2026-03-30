'use client';

import { useState, useEffect } from 'react';
import { signOut } from 'next-auth/react';
import { 
  Zap, Plus, RefreshCw, Clock,
  Database, Globe, 
  Info, Search, Link2, LogOut, CheckCircle2, AlertCircle, Play,
  Settings, ChevronDown, ChevronUp, Trash2
} from 'lucide-react';

const PRICE_FIELDS = [
  { value: 'bayi_fiyati',   label: 'Bayi Fiyatı',         desc: 'Tedarikçi maliyet fiyatı' },
  { value: 'son_kullanici', label: 'Son Kullanıcı Fiyatı', desc: 'Tavsiye edilen satış fiyatı' },
  { value: 'fiyat',         label: 'Fiyat (fiyat)',        desc: 'Genel fiyat alanı' },
  { value: 'satis_fiyati',  label: 'Satış Fiyatı',         desc: 'Direkt satış fiyatı' },
];

function getNestedValue(obj: any, path: string): any {
  if (!obj || !path) return undefined;
  const parts = path.split('.');
  let current = obj;
  for (const part of parts) {
    if (!current || current[part] === undefined) return undefined;
    current = current[part];
  }
  return current;
}

export default function V2Dashboard() {
  const [sources, setSources] = useState<any[]>([]);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [syncResults, setSyncResults] = useState<{ [id: string]: any }>({});
  const [syncErrors, setSyncErrors] = useState<{ [id: string]: string }>({});
  const [openSettings, setOpenSettings] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  // New Source State
  const [newUrl, setNewUrl] = useState('');
  const [newName, setNewName] = useState('');
  const [expandedConfig, setExpandedConfig] = useState<string | null>(null);
  
  // Analysis State
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any | null>(null);

  const loadSources = async () => {
      try {
          const res = await fetch('/api/v2/sources');
          const data = await res.json();
          if (data.sources) setSources(data.sources);
      } catch (e) { console.error(e); }
  };

  useEffect(() => { loadSources(); }, []);

  const handleAnalyzeAndAdd = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!newUrl || !newName) return;
      setAnalyzing(true);
      try {
          const res = await fetch('/api/v2/analyze-xml', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ url: newUrl })
          });
          const data = await res.json();
          if (data.error) { alert(data.error); return; }
          setAnalysisResult(data);
      } catch (err: any) {
          alert('Analiz başarısız: ' + err.message);
      } finally {
          setAnalyzing(false);
      }
  };

  const handleFinalizeSave = async () => {
      try {
          const res = await fetch('/api/v2/sources', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ url: newUrl, name: newName })
          });
          if (res.ok) {
              setExpandedConfig(null); setAnalysisResult(null);
              setNewUrl(''); setNewName('');
              loadSources();
          }
      } catch (e) { console.error(e); }
  };

  const handleSaveSettings = async (src: any) => {
      setSavingId(src.id);
      try {
          await fetch('/api/v2/sources', {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                  id: src.id,
                  priceField:     src.priceField,
                  minPrice:       src.minPrice,
                  profitMargin:   src.profitMargin,
                  fixedCargoFee:  src.fixedCargoFee,
                  minBayiFiyati:  src.minBayiFiyati,
                  autoSync:       src.autoSync,
              })
          });
          setOpenSettings(null);
          loadSources();
      } catch (e) { console.error(e); }
      finally { setSavingId(null); }
  };

  const handleDeleteSource = async (id: string) => {
      if (!confirm('Bu XML kaynağını silmek istediğinize emin misiniz?')) return;
      await fetch('/api/v2/sources', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id })
      });
      loadSources();
  };

  const updateLocal = (id: string, field: string, value: any) => {
      setSources(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s));
  };

  const handleSync = async (sourceId: string) => {
      setSyncingId(sourceId);
      setSyncErrors(prev => ({ ...prev, [sourceId]: '' }));
      setSyncResults(prev => ({ ...prev, [sourceId]: null }));
      try {
          const res = await fetch('/api/v2/sync', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ sourceId })
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'Hata');
          setSyncResults(prev => ({ ...prev, [sourceId]: data }));
          loadSources();
      } catch (err: any) {
          setSyncErrors(prev => ({ ...prev, [sourceId]: err.message }));
      } finally { setSyncingId(null); }
  };

  const handleSyncAll = async () => {
      for (const src of sources) await handleSync(src.id);
  };

  const getPriceFieldLabel = (val: string) =>
      PRICE_FIELDS.find(f => f.value === val)?.label || val;

  return (
    <div className="min-h-screen bg-[#070709] text-gray-200 font-sans selection:bg-indigo-500/30 overflow-x-hidden relative text-sm pb-20">
      <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[120px] -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-purple-600/10 rounded-full blur-[150px] translate-x-1/3 translate-y-1/3 pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6 py-12 relative z-10">
        {/* Header */}
        <header className="mb-12 flex items-center justify-between border-b border-white/5 pb-8">
            <div className="flex items-center gap-6">
                <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center border border-indigo-500/30 shadow-[0_0_30px_rgba(99,102,241,0.15)]">
                  <Database className="w-8 h-8 text-indigo-400" />
                </div>
                <div>
                  <div className="inline-flex items-center gap-2 mb-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 backdrop-blur-md">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      <span className="text-[10px] font-bold text-gray-300 tracking-widest uppercase">Sistem Aktif · V2</span>
                  </div>
                  <h1 className="text-4xl font-black tracking-tight text-white mb-1">NazarDev <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">E-entegrasyon</span></h1>
                  <p className="text-gray-400 text-sm max-w-xl">Dinamik Fiyat Seçimi · Kar Marjı · Barem Filtreleme</p>
                </div>
            </div>
            <button onClick={() => signOut()} className="flex items-center gap-3 px-5 py-3 rounded-xl bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/10 hover:border-white/20 transition-all font-medium group text-[13px]">
                <LogOut className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
                Çıkış Yap
            </button>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Sol: Kaynaklar */}
            <section className="lg:col-span-8 space-y-6">
                <div className="bg-white/[0.02] border border-white/10 rounded-[2rem] p-8 backdrop-blur-xl shadow-2xl">
                    <h2 className="text-xl font-bold text-white mb-8 flex items-center gap-3">
                        <Globe className="w-6 h-6 text-indigo-400" />
                        XML Kaynakları
                    </h2>
                    
                    <div className="space-y-4">
                        {sources.map((src: any) => (
                            <div key={src.id} className="bg-white/[0.02] border border-white/10 rounded-[1.5rem] overflow-hidden transition-all duration-300 hover:border-indigo-500/30">
                                {/* Kart Başlığı */}
                                <div className="p-6">
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex-1 min-w-0">
                                            <h3 className="text-base font-black text-white uppercase tracking-tight truncate">{src.name}</h3>
                                            <p className="text-[11px] font-mono text-gray-500 truncate mt-0.5 opacity-60">{src.url}</p>
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                            <button
                                                onClick={() => setOpenSettings(openSettings === src.id ? null : src.id)}
                                                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${openSettings === src.id ? 'bg-indigo-600 text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'}`}
                                            >
                                                <Settings className="w-3.5 h-3.5" />
                                                Ayarlar
                                                {openSettings === src.id ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                                            </button>
                                            <button onClick={() => handleDeleteSource(src.id)} className="p-2 bg-white/5 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Özet Bilgiler */}
                                    <div className="grid grid-cols-3 gap-3 mt-5">
                                        <div className="bg-black/30 rounded-xl p-3 border border-white/5">
                                            <p className="text-[9px] font-black tracking-widest text-gray-600 uppercase mb-1">Fiyat Alanı</p>
                                            <p className="text-xs font-black text-indigo-400">{getPriceFieldLabel(src.priceField || 'bayi_fiyati')}</p>
                                        </div>
                                        <div className="bg-black/30 rounded-xl p-3 border border-white/5">
                                            <p className="text-[9px] font-black tracking-widest text-gray-600 uppercase mb-1">Min. Barem</p>
                                            <p className="text-xs font-black text-white">{src.minPrice} <span className="text-gray-600">TL</span></p>
                                        </div>
                                        <div className="bg-emerald-500/5 rounded-xl p-3 border border-emerald-500/10">
                                            <p className="text-[9px] font-black tracking-widest text-emerald-700 uppercase mb-1">Kar Marjı</p>
                                            <p className="text-xs font-black text-emerald-400">%{src.profitMargin}</p>
                                        </div>
                                    </div>

                                    {/* Son Sync Logu */}
                                    {src.syncLogs?.[0] && (
                                        <div className="mt-4 pt-4 border-t border-white/5">
                                            <div className="flex items-center justify-between">
                                                <span className="text-[10px] text-gray-500 flex items-center gap-1.5 font-bold tracking-widest uppercase"><Clock className="w-3 h-3" />Son Sync</span>
                                                <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded ${src.syncLogs[0].status === 'SUCCESS' ? 'bg-emerald-500/10 text-emerald-400' : src.syncLogs[0].status === 'ERROR' ? 'bg-red-500/10 text-red-400' : 'bg-yellow-500/10 text-yellow-400'}`}>{src.syncLogs[0].status}</span>
                                            </div>
                                            <div className="flex justify-between mt-2 bg-black/30 rounded-lg p-2 px-3">
                                                <span className="text-[11px] font-black text-emerald-400">{src.syncLogs[0].successCount} BAŞARILI</span>
                                                <span className="text-gray-600">|</span>
                                                <span className="text-[11px] font-black text-red-400">{src.syncLogs[0].failedCount} HATALI</span>
                                            </div>
                                        </div>
                                    )}

                                    {/* Sync sonuç/hata */}
                                    {syncResults[src.id] && (
                                        <div className="mt-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 flex items-center gap-2">
                                            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                                            <span className="text-[11px] text-emerald-400 font-bold">{syncResults[src.id].successCount} başarılı · {syncResults[src.id].failedCount} hatalı</span>
                                        </div>
                                    )}
                                    {syncErrors[src.id] && (
                                        <div className="mt-3 bg-red-500/10 border border-red-500/20 rounded-xl p-3 flex items-center gap-2">
                                            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                                            <span className="text-[11px] text-red-400 font-bold truncate">{syncErrors[src.id]}</span>
                                        </div>
                                    )}

                                    <button
                                        onClick={() => {
                                            if (src.isSyncing) {
                                                if (confirm('Senkronizasyonu durdurmak istiyor musunuz? Mevcut paket bitince islem duracaktir.')) {
                                                    fetch('/api/v2/sources/stop', {
                                                        method: 'POST',
                                                        headers: { 'Content-Type': 'application/json' },
                                                        body: JSON.stringify({ sourceId: src.id })
                                                    }).then(loadSources);
                                                }
                                            } else {
                                                handleSync(src.id);
                                            }
                                        }}
                                        disabled={syncingId !== null && syncingId !== src.id}
                                        className={`mt-5 w-full rounded-xl py-3.5 text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-3 group/btn border disabled:opacity-40 
                                            ${src.isSyncing 
                                                ? 'bg-red-500/10 border-red-500 text-red-500 hover:bg-red-500 hover:text-white' 
                                                : 'bg-white/5 border-white/5 hover:bg-indigo-600 hover:border-indigo-500 text-white'}`}
                                    >
                                        {src.isSyncing
                                            ? <><AlertCircle className="w-4 h-4 animate-pulse" /> DURDURUR MUSUN?</>
                                            : syncingId === src.id
                                                ? <><RefreshCw className="w-4 h-4 animate-spin" /> Senkronize Ediliyor...</>
                                                : <><RefreshCw className="w-4 h-4 group-hover/btn:rotate-180 transition-transform duration-700" /> Senkronize Et</>
                                        }
                                    </button>
                                </div>

                                {/* Ayarlar Paneli */}
                                {openSettings === src.id && (
                                    <div className="border-t border-white/10 bg-black/40 p-6 space-y-5 animate-in slide-in-from-top-2 duration-300">
                                        <h4 className="text-sm font-black text-indigo-400 uppercase tracking-widest flex items-center gap-2">
                                            <Settings className="w-4 h-4" /> {src.name} Ayarları
                                        </h4>

                                        {/* Otomatik Senkronizasyon + Fiyat Alanı Seçimi */}
                                        <div className="flex items-center justify-between bg-indigo-500/10 border border-indigo-500/20 p-4 rounded-xl mb-4">
                                            <div>
                                                <p className="text-xs font-black text-indigo-400 uppercase tracking-widest flex items-center gap-2">
                                                    <Clock className="w-4 h-4" /> Otomatik Senkronizasyon (5dk)
                                                </p>
                                                <p className="text-[10px] text-gray-500 mt-1">Sistem her 5 dakikada bir stok ve fiyatları güncel tutar.</p>
                                            </div>
                                            <button 
                                                onClick={() => updateLocal(src.id, 'autoSync', !src.autoSync)}
                                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${src.autoSync ? 'bg-emerald-500' : 'bg-gray-700'}`}
                                            >
                                                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${src.autoSync ? 'translate-x-6' : 'translate-x-1'}`} />
                                            </button>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest">Hangi Fiyat Alanını Kullanalım?</label>
                                            <div className="grid grid-cols-2 gap-3">
                                                {PRICE_FIELDS.map(opt => (
                                                    <button
                                                        key={opt.value}
                                                        onClick={() => updateLocal(src.id, 'priceField', opt.value)}
                                                        className={`text-left p-4 rounded-xl border transition-all ${(src.priceField || 'bayi_fiyati') === opt.value ? 'bg-indigo-600/20 border-indigo-500 text-white' : 'bg-white/[0.02] border-white/10 text-gray-400 hover:border-white/30'}`}
                                                    >
                                                        <p className="text-xs font-black">{opt.label}</p>
                                                        <p className="text-[10px] text-gray-500 mt-0.5">{opt.desc}</p>
                                                        <code className="text-[10px] text-indigo-400/70 mt-1 block">{opt.value}</code>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Min Bayi Fiyatı + Min Fiyat + Kar Marjı */}
                                        <div className="space-y-2">
                                            <label className="block text-[10px] font-black text-red-500/80 uppercase tracking-widest">⚡ Min. Bayi Fiyatı (TL)</label>
                                            <input
                                                type="number"
                                                value={src.minBayiFiyati ?? 0}
                                                onChange={e => updateLocal(src.id, 'minBayiFiyati', e.target.value)}
                                                className="w-full bg-black/50 border border-red-500/30 rounded-xl px-4 py-3 text-red-400 font-bold text-sm outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500/40 transition-all"
                                            />
                                            <p className="text-[10px] text-red-500/60 font-medium">bayi_fiyati bu tutarın altında olanlar <span className="font-black text-red-400">HİÇBİR ZAMAN</span> eklenmez</p>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest">Min. Barem (TL)</label>
                                                <input
                                                    type="number"
                                                    value={src.minPrice}
                                                    onChange={e => updateLocal(src.id, 'minPrice', e.target.value)}
                                                    className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white font-bold text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/40 transition-all"
                                                />
                                                <p className="text-[10px] text-gray-600">Bu tutarın altı Ikas'a aktarılmaz</p>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest">Kar Marjı (%)</label>
                                                <input
                                                    type="number"
                                                    value={src.profitMargin}
                                                    onChange={e => updateLocal(src.id, 'profitMargin', e.target.value)}
                                                    className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-emerald-400 font-bold text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/40 transition-all"
                                                />
                                                <p className="text-[10px] text-gray-600">Fiyata otomatik eklenir</p>
                                            </div>
                                        </div>

                                        <button
                                            onClick={() => handleSaveSettings(src)}
                                            disabled={savingId === src.id}
                                            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl py-3.5 text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 disabled:opacity-60"
                                        >
                                            {savingId === src.id ? <><RefreshCw className="w-4 h-4 animate-spin" />Kaydediliyor...</> : 'AYARLARI KAYDET'}
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))}

                        {/* Yeni Kaynak */}
                        <button onClick={() => setExpandedConfig('new')} className="w-full bg-indigo-600/5 border border-indigo-500/20 border-dashed rounded-[1.5rem] p-8 flex items-center justify-center gap-4 text-indigo-400 hover:bg-indigo-600/10 transition-all group">
                            <div className="w-12 h-12 rounded-full border-2 border-indigo-500/30 flex items-center justify-center group-hover:scale-110 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-500">
                                <Plus className="w-6 h-6" />
                            </div>
                            <div className="text-left">
                                <span className="text-sm font-black uppercase tracking-[0.2em] text-gray-200 block">Yeni XML Kaynağı Ekle</span>
                                <span className="text-[10px] text-gray-600">XML şemanı analiz et ve fiyat alanını seç</span>
                            </div>
                        </button>
                    </div>
                </div>
            </section>
            
            {/* Sağ: Kontrol Paneli */}
            <section className="lg:col-span-4 flex flex-col gap-6">
               <div className="bg-white/[0.02] border border-white/10 rounded-[2rem] p-8 backdrop-blur-xl shadow-2xl">
                    <h2 className="text-lg font-black text-white mb-6 flex items-center gap-3 uppercase tracking-tighter">
                        <Zap className="w-5 h-5 text-purple-400" />
                        Global Kontrol
                    </h2>
                    <button
                        onClick={handleSyncAll}
                        disabled={syncingId !== null || sources.length === 0}
                        className="w-full bg-gradient-to-br from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-2xl py-5 text-sm font-black uppercase tracking-[0.2em] transition-all shadow-2xl shadow-indigo-600/30 flex items-center justify-center gap-4 group active:scale-[0.98] disabled:opacity-40"
                    >
                        <Play className="w-5 h-5 fill-current" />
                        TÜMÜNÜ SENKRONIZE ET
                    </button>
               </div>

               <div className="bg-white/[0.02] border border-white/10 rounded-[2rem] p-8 backdrop-blur-xl shadow-2xl flex-1">
                    <h2 className="text-lg font-black text-white mb-6 flex items-center gap-3 uppercase tracking-tighter">
                        <Info className="w-5 h-5 text-purple-400" />
                        Sistem Özeti
                    </h2>
                    <div className="space-y-3">
                        <div className="flex justify-between items-center bg-black/30 p-4 rounded-xl border border-white/5">
                            <span className="text-[11px] text-gray-500 uppercase font-black tracking-widest">Kaynak Sayısı</span>
                            <span className="text-2xl font-black text-white">{sources.length}</span>
                        </div>
                        <div className="flex justify-between items-center bg-emerald-500/5 p-4 rounded-xl border border-emerald-500/10">
                            <span className="text-[11px] text-emerald-500/80 uppercase font-black tracking-widest">Başarılı</span>
                            <span className="text-2xl font-black text-emerald-400">{sources.filter(s => s.syncLogs?.[0]?.status === 'SUCCESS').length}</span>
                        </div>
                        <div className="flex justify-between items-center bg-red-500/5 p-4 rounded-xl border border-red-500/10">
                            <span className="text-[11px] text-red-500/80 uppercase font-black tracking-widest">Hatalı</span>
                            <span className="text-2xl font-black text-red-400">{sources.filter(s => s.syncLogs?.[0]?.status === 'ERROR').length}</span>
                        </div>
                        <div className="mt-4 p-4 bg-indigo-500/5 border border-indigo-500/10 rounded-xl">
                            <p className="text-[10px] text-indigo-400/70 font-black uppercase tracking-widest mb-2">Fiyat Alanları</p>
                            {sources.map(s => (
                                <div key={s.id} className="flex justify-between items-center py-1.5 border-b border-white/5 last:border-0">
                                    <span className="text-[11px] text-gray-400 truncate max-w-[120px]">{s.name}</span>
                                    <span className="text-[10px] font-black text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded">{getPriceFieldLabel(s.priceField || 'bayi_fiyati')}</span>
                                </div>
                            ))}
                        </div>
                    </div>
               </div>
            </section>
        </div>
      </div>

      {/* Yeni Kaynak Modal */}
      {expandedConfig === 'new' && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/95 backdrop-blur-2xl animate-in fade-in duration-500">
              <div className="bg-[#0c0c0e] border border-white/10 w-full max-w-4xl rounded-[3rem] p-12 shadow-[0_0_100px_rgba(79,70,229,0.15)] relative overflow-hidden ring-1 ring-white/5 max-h-[90vh] overflow-y-auto custom-scrollbar">
                  <div className="flex items-center justify-between mb-12">
                      <h2 className="text-3xl font-black text-white flex items-center gap-5 uppercase tracking-tighter">
                          <div className="w-14 h-14 bg-indigo-600 rounded-[1.25rem] flex items-center justify-center shadow-2xl shadow-indigo-600/40">
                            <Zap className="w-7 h-7 text-white" />
                          </div>
                          Yeni XML Kaynağı
                      </h2>
                      <button onClick={() => {setExpandedConfig(null); setAnalysisResult(null);}} className="h-14 w-14 bg-white/5 rounded-[1.25rem] flex items-center justify-center text-gray-500 hover:bg-red-500/20 hover:text-red-400 transition-all">
                          <Plus className="w-8 h-8 rotate-45" />
                      </button>
                  </div>
                  
                  {!analysisResult ? (
                    <form onSubmit={handleAnalyzeAndAdd} className="space-y-8">
                        <div className="space-y-3">
                            <label className="block text-[11px] font-black text-gray-600 uppercase tracking-[0.3em] font-mono"><span className="text-indigo-500 mr-2">01.</span> FİRMA ADI</label>
                            <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Örn: Ebijuteri Toptan" className="w-full bg-black/50 border border-white/10 rounded-[1.5rem] px-8 py-6 text-lg text-white focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all placeholder:text-gray-800 font-bold" />
                        </div>
                        <div className="space-y-3">
                            <label className="block text-[11px] font-black text-gray-600 uppercase tracking-[0.3em] font-mono"><span className="text-indigo-500 mr-2">02.</span> XML URL</label>
                            <input value={newUrl} onChange={e => setNewUrl(e.target.value)} placeholder="https://tedarikci.com/urunler.xml" className="w-full bg-black/50 border border-white/10 rounded-[1.5rem] px-8 py-6 text-lg text-white focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all placeholder:text-gray-800 font-bold" />
                        </div>
                        <button type="submit" disabled={analyzing} className="w-full bg-indigo-600 text-white rounded-2xl py-6 text-sm font-black uppercase tracking-[0.2em] shadow-2xl shadow-indigo-600/40 hover:bg-indigo-500 active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-60">
                            {analyzing ? <><RefreshCw className="w-5 h-5 animate-spin" />Analiz Ediliyor...</> : <><Search className="w-5 h-5" />XML ŞEMASINI ANALİZ ET</>}
                        </button>
                    </form>
                  ) : (
                    <div className="space-y-10">
                        <div className="bg-emerald-500/10 border border-emerald-500/20 p-6 rounded-[1.5rem]">
                            <h4 className="text-lg font-black text-emerald-400 mb-1 flex items-center gap-2"><Globe className="w-5 h-5"/>XML Okundu — {analysisResult.totalFound} ürün bulundu</h4>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
                            {analysisResult.nodes.map((node: string, index: number) => (
                                <div key={index} className="flex flex-col gap-2">
                                    <div className="flex items-center justify-between px-1">
                                        <span className="text-sm font-black text-gray-300 font-mono">{node}</span>
                                        <span className="text-[10px] text-gray-600 italic px-2 py-0.5 bg-white/5 rounded-md truncate max-w-[120px]">
                                            {String(getNestedValue(analysisResult.sampleItem, node) ?? '').substring(0, 30)}
                                        </span>
                                    </div>
                                    <div className="relative flex items-center">
                                        <div className="absolute left-4 text-gray-500"><Link2 className="w-4 h-4" /></div>
                                        <select className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-12 py-4 text-sm font-medium text-white appearance-none outline-none focus:border-indigo-500 transition-all">
                                            <option value="">Otomatik</option>
                                            <option value="name">Ürün Adı</option>
                                            <option value="price">Satış Fiyatı</option>
                                            <option value="stock">Stok</option>
                                            <option value="description">Açıklama</option>
                                            <option value="brand">Marka</option>
                                            <option value="category">Kategori</option>
                                            <option value="ignore">Yoksay</option>
                                        </select>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <button onClick={handleFinalizeSave} className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-2xl py-6 text-sm font-black uppercase tracking-[0.3em] shadow-2xl hover:scale-[1.01] active:scale-[0.98] transition-all">
                            KAYDET VE EKLE
                        </button>
                    </div>
                  )}
              </div>
          </div>
      )}

      <style dangerouslySetInnerHTML={{__html: `
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        body { font-family: 'Inter', sans-serif; }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.05); border-radius: 10px; }
      `}} />
    </div>
  );
}
