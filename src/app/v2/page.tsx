'use client';

import { useState, useEffect } from 'react';
import { 
  Zap, Plus, RefreshCw, Clock,
  Play, Database, Globe, 
  Settings, Info, Trash2, Search, Link2, EyeOff
} from 'lucide-react';

export default function V2Dashboard() {
  const [sources, setSources] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  
  // New Source State
  const [newUrl, setNewUrl] = useState('');
  const [newName, setNewName] = useState('');
  const [expandedConfig, setExpandedConfig] = useState<string | null>(null);
  
  // Analysis State
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any | null>(null);

  // Load Prisma Sources
  const loadSources = async () => {
      try {
          const res = await fetch('/api/v2/sources');
          const data = await res.json();
          if (data.sources) setSources(data.sources);
      } catch (e) {
          console.error(e);
      }
  };

  useEffect(() => { loadSources(); }, []);

  const handleAnalyzeAndAdd = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!newUrl || !newName) return;
      
      setAnalyzing(true);
      try {
          // 1. URL'yi Analiz Et (Dynamic Node extraction)
          const res = await fetch('/api/v2/analyze-xml', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ url: newUrl })
          });
          const data = await res.json();
          
          if (data.error) {
              alert(data.error);
              setAnalyzing(false);
              return;
          }
          
          setAnalysisResult(data);
          
      } catch (err: any) {
          alert('Analiz başarısız: ' + err.message);
          setAnalyzing(false);
      }
  };

  const handleFinalizeSave = async () => {
      // 2. Kaynağı veritabanına kaydet
      try {
          const res = await fetch('/api/v2/sources', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ url: newUrl, name: newName })
          });
          if (res.ok) {
              // Mappings can be sent here too in advanced implementation
              setExpandedConfig(null);
              setAnalysisResult(null);
              setNewUrl('');
              setNewName('');
              loadSources();
          }
      } catch (e) {
          console.error(e);
      }
  };

  return (
    <div className="min-h-screen bg-[#070709] text-gray-200 font-sans selection:bg-indigo-500/30 overflow-x-hidden relative text-sm pb-20">
      {/* Background Gradients */}
      <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[120px] -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-purple-600/10 rounded-full blur-[150px] translate-x-1/3 translate-y-1/3 pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6 py-12 relative z-10">
        <header className="mb-12 flex items-center gap-6 border-b border-white/5 pb-8">
            <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center border border-indigo-500/30 shadow-[0_0_30px_rgba(99,102,241,0.15)]">
              <Database className="w-8 h-8 text-indigo-400" />
            </div>
            <div>
              <div className="inline-flex items-center gap-2 mb-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 backdrop-blur-md">
                  <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
                  <span className="text-[10px] font-bold text-gray-300 tracking-widest uppercase">V2 PRISMA ORM</span>
              </div>
              <h1 className="text-4xl font-black tracking-tight text-white mb-1">Gelişmiş <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">Veritabanı Entegrasyonu</span></h1>
              <p className="text-gray-400 text-sm max-w-xl">Dinamik Eşleştirme (Dynamic Node Mapping) ve Kategorili Aktarım Paneli.</p>
            </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <section className="lg:col-span-8 space-y-6">
                <div className="bg-white/[0.02] border border-white/10 rounded-[2rem] p-8 backdrop-blur-xl transition-all duration-300 hover:bg-white/[0.03] shadow-2xl">
                    <h2 className="text-xl font-bold text-white mb-8 flex items-center gap-3">
                        <Globe className="w-6 h-6 text-indigo-400" />
                        Tanımlı XML Şemaları
                    </h2>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {sources.map((src: any) => (
                            <div key={src.id} className="relative flex flex-col bg-white/[0.02] border border-white/10 rounded-[1.5rem] overflow-hidden group hover:border-indigo-500/50 hover:bg-white/[0.04] transition-all duration-300">
                                <div className="p-6">
                                    <h3 className="text-lg font-black text-white group-hover:text-indigo-400 transition-colors uppercase tracking-tight">{src.name}</h3>
                                    <p className="text-[11px] font-mono text-gray-500 truncate mb-5 opacity-60 tooltip" title={src.url}>{src.url}</p>
                                    
                                    <div className="grid grid-cols-2 gap-4 mb-5">
                                        <div className="bg-black/30 rounded-xl p-4 border border-white/5">
                                            <p className="text-[10px] font-black tracking-[0.2em] text-gray-600 uppercase mb-2">Barem Fiyatı</p>
                                            <p className="text-xl font-black text-white">{src.minPrice} <span className="text-xs text-gray-500">TL</span></p>
                                        </div>
                                        <div className="bg-emerald-500/5 rounded-xl p-4 border border-emerald-500/10">
                                            <p className="text-[10px] font-black tracking-[0.2em] text-emerald-600/80 uppercase mb-2">Kar Marjı</p>
                                            <p className="text-xl font-black text-emerald-400">%{src.profitMargin}</p>
                                        </div>
                                    </div>

                                    {src.syncLogs && src.syncLogs[0] && (
                                        <div className="pt-4 border-t border-white/5 mt-auto">
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-[10px] text-gray-500 flex items-center gap-1.5 uppercase font-bold tracking-widest"><Clock className="w-3.5 h-3.5" /> Son Geçmiş</span>
                                                <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-md ${src.syncLogs[0].status === 'SUCCESS' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>{src.syncLogs[0].status}</span>
                                            </div>
                                            <div className="flex justify-between items-center bg-black/40 rounded-lg p-2.5 px-3">
                                                <span className="text-[11px] font-black text-emerald-400">{src.syncLogs[0].successCount} BAŞARILI</span>
                                                <span className="text-gray-600 font-bold px-2">|</span>
                                                <span className="text-[11px] font-black text-red-400">{src.syncLogs[0].failedCount} HATALI</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}

                        {/* Yeni Ekleme Kutusu */}
                        <button onClick={() => setExpandedConfig('new')} className="bg-indigo-600/5 border border-indigo-500/20 border-dashed rounded-[1.5rem] p-8 flex flex-col items-center justify-center gap-4 text-indigo-400 hover:bg-indigo-600/10 transition-all group min-h-[250px]">
                            <div className="w-16 h-16 rounded-full border-2 border-indigo-500/30 flex items-center justify-center group-hover:scale-110 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-500">
                                <Plus className="w-8 h-8" />
                            </div>
                            <div className="text-center">
                                <span className="text-sm font-black uppercase tracking-[0.2em] text-gray-200 block mb-1">Yeni Şema Kur</span>
                                <span className="text-[10px] text-gray-600 font-medium">Büyük ölçekli XML haritanı çiz</span>
                            </div>
                        </button>
                    </div>
                </div>
            </section>
            
            <section className="lg:col-span-4">
               {/* Quick stats or Logs can go here */}
               <div className="bg-white/[0.02] border border-white/10 rounded-[2rem] p-8 backdrop-blur-xl shadow-2xl h-full">
                    <h2 className="text-lg font-black text-white mb-6 flex items-center gap-3 uppercase tracking-tighter">
                        <Info className="w-5 h-5 text-purple-400" />
                        Sistem Olayları
                    </h2>
                    <p className="text-gray-500 text-sm leading-relaxed italic">V2 Motoru tamamen MySQL ve Prisma üzerinde delta (aralıklı) güncellemeler yapar. Entegrasyon süreleri ağ hızına bağlıdır.</p>
               </div>
            </section>
        </div>
      </div>

      {/* Yeni Kayıt & Etiket Eşleştirme Modalı */}
      {expandedConfig === 'new' && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/95 backdrop-blur-2xl animate-in fade-in duration-500">
              <div className="bg-[#0c0c0e] border border-white/10 w-full max-w-4xl rounded-[3rem] p-12 shadow-[0_0_100px_rgba(79,70,229,0.15)] relative overflow-hidden ring-1 ring-white/5 max-h-[90vh] overflow-y-auto custom-scrollbar">
                  
                  <div className="flex items-center justify-between mb-12">
                      <h2 className="text-3xl font-black text-white flex items-center gap-5 uppercase tracking-tighter">
                          <div className="w-14 h-14 bg-indigo-600 rounded-[1.25rem] flex items-center justify-center shadow-2xl shadow-indigo-600/40">
                            <Zap className="w-7 h-7 text-white" />
                          </div>
                          Dinamik Eşleştirme (Mapping)
                      </h2>
                      <button onClick={() => {setExpandedConfig(null); setAnalysisResult(null); setAnalyzing(false);}} className="h-14 w-14 bg-white/5 rounded-[1.25rem] flex items-center justify-center text-gray-500 hover:text-white hover:bg-red-500/20 hover:text-red-400 transition-all">
                          <Plus className="w-8 h-8 rotate-45" />
                      </button>
                  </div>
                  
                  {!analysisResult ? (
                    <form onSubmit={handleAnalyzeAndAdd} className="space-y-8 animate-in fade-in slide-in-from-bottom-5">
                        <div className="space-y-3">
                            <label className="block text-[11px] font-black text-gray-600 uppercase tracking-[0.3em] font-mono whitespace-nowrap"><span className="text-indigo-500 mr-2">01.</span> FİRMA VEYA XML ADI</label>
                            <input 
                                value={newName} 
                                onChange={(e) => setNewName(e.target.value)}
                                placeholder="Örn: Ebijuteri Toptan"
                                className="w-full bg-black/50 border border-white/10 rounded-[1.5rem] px-8 py-6 text-lg text-white focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all placeholder:text-gray-800 font-bold" 
                            />
                        </div>
                        <div className="space-y-3">
                            <label className="block text-[11px] font-black text-gray-600 uppercase tracking-[0.3em] font-mono whitespace-nowrap"><span className="text-indigo-500 mr-2">02.</span> XML VERİ YOLU (URL)</label>
                            <input 
                                value={newUrl} 
                                onChange={(e) => setNewUrl(e.target.value)}
                                placeholder="https://tedarikci.com/urunler.xml"
                                className="w-full bg-black/50 border border-white/10 rounded-[1.5rem] px-8 py-6 text-lg text-white focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all placeholder:text-gray-800 font-bold" 
                            />
                        </div>
                        <button type="submit" disabled={analyzing} className="mt-8 w-full bg-indigo-600 text-white rounded-2xl py-6 text-sm font-black uppercase tracking-[0.2em] shadow-2xl shadow-indigo-600/40 hover:bg-indigo-500 active:scale-[0.98] transition-all flex items-center justify-center gap-3">
                            {analyzing ? (
                                <><RefreshCw className="w-5 h-5 animate-spin" /> XML Düğümleri Analiz Ediliyor...</>
                            ) : (
                                <><Search className="w-5 h-5" /> ŞEMAYI ANALİZ ET VE EŞLEŞTİR</>
                            )}
                        </button>
                    </form>
                  ) : (
                    <div className="animate-in fade-in slide-in-from-right-10 duration-500 space-y-10">
                        <div className="bg-emerald-500/10 border border-emerald-500/20 p-6 rounded-[1.5rem] flex items-center justify-between">
                            <div>
                                <h4 className="text-lg font-black text-emerald-400 mb-1 flex items-center gap-2"><Globe className="w-5 h-5"/> XML Başarıyla Okundu</h4>
                                <p className="text-sm text-emerald-500/70 font-medium tracking-tight">Toplam <span className="font-black text-white">{analysisResult.totalFound}</span> alt ürün (node) keşfedildi. Aşağıdan alanları ikas'a bağlayın.</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
                            {analysisResult.nodes.map((node: string, index: number) => (
                                <div key={index} className="flex flex-col gap-2">
                                    <div className="flex items-center justify-between px-1">
                                        <span className="text-sm font-black text-gray-300 font-mono tracking-tighter">{node}</span>
                                        <span className="text-[10px] text-gray-600 italic px-2 py-0.5 bg-white/5 rounded-md truncate max-w-[120px]">
                                            Örn: {String(analysisResult.sampleItem[node]).substring(0, 20)}
                                        </span>
                                    </div>
                                    <div className="relative flex items-center">
                                        <div className="absolute left-4 text-gray-500"><Link2 className="w-4 h-4" /></div>
                                        <select className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-12 py-4 text-sm font-medium text-white appearance-none outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all">
                                            <option value="" className="bg-black text-gray-500">Ikas Karşılığı (Otomatik)</option>
                                            <option value="name" className="bg-black text-white">Ürün Adı (Başlık)</option>
                                            <option value="price" className="bg-black text-white">Satış Fiyatı (Price)</option>
                                            <option value="stock" className="bg-black text-white">Stok Adedi</option>
                                            <option value="description" className="bg-black text-white">Açıklama</option>
                                            <option value="brand" className="bg-black text-white">Marka</option>
                                            <option value="category" className="bg-black text-white">Kategori</option>
                                            <option value="ignore" className="bg-black text-red-400">Yoksay (İçe Aktarma)</option>
                                        </select>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <button onClick={handleFinalizeSave} className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-2xl py-6 text-sm font-black uppercase tracking-[0.3em] shadow-2xl hover:scale-[1.01] active:scale-[0.98] transition-all">
                            EŞLEŞTİRMELERİ ONAYLA VE KAYDET
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
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(255,255,255,0.01); }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.05); border-radius: 10px; }
      `}} />
    </div>
  );
}
