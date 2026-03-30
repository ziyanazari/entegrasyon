// src/app/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { signOut } from 'next-auth/react';
import { 
  LogOut, Zap, Trash2, Plus, RefreshCw, Clock, CheckCircle2, 
  AlertCircle, Play, Database, Globe, Layers, BarChart3, 
  ShoppingBag, User, Calendar, CreditCard, Settings, Info, ArrowUpRight, Search
} from 'lucide-react';

interface XmlSyncStats {
  status: string;
  date: string;
  processed: number;
  success: number;
  failed: number;
}

interface XmlConfig {
  url: string;
  autoSync: boolean;
  name: string;
  minPrice: number;
  profitMargin: number;
  totalProducts?: number;
  lastSync?: XmlSyncStats;
}

interface OrderItem {
  id: string;
  productName: string;
  sku: string;
  source: string;
}

interface IkasOrder {
  id: string;
  orderNumber: string;
  customerName: string;
  totalPrice: number;
  currency: string;
  status: string;
  createdAt: string;
  items: OrderItem[];
  xmlSource?: string;
}

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<'sync' | 'orders'>('sync');
  const [configs, setConfigs] = useState<XmlConfig[]>([]);
  const [newUrl, setNewUrl] = useState('');
  const [newName, setNewName] = useState('');
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [fetchingCount, setFetchingCount] = useState<string | null>(null);
  const [currentSyncIndex, setCurrentSyncIndex] = useState<number>(-1);
  const [syncResults, setSyncResults] = useState<{ [url: string]: any }>({});
  const [syncErrors, setSyncErrors] = useState<{ [url: string]: string }>({});
  const [limit, setLimit] = useState<number>(0);
  const [expandedConfig, setExpandedConfig] = useState<string | null>(null);
  
  const [orders, setOrders] = useState<IkasOrder[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);

  // Set mounted state
  useEffect(() => {
    setMounted(true);
  }, []);

  // Load configuration from server
  const loadConfigs = async () => {
    try {
        const res = await fetch('/api/config');
        const data = await res.json();
        if (data.configs) {
            setConfigs(data.configs);
            return data.configs;
        }
    } catch (err) {
        console.error('Config yükleme hatası:', err);
    }
    return [];
  };

  useEffect(() => {
    loadConfigs().then(async (loadedConfigs: XmlConfig[]) => {
        // Auto-fetch counts if they are 0 or missing
        loadedConfigs.forEach((c) => {
            if (!c.totalProducts || c.totalProducts === 0) {
                fetchXmlCount(c.url);
            }
        });
    });
  }, []);

  // Load orders when tab changes
  useEffect(() => {
    if (activeTab === 'orders') {
      loadOrders();
    }
  }, [activeTab]);

  const loadOrders = async () => {
    setOrdersLoading(true);
    try {
      const res = await fetch('/api/orders');
      const data = await res.json();
      if (data.orders) setOrders(data.orders);
    } catch (e) {
      console.error('Sipariş yükleme hatası:', e);
    } finally {
      setOrdersLoading(false);
    }
  };

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
    if (!newUrl || !newName) return;
    if (!configs.some(c => c.url === newUrl)) {
      const updated = [
          ...configs, 
          { 
              url: newUrl, 
              name: newName, 
              autoSync: false,
              minPrice: 0,
              profitMargin: 0
          }
      ];
      setConfigs(updated);
      saveConfigs(updated);
    }
    setNewUrl('');
    setNewName('');
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

  const updateConfigField = (url: string, field: keyof XmlConfig, value: any) => {
      const updated = configs.map(c => 
          c.url === url ? { ...c, [field]: value } : c
      );
      setConfigs(updated);
      saveConfigs(updated);
  };

  const fetchXmlCount = async (url: string) => {
      setFetchingCount(url);
      try {
          const res = await fetch('/api/xml-count', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ xmlUrl: url }),
          });
          if (res.ok) {
              const data = await res.json();
              // Update local state without trigger full save immediately, or just update
              setConfigs(prev => prev.map(c => c.url === url ? { ...c, totalProducts: data.count } : c));
          }
      } catch (err) {
          console.error('Count çekme hatası:', err);
      } finally {
          setFetchingCount(null);
      }
  };

  const handleSyncOne = async (idx: number) => {
    const config = configs[idx];
    setLoading(true);
    setCurrentSyncIndex(idx);
    setSyncResults(prev => ({ ...prev, [config.url]: null }));
    setSyncErrors(prev => ({ ...prev, [config.url]: "" }));

    try {
        const response = await fetch('/api/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                xmlUrl: config.url, 
                sourceName: config.name,
                minPrice: config.minPrice || 0,
                profitMargin: config.profitMargin || 0,
                limit: limit > 0 ? limit : undefined 
            }), 
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to sync');
        setSyncResults(prev => ({ ...prev, [config.url]: data.results }));
        
        // Refresh configs to get new stats
        loadConfigs();
    } catch (err: any) {
        setSyncErrors(prev => ({ ...prev, [config.url]: err.message }));
    } finally {
        setLoading(false);
        setCurrentSyncIndex(-1);
    }
  };

  const handleSyncAll = async () => {
    if (configs.length === 0) return;
    setLoading(true);
    setSyncResults({});
    setSyncErrors({});
    
    for (let i = 0; i < configs.length; i++) {
        await handleSyncOne(i);
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    try {
        const date = new Date(dateStr);
        return date.toLocaleString('tr-TR', { 
            day: '2-digit', month: '2-digit', year: 'numeric', 
            hour: '2-digit', minute: '2-digit' 
        });
    } catch (e) {
        return dateStr;
    }
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-[#070709] text-gray-200 font-sans selection:bg-indigo-500/30 overflow-x-hidden relative text-sm">
      <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[120px] -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-purple-600/10 rounded-full blur-[150px] translate-x-1/3 translate-y-1/3 pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6 py-12 relative z-10">
        <header className="mb-8 border-b border-white/5 pb-8 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center border border-indigo-500/30 shadow-[0_0_30px_rgba(99,102,241,0.15)] group transition-all hover:scale-105 active:scale-95 cursor-default">
              <Zap className="w-8 h-8 text-indigo-400 group-hover:text-indigo-300 transition-colors" />
            </div>
            <div>
              <div className="inline-flex items-center gap-2 mb-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 backdrop-blur-md">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[10px] font-semibold text-gray-300 tracking-wider uppercase">Sistem Aktif</span>
              </div>
              <h1 className="text-4xl font-bold tracking-tight text-white mb-1">NazarDev <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">E-entegrasyon</span></h1>
              <p className="text-gray-400 text-sm max-w-xl leading-relaxed">Profesyonel filtreleme, fiyat baremleri ve XML sipariş takip sistemi.</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <button onClick={() => signOut()} className="flex items-center gap-3 px-5 py-3 rounded-xl bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/10 hover:border-white/20 transition-all font-medium group text-[13px]">
              <LogOut className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
              Çıkış Yap
            </button>
          </div>
        </header>

        <div className="flex gap-1 bg-white/5 p-1 rounded-2xl mb-8 w-fit border border-white/5 backdrop-blur-md">
            <button 
              onClick={() => setActiveTab('sync')}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold transition-all ${activeTab === 'sync' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'}`}
            >
                <RefreshCw className={`w-4 h-4 ${activeTab === 'sync' ? 'animate-pulse' : ''}`} />
                Eşitleme Paneli
            </button>
            <button 
              onClick={() => setActiveTab('orders')}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold transition-all ${activeTab === 'orders' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'}`}
            >
                <ShoppingBag className="w-4 h-4" />
                XML Siparişleri
            </button>
        </div>

        <main>
          {activeTab === 'sync' ? (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                <section className="lg:col-span-8 space-y-6">
                    <div className="bg-white/[0.02] border border-white/10 rounded-[2rem] p-8 backdrop-blur-xl transition-all duration-300 hover:bg-white/[0.03]">
                        <h2 className="text-xl font-bold text-white mb-8 flex items-center gap-3">
                            <Database className="w-6 h-6 text-indigo-400" />
                            Aktif XML Kaynakları
                        </h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {configs.map((config, idx) => (
                                <div key={idx} className={`relative flex flex-col bg-black/40 border rounded-[1.5rem] transition-all duration-300 overflow-hidden ${expandedConfig === config.url ? 'border-indigo-500/50 ring-1 ring-indigo-500/20' : 'border-white/5 hover:border-white/20'}`}>
                                    <div className="p-6 flex flex-col h-full">
                                        <div className="flex items-start justify-between mb-6">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 bg-indigo-500/10 rounded-2xl flex items-center justify-center text-indigo-400 border border-indigo-500/20">
                                                    <Globe className="w-6 h-6" />
                                                </div>
                                                <div>
                                                    <h3 className="text-lg font-bold text-white group-hover:text-indigo-300 transition-colors uppercase tracking-tight leading-none mb-1.5">{config.name}</h3>
                                                    <p className="text-[11px] text-gray-500 font-mono truncate max-w-[180px] opacity-60 italic">{config.url}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <button 
                                                    onClick={() => setExpandedConfig(expandedConfig === config.url ? null : config.url)}
                                                    className={`p-2.5 rounded-xl transition-all ${expandedConfig === config.url ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'}`}
                                                >
                                                    <Settings className="w-4 h-4" />
                                                </button>
                                                <button onClick={() => handleRemoveUrl(config.url)} className="p-2.5 bg-white/5 text-gray-500 hover:text-red-400 hover:bg-red-400/10 rounded-xl transition-all"><Trash2 className="w-4 h-4" /></button>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-3 gap-3 mb-6">
                                            <div className="bg-white/[0.03] p-4 rounded-2xl border border-white/5 relative group transition-colors hover:border-indigo-500/30">
                                                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                                                    XML Ürün
                                                    <button 
                                                        onClick={() => fetchXmlCount(config.url)}
                                                        disabled={fetchingCount === config.url}
                                                        className="hover:text-indigo-400 transition-colors ml-auto p-0.5"
                                                        title="Güncel sayıyı çek"
                                                    >
                                                        <Search className={`w-3 h-3 ${fetchingCount === config.url ? 'animate-spin' : ''}`} />
                                                    </button>
                                                </p>
                                                <p className="text-lg font-bold text-white tracking-tight leading-none">{config.totalProducts || 0}</p>
                                            </div>
                                            <div className="bg-white/[0.03] p-4 rounded-2xl border border-white/5 transition-colors hover:border-indigo-500/30">
                                                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">Barem</p>
                                                <p className="text-lg font-bold text-white tracking-tight leading-none">{config.minPrice || 0} <span className="text-[10px] font-medium text-gray-600">TL</span></p>
                                            </div>
                                            <div className="bg-white/[0.03] p-4 rounded-2xl border border-white/5 transition-colors hover:border-indigo-500/30">
                                                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">Kar Marjı</p>
                                                <p className="text-lg font-bold text-emerald-400 tracking-tight leading-none">%{config.profitMargin || 0}</p>
                                            </div>
                                        </div>

                                        {config.lastSync && (
                                            <div className="mt-auto pt-6 border-t border-white/5 space-y-4">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-[11px] text-gray-500 flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> Son Eşitleme:</span>
                                                    <span className="text-[11px] font-bold text-gray-400 font-mono">{formatDate(config.lastSync.date)}</span>
                                                </div>
                                                <div className="space-y-2">
                                                    <div className="flex gap-1 h-1.5 rounded-full bg-white/5 overflow-hidden shadow-inner">
                                                        <div className="bg-emerald-500 h-full shadow-[0_0_8px_rgba(16,185,129,0.4)]" style={{ width: `${(config.lastSync.success / (config.lastSync.processed || 1)) * 100}%` }} />
                                                        <div className="bg-red-500 h-full shadow-[0_0_8px_rgba(239,68,68,0.4)]" style={{ width: `${(config.lastSync.failed / (config.lastSync.processed || 1)) * 100}%` }} />
                                                    </div>
                                                    <div className="flex justify-between text-[11px] font-black uppercase tracking-widest">
                                                        <span className="text-emerald-400">{config.lastSync.success} TAMAM</span>
                                                        <span className="text-red-400">{config.lastSync.failed} HATA</span>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        <button 
                                            onClick={() => handleSyncOne(idx)}
                                            disabled={loading}
                                            className="mt-6 w-full bg-white/5 hover:bg-white/10 text-white rounded-[1rem] py-4 text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-3 group active:scale-[0.98] border border-white/5"
                                        >
                                            {currentSyncIndex === idx ? <RefreshCw className="w-4 h-4 animate-spin text-indigo-400" /> : <RefreshCw className="w-4 h-4 group-hover:rotate-180 transition-transform duration-700" />}
                                            {currentSyncIndex === idx ? 'Güncelleniyor...' : 'Verileri Senkronize Et'}
                                        </button>
                                    </div>

                                    {expandedConfig === config.url && (
                                        <div className="absolute inset-0 bg-[#0c0c0e] z-30 p-8 flex flex-col animate-in slide-in-from-right duration-500">
                                            <div className="flex items-center justify-between mb-10">
                                                <h4 className="text-base font-bold text-white flex items-center gap-3 text-indigo-400">
                                                    <Settings className="w-5 h-5" />
                                                    {config.name} Ayarları
                                                </h4>
                                                <button onClick={() => setExpandedConfig(null)} className="h-10 w-10 bg-white/5 rounded-xl flex items-center justify-center text-gray-500 hover:text-white transition-colors"><Plus className="w-6 h-6 rotate-45" /></button>
                                            </div>

                                            <div className="space-y-8">
                                                <div className="grid grid-cols-2 gap-6">
                                                    <div className="space-y-3">
                                                        <label className="block text-[11px] font-black text-gray-500 uppercase tracking-[0.2em] ml-1">Barem (Min Fiyat)</label>
                                                        <div className="relative">
                                                            <input 
                                                                type="number" 
                                                                value={config.minPrice}
                                                                onChange={(e) => updateConfigField(config.url, 'minPrice', parseInt(e.target.value) || 0)}
                                                                className="w-full bg-white/[0.03] border border-white/10 rounded-2xl px-6 py-5 text-base focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 text-white outline-none transition-all font-bold" 
                                                            />
                                                            <span className="absolute right-5 top-1/2 -translate-y-1/2 text-xs text-gray-600 font-black">TL</span>
                                                        </div>
                                                        <p className="text-[11px] text-gray-600 italic leading-relaxed px-1">Bu tutarın altındaki ürünler Ikas'a aktarılmaz.</p>
                                                    </div>
                                                    <div className="space-y-3">
                                                        <label className="block text-[11px] font-black text-gray-500 uppercase tracking-[0.2em] ml-1">Kar Marjı (%)</label>
                                                        <div className="relative">
                                                            <input 
                                                                type="number" 
                                                                value={config.profitMargin}
                                                                onChange={(e) => updateConfigField(config.url, 'profitMargin', parseInt(e.target.value) || 0)}
                                                                className="w-full bg-white/[0.03] border border-white/10 rounded-2xl px-6 py-5 text-base focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 text-white outline-none transition-all font-bold" 
                                                            />
                                                            <span className="absolute right-5 top-1/2 -translate-y-1/2 text-xs text-emerald-600 font-black">%</span>
                                                        </div>
                                                        <p className="text-[11px] text-gray-600 italic leading-relaxed px-1">XML fiyatının üzerine eklenecek otomatik kar oranı.</p>
                                                    </div>
                                                </div>

                                                <div className="bg-indigo-500/5 border border-indigo-500/10 p-6 rounded-[1.5rem] flex items-center justify-between shadow-inner">
                                                    <div className="flex items-center gap-4">
                                                        <div className={`w-3 h-3 rounded-full ${config.autoSync ? 'bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.6)]' : 'bg-gray-600'}`} />
                                                        <div>
                                                            <p className="text-sm font-bold text-white leading-tight mb-1">Otomatik Senkronizasyon</p>
                                                            <p className="text-[11px] text-gray-500 font-medium tracking-tight">Her 5 dakikada bir veri değişimi kontrol edilir.</p>
                                                        </div>
                                                    </div>
                                                    <button 
                                                        onClick={() => toggleAutoSync(config.url)}
                                                        className={`relative inline-flex h-7 w-14 items-center rounded-full transition-all duration-300 focus:outline-none ${config.autoSync ? 'bg-indigo-600' : 'bg-white/10'}`}
                                                    >
                                                        <span className={`${config.autoSync ? 'translate-x-7' : 'translate-x-1.5'} inline-block h-4.5 w-4.5 transform rounded-full bg-white transition-all shadow-md`} />
                                                    </button>
                                                </div>
                                            </div>

                                            <button 
                                                onClick={() => setExpandedConfig(null)}
                                                className="mt-auto w-full bg-indigo-600 text-white rounded-2xl py-5 text-sm font-black uppercase tracking-[0.2em] shadow-2xl shadow-indigo-600/40 active:scale-[0.98] transition-all"
                                            >
                                                AYARLARI KAYDET VE KAPAT
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ))}

                            <button onClick={() => setExpandedConfig('new')} className="bg-indigo-600/5 border border-indigo-500/20 border-dashed rounded-[1.5rem] p-8 flex flex-col items-center justify-center gap-4 text-indigo-400 hover:bg-indigo-600/10 transition-all group min-h-[300px]">
                                <div className="w-16 h-16 rounded-full border-2 border-indigo-500/30 flex items-center justify-center group-hover:scale-110 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-500">
                                    <Plus className="w-8 h-8" />
                                </div>
                                <div className="text-center">
                                    <span className="text-sm font-black uppercase tracking-[0.2em] text-gray-200 block mb-1">Yeni Kaynak Ekle</span>
                                    <span className="text-[10px] text-gray-600 font-medium">XML veri bağlantısını buraya bağlayın.</span>
                                </div>
                            </button>
                        </div>
                    </div>
                </section>

                <section className="lg:col-span-4 flex flex-col gap-8">
                    <div className="bg-white/[0.02] border border-white/10 rounded-[2rem] p-8 backdrop-blur-xl shadow-2xl">
                        <h2 className="text-lg font-black text-white mb-6 flex items-center gap-3 uppercase tracking-tighter">
                            <Zap className="w-5 h-5 text-purple-400" />
                            Global Kontrol
                        </h2>
                        
                        <div className="space-y-6">
                            <div className="space-y-3">
                                <label className="block text-[11px] font-black text-gray-600 uppercase tracking-[0.2em] ml-1">İşlem Limiti (Adet)</label>
                                <div className="flex bg-black/50 rounded-2xl p-1.5 border border-white/5 shadow-inner">
                                    {[0, 10, 50, 100].map(val => (
                                        <button 
                                            key={val}
                                            onClick={() => setLimit(val)}
                                            className={`flex-1 py-3 rounded-xl text-xs font-black transition-all ${limit === val ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-600/20' : 'text-gray-500 hover:text-gray-300'}`}
                                        >
                                            {val === 0 ? 'TÜMÜ' : val}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <button
                                onClick={handleSyncAll}
                                disabled={loading || configs.length === 0}
                                className="w-full bg-gradient-to-br from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-2xl py-5 text-sm font-black uppercase tracking-[0.2em] transition-all shadow-2xl shadow-indigo-600/30 flex items-center justify-center gap-4 group active:scale-[0.98]"
                            >
                                <Play className="w-5 h-5 group-hover:scale-110 transition-transform fill-current" />
                                TÜMÜNÜ GÜNCELLE
                            </button>
                            
                            <div className="bg-white/5 p-5 rounded-2xl border border-white/5 relative overflow-hidden group">
                                <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/10 rounded-full blur-2xl group-hover:bg-purple-500/20 transition-all duration-700" />
                                <div className="relative z-10 flex items-center gap-4">
                                    <div className="w-10 h-10 bg-purple-500/20 rounded-xl flex items-center justify-center text-purple-400 group-hover:scale-110 transition-transform">
                                        <Info className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className="text-[11px] font-black text-white uppercase tracking-widest leading-none mb-1.5">Sistem Durumu</p>
                                        <p className="text-[10px] text-gray-500 font-mono italic">Bağlantı kararlı ve aktif.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white/[0.02] border border-white/10 rounded-[2rem] p-8 backdrop-blur-xl flex-1 relative overflow-hidden shadow-2xl">
                        <div className="absolute top-0 right-0 w-40 h-40 bg-indigo-500/5 rounded-full blur-[60px]" />
                        <h2 className="text-lg font-black text-white mb-8 flex items-center gap-3 uppercase tracking-tighter">
                            <BarChart3 className="w-5 h-5 text-emerald-400" />
                            Veri İstatistiği
                        </h2>
                        
                        <div className="space-y-5">
                            <div className="flex justify-between items-center bg-black/30 p-5 rounded-2xl border border-white/5 hover:border-white/10 transition-colors">
                                <span className="text-[11px] text-gray-500 uppercase font-black tracking-widest leading-none">Toplam Veri</span>
                                <span className="text-3xl font-black text-white tracking-tighter leading-none">{Object.values(syncResults).reduce((acc, curr) => acc + (curr?.processedTotal || 0), 0)}</span>
                            </div>
                            <div className="flex justify-between items-center bg-emerald-500/5 p-5 rounded-2xl border border-emerald-500/10 hover:border-emerald-500/20 transition-colors">
                                <span className="text-[11px] text-emerald-500/80 uppercase font-black tracking-widest leading-none">Başarılı</span>
                                <span className="text-3xl font-black text-emerald-400 tracking-tighter leading-none">{Object.values(syncResults).reduce((acc, curr) => acc + (curr?.success || 0), 0)}</span>
                            </div>
                            <div className="flex justify-between items-center bg-red-500/5 p-5 rounded-2xl border border-red-500/10 hover:border-red-500/20 transition-colors">
                                <span className="text-[11px] text-red-500/80 uppercase font-black tracking-widest leading-none">Hata</span>
                                <span className="text-3xl font-black text-red-400 tracking-tighter leading-none">{Object.values(syncResults).reduce((acc, curr) => acc + (curr?.failed || 0), 0)}</span>
                            </div>
                        </div>

                        {loading && (
                            <div className="mt-10 flex flex-col items-center gap-5 animate-in fade-in duration-700">
                                <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden shadow-inner">
                                    <div className="bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500 h-full animate-progress bg-[length:200%_100%]" />
                                </div>
                                <p className="text-[10px] text-gray-500 font-black uppercase tracking-[0.3em] animate-pulse italic">VERİ AKIŞI AKTİF... {currentSyncIndex !== -1 ? `(${currentSyncIndex + 1}/${configs.length})` : ''}</p>
                            </div>
                        )}
                    </div>
                </section>
            </div>
          ) : (
            <section className="animate-in fade-in slide-in-from-bottom-8 duration-700">
                <div className="bg-white/[0.02] border border-white/10 rounded-[2.5rem] p-10 backdrop-blur-xl shadow-2xl min-h-[650px]">
                    <div className="flex items-center justify-between mb-12">
                        <div className="flex items-center gap-5">
                            <div className="w-14 h-14 rounded-2xl bg-orange-500/20 flex items-center justify-center border border-orange-500/30 shadow-lg shadow-orange-500/10">
                                <ShoppingBag className="w-7 h-7 text-orange-400" />
                            </div>
                            <div>
                                <h2 className="text-3xl font-black text-white mb-1.5 uppercase tracking-tighter leading-none">XML Sipariş Takibi</h2>
                                <p className="text-sm text-gray-500 italic font-medium opacity-60">Ikas panelinden gelen ve XML kaynaklı ürünleri içeren tüm satışlar.</p>
                            </div>
                        </div>
                        <button 
                          onClick={loadOrders}
                          className="flex items-center gap-3 px-7 py-4 rounded-2xl bg-indigo-600 text-white text-xs font-black uppercase tracking-widest hover:bg-indigo-500 transition-all active:scale-[0.98] shadow-2xl shadow-indigo-600/30"
                        >
                            <RefreshCw className={`w-4 h-4 ${ordersLoading ? 'animate-spin' : ''}`} />
                            Listeyi Yenile
                        </button>
                    </div>

                    {ordersLoading ? (
                        <div className="flex flex-col items-center justify-center py-32 space-y-8">
                            <div className="w-20 h-20 border-[6px] border-indigo-500/10 border-t-indigo-500 rounded-full animate-spin" />
                            <p className="text-gray-400 animate-pulse text-xs font-black tracking-[0.4em] uppercase">VERİLER AKTARILIYOR</p>
                        </div>
                    ) : orders.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-40 text-center">
                            <div className="w-28 h-28 bg-white/5 rounded-[2.5rem] flex items-center justify-center mb-10 border border-white/5 shadow-inner group">
                                <ShoppingBag className="w-12 h-12 opacity-10 group-hover:opacity-20 transition-all duration-700" />
                            </div>
                            <h3 className="text-2xl font-black text-gray-300 mb-4 tracking-tight uppercase">Henüz Sipariş Kaydı Bulunamadı</h3>
                            <p className="text-sm text-gray-500 max-w-sm leading-relaxed mx-auto italic font-medium">XML ürünlerinden bir satış gerçekleştiğinde, tüm teknik veriler ve tedarikçi bilgileri burada anlık olarak raporlanacaktır.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto rounded-[2rem] border border-white/5 bg-black/40 backdrop-blur-md shadow-2xl relative">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="bg-white/[0.04] border-b border-white/10 font-black tracking-[0.2em] text-[10px] text-gray-500 uppercase">
                                        <th className="px-10 py-6">Sipariş Detay</th>
                                        <th className="px-10 py-6">Müşteri Profili</th>
                                        <th className="px-10 py-6">İşlem Zamanı</th>
                                        <th className="px-10 py-6 text-center">XML Tedarikçi</th>
                                        <th className="px-10 py-6">Durum</th>
                                        <th className="px-10 py-6 text-right">Net Ödeme</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/[0.03]">
                                    {orders.map((order) => (
                                        <tr key={order.id} className="hover:bg-indigo-500/[0.06] transition-all duration-300 group cursor-default">
                                            <td className="px-10 py-8">
                                                <div className="flex flex-col">
                                                    <span className="text-base font-black text-white group-hover:text-indigo-400 transition-colors uppercase tracking-tight">#{order.orderNumber}</span>
                                                    <span className="text-[10px] text-gray-600 font-mono mt-1.5 opacity-60">IKAS-UID: {order.id.slice(0,10)}</span>
                                                </div>
                                            </td>
                                            <td className="px-10 py-8">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-500">
                                                        <User className="w-5 h-5 text-indigo-400 group-hover:text-white" />
                                                    </div>
                                                    <span className="text-sm text-gray-300 font-black tracking-tight">{order.customerName}</span>
                                                </div>
                                            </td>
                                            <td className="px-10 py-8 text-sm text-gray-400 font-mono font-medium">
                                                {formatDate(order.createdAt)}
                                            </td>
                                            <td className="px-10 py-8 text-center">
                                                <span className="inline-flex items-center gap-2.5 px-4 py-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-[10px] font-black text-indigo-400 tracking-[0.1em] uppercase shadow-md group-hover:bg-indigo-600 group-hover:text-white transition-all duration-500">
                                                    <Globe className="w-4 h-4" />
                                                    {order.xmlSource}
                                                </span>
                                            </td>
                                            <td className="px-10 py-8">
                                                <span className="text-[10px] font-bold text-gray-400 bg-white/5 px-3 py-2 rounded-lg border border-white/10 uppercase tracking-widest shadow-inner group-hover:border-indigo-500/40 transition-all">
                                                    {order.status}
                                                </span>
                                            </td>
                                            <td className="px-10 py-8 text-right">
                                                <div className="flex flex-col items-end">
                                                    <span className="text-lg font-black text-white tracking-tighter leading-none mb-1">
                                                        {order.totalPrice.toLocaleString('tr-TR')} {order.currency}
                                                    </span>
                                                    <span className="text-[10px] text-gray-600 font-black uppercase tracking-widest">{order.items.length} KALEM ÜRÜN</span>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </section>
          )}
        </main>
      </div>

      {expandedConfig === 'new' && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/95 backdrop-blur-2xl animate-in fade-in duration-500">
              <div className="bg-[#0c0c0e] border border-white/10 w-full max-w-2xl rounded-[3rem] p-12 shadow-[0_0_100px_rgba(79,70,229,0.15)] relative overflow-hidden ring-1 ring-white/5">
                  <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-600/10 rounded-full blur-[100px] pointer-events-none" />
                  <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-600/10 rounded-full blur-[80px] pointer-events-none" />
                  
                  <div className="relative z-10">
                      <div className="flex items-center justify-between mb-12">
                          <h2 className="text-4xl font-black text-white flex items-center gap-5 uppercase tracking-tighter">
                              <div className="w-14 h-14 bg-indigo-600 rounded-[1.25rem] flex items-center justify-center shadow-2xl shadow-indigo-600/40 translate-y-[-2px]">
                                <Plus className="w-8 h-8 text-white" />
                              </div>
                              Yeni XML Bağlantısı
                          </h2>
                          <button onClick={() => setExpandedConfig(null)} className="h-14 w-14 bg-white/5 rounded-[1.25rem] flex items-center justify-center text-gray-500 hover:text-white transition-all hover:bg-white/10">
                              <Plus className="w-8 h-8 rotate-45" />
                          </button>
                      </div>
                      
                      <form onSubmit={(e) => { handleAddUrl(e); setExpandedConfig(null); }} className="space-y-10">
                          <div className="space-y-3">
                              <label className="block text-[11px] font-black text-gray-600 uppercase tracking-[0.3em] ml-2 font-mono">01. TEDARİKÇİ FİRMA ADI</label>
                              <input 
                                  value={newName} 
                                  onChange={(e) => setNewName(e.target.value)}
                                  placeholder="Örn: Ebijuteri Toptan"
                                  className="w-full bg-white/[0.04] border border-white/10 rounded-[1.5rem] px-8 py-6 text-lg text-white focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all placeholder:text-gray-800 font-bold" 
                              />
                          </div>
                          <div className="space-y-3">
                              <label className="block text-[11px] font-black text-gray-600 uppercase tracking-[0.3em] ml-2 font-mono">02. XML VERİ YOLU (URL)</label>
                              <input 
                                  value={newUrl} 
                                  onChange={(e) => setNewUrl(e.target.value)}
                                  placeholder="https://tedarikci-paneli.com/servis/urunler.xml"
                                  className="w-full bg-white/[0.04] border border-white/10 rounded-[1.5rem] px-8 py-6 text-lg text-white focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all placeholder:text-gray-800 font-bold" 
                              />
                          </div>
                          <div className="flex gap-6 pt-8">
                              <button type="button" onClick={() => setExpandedConfig(null)} className="flex-1 bg-white/5 text-gray-500 py-6 rounded-2xl font-black hover:bg-white/10 active:scale-[0.98] transition-all uppercase tracking-[0.2em] text-[11px] border border-white/5">İPTAL EDİLSİN</button>
                              <button type="submit" className="flex-1 bg-indigo-600 text-white py-6 rounded-2xl font-black hover:bg-indigo-500 shadow-2xl shadow-indigo-600/50 active:scale-[0.98] transition-all uppercase tracking-[0.2em] text-[11px]">KAYNAĞI DOĞRULA VE EKLE</button>
                          </div>
                      </form>
                  </div>
              </div>
          </div>
      )}

      <style dangerouslySetInnerHTML={{__html: `
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        body { font-family: 'Inter', sans-serif; }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(255,255,255,0.01); }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.05); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.1); }
        @keyframes rotation { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes progress { 0% { background-position: 0% 50%; } 100% { background-position: 200% 50%; } }
        .animate-progress { animation: progress 3s linear infinite; }
      `}} />
    </div>
  );
}
