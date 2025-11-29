import React, { useState, useEffect } from 'react';
import { Layout, XSquare, Clock, Search, Database, Loader2, HelpCircle, ArrowRightCircle, Archive, Grid } from 'lucide-react';
import NewTenderForm from './components/NewTenderForm';
import BusinessRulesEditor from './components/BusinessRulesEditor';
import TenderCard from './components/TenderCard';
import TenderDetailView from './components/TenderDetailView';
import { TenderDocument, TenderStatus } from './types';
import { analyzeTenderWithGemini } from './services/geminiService';
import { loadTendersFromStorage, saveTendersToStorage, loadRulesFromStorage, saveRulesToStorage } from './services/storageService';

type ViewMode = 'BOARD' | 'ARCHIVE';

const App: React.FC = () => {
  const DEFAULT_RULES = "1. Verificar requisitos de solvencia técnica: ¿Se exigen certificaciones específicas (ISO 9001, 14001, ENS, etc) o Clasificación Empresarial?\n2. Si piden certificaciones obligatorias, es un criterio para descartar el pliego si no se poseen.";

  const [rules, setRules] = useState<string>(DEFAULT_RULES);
  const [tenders, setTenders] = useState<TenderDocument[]>([]);
  const [analyzingIds, setAnalyzingIds] = useState<Set<string>>(new Set());
  const [selectedTender, setSelectedTender] = useState<TenderDocument | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Navigation State
  const [viewMode, setViewMode] = useState<ViewMode>('BOARD');

  // Load Data on Mount
  useEffect(() => {
    const init = async () => {
      const savedRules = await loadRulesFromStorage(DEFAULT_RULES);
      const savedTenders = await loadTendersFromStorage();
      
      // Migration logic for old statuses if needed
      const migratedTenders = savedTenders.map(t => {
        if ((t.status as any) === 'APPROVED') return { ...t, status: TenderStatus.IN_PROGRESS };
        return t;
      });

      setRules(savedRules);
      setTenders(migratedTenders);
      setIsLoaded(true);
    };
    init();
  }, []);

  // Persist Data on Change
  useEffect(() => {
    if (isLoaded) {
      const save = async () => {
        setIsSaving(true);
        await saveTendersToStorage(tenders);
        setTimeout(() => setIsSaving(false), 500); // Small delay for visual feedback
      };
      save();
    }
  }, [tenders, isLoaded]);

  useEffect(() => {
    if (isLoaded) {
      saveRulesToStorage(rules);
    }
  }, [rules, isLoaded]);

  const handleAddTender = (newTender: TenderDocument) => {
    setTenders((prev) => [newTender, ...prev]);
  };

  const handleStatusChange = (tenderId: string, newStatus: TenderStatus) => {
    setTenders(prev => prev.map(t => t.id === tenderId ? { ...t, status: newStatus } : t));
    
    // If we are looking at the detail view, update the local object too
    if (selectedTender?.id === tenderId) {
       setSelectedTender(prev => prev ? { ...prev, status: newStatus } : null);
    }
  };

  const handleAnalyze = async (tender: TenderDocument) => {
    if (!process.env.API_KEY) {
       setError("API KEY no encontrada. Asegúrate de configurar la variable de entorno.");
       setTimeout(() => setError(null), 5000);
       return;
    }

    setAnalyzingIds((prev) => new Set(prev).add(tender.id));

    try {
      const analysis = await analyzeTenderWithGemini(tender, rules);
      
      let newStatus = TenderStatus.PENDING;
      if (analysis.decision === 'KEEP') newStatus = TenderStatus.IN_PROGRESS;
      else if (analysis.decision === 'DISCARD') newStatus = TenderStatus.REJECTED;
      else if (analysis.decision === 'REVIEW') newStatus = TenderStatus.IN_DOUBT;

      const updatedTender = {
        ...tender,
        status: newStatus,
        aiAnalysis: analysis
      };

      setTenders((prev) => prev.map((t) => t.id === tender.id ? updatedTender : t));
      
      // Update selected tender if it's currently open
      if (selectedTender?.id === tender.id) {
         setSelectedTender(updatedTender);
      }

    } catch (err) {
      console.error(err);
      setError("Error al analizar el pliego. Inténtalo de nuevo.");
      setTimeout(() => setError(null), 5000);
    } finally {
      setAnalyzingIds((prev) => {
        const next = new Set(prev);
        next.delete(tender.id);
        return next;
      });
    }
  };

  // Filter tenders for columns
  const pendingTenders = tenders.filter(t => t.status === TenderStatus.PENDING);
  const inProgressTenders = tenders.filter(t => t.status === TenderStatus.IN_PROGRESS); // En tramite
  const inDoubtTenders = tenders.filter(t => t.status === TenderStatus.IN_DOUBT); // En duda
  const rejectedTenders = tenders.filter(t => t.status === TenderStatus.REJECTED); // Descartado
  const archivedTenders = tenders.filter(t => t.status === TenderStatus.ARCHIVED); // Archivado

  if (!isLoaded) {
    return <div className="min-h-screen bg-neutral-950 flex items-center justify-center text-neutral-500 gap-2"><Loader2 className="animate-spin"/> Cargando base de datos...</div>;
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-200 flex flex-col font-sans selection:bg-lime-500/30 selection:text-lime-200">
      
      {/* Background Gradients/Glows */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-900/10 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-900/10 rounded-full blur-[120px]"></div>
      </div>

      {/* Navbar */}
      <header className="sticky top-0 z-30 border-b border-white/5 bg-neutral-950/70 backdrop-blur-xl">
        <div className="max-w-[1920px] mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="bg-lime-400 p-2.5 rounded-xl text-black shadow-[0_0_15px_rgba(163,230,53,0.3)]">
              <Layout size={22} strokeWidth={2.5} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">Licitaciones AI</h1>
              <p className="text-xs text-neutral-500 font-medium tracking-wide uppercase">Gestión Inteligente</p>
            </div>
          </div>
          
          <div className="hidden md:flex items-center gap-6">
             <div className="relative group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 group-hover:text-neutral-300 transition-colors" size={16} />
                <input 
                  type="text" 
                  placeholder="Buscar expedientes..." 
                  className="bg-neutral-900 border border-white/5 rounded-full pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-lime-400/50 w-64 transition-all"
                />
             </div>
             <div className="h-8 w-[1px] bg-white/10"></div>
             
             {/* Saving Indicator */}
             <div className="flex items-center gap-2 min-w-[120px] justify-end">
                {isSaving ? (
                   <>
                     <Loader2 size={16} className="text-lime-500 animate-spin" />
                     <span className="text-xs font-medium text-lime-500/80">Guardando...</span>
                   </>
                ) : (
                   <>
                     <Database size={16} className="text-emerald-500" />
                     <span className="text-xs font-medium text-emerald-500/80">Auto-Guardado</span>
                   </>
                )}
             </div>

             <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-lime-400 to-emerald-500 p-[1px]">
                  <div className="w-full h-full rounded-full bg-neutral-900 flex items-center justify-center text-xs font-bold text-white">
                    AI
                  </div>
                </div>
                <span className="text-sm font-medium text-neutral-300">Admin</span>
             </div>
          </div>
        </div>
      </header>

      {/* Error Toast */}
      {error && (
        <div className="fixed top-24 right-6 z-50 bg-red-500/10 border border-red-500/20 text-red-200 px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 backdrop-blur-md animate-in slide-in-from-right duration-300">
          <XSquare size={20} className="text-red-400" />
          <span className="font-medium">{error}</span>
        </div>
      )}

      {/* Detail View Overlay */}
      {selectedTender && (
        <TenderDetailView 
           tender={selectedTender} 
           onClose={() => setSelectedTender(null)} 
           onStatusChange={handleStatusChange}
        />
      )}

      <main className="relative z-10 flex-1 max-w-[1920px] mx-auto w-full px-6 py-8 grid grid-cols-12 gap-6">
        
        {/* Left Sidebar */}
        <aside className="col-span-12 xl:col-span-3 space-y-6">
          
          {/* View Navigation */}
          <div className="flex p-1 bg-neutral-900 rounded-xl border border-white/5">
             <button 
               onClick={() => setViewMode('BOARD')}
               className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-bold rounded-lg transition-all ${viewMode === 'BOARD' ? 'bg-neutral-800 text-white shadow-sm' : 'text-neutral-500 hover:text-neutral-300'}`}
             >
                <Grid size={16} /> Tablero
             </button>
             <button 
               onClick={() => setViewMode('ARCHIVE')}
               className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-bold rounded-lg transition-all ${viewMode === 'ARCHIVE' ? 'bg-neutral-800 text-white shadow-sm' : 'text-neutral-500 hover:text-neutral-300'}`}
             >
                <Archive size={16} /> Archivo
             </button>
          </div>

          <div className="sticky top-44 space-y-6">
            <NewTenderForm onAddTender={handleAddTender} />
            <BusinessRulesEditor rules={rules} setRules={setRules} />
          </div>
        </aside>

        {/* Main Content Area */}
        <div className="col-span-12 xl:col-span-9 h-fit min-h-[calc(100vh-8rem)]">
          
          {viewMode === 'BOARD' ? (
             // KANBAN BOARD VIEW
             <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 h-full">
                
                {/* Column 1: Pending */}
                <div className="flex flex-col bg-neutral-900/50 rounded-3xl border border-white/5 overflow-hidden h-[calc(100vh-8rem)]">
                  <div className="p-4 border-b border-white/5 bg-neutral-900/80 backdrop-blur-sm sticky top-0 z-10 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-neutral-500 shadow-[0_0_10px_rgba(115,115,115,0.5)]"></div>
                      <h3 className="font-bold text-neutral-300 tracking-wide text-sm">Pendientes</h3>
                    </div>
                    <span className="bg-white/5 text-neutral-400 px-2 py-0.5 rounded text-xs font-bold">{pendingTenders.length}</span>
                  </div>
                  <div className="p-3 space-y-3 overflow-y-auto scrollbar-hide">
                    {pendingTenders.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-neutral-600 gap-3 opacity-50">
                        <Clock size={40} strokeWidth={1} />
                        <p className="text-xs font-medium">Sin tareas</p>
                      </div>
                    ) : (
                      pendingTenders.map(tender => (
                        <TenderCard 
                          key={tender.id} 
                          tender={tender} 
                          onAnalyze={handleAnalyze} 
                          onOpenDetail={setSelectedTender}
                          isAnalyzing={analyzingIds.has(tender.id)} 
                        />
                      ))
                    )}
                  </div>
                </div>

                {/* Column 2: In Doubt */}
                 <div className="flex flex-col bg-neutral-900/50 rounded-3xl border border-white/5 overflow-hidden h-[calc(100vh-8rem)]">
                  <div className="p-4 border-b border-white/5 bg-neutral-900/80 backdrop-blur-sm sticky top-0 z-10 flex items-center justify-between">
                     <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]"></div>
                      <h3 className="font-bold text-amber-200 tracking-wide text-sm">En Duda</h3>
                    </div>
                    <span className="bg-amber-400/10 text-amber-400 px-2 py-0.5 rounded text-xs font-bold">{inDoubtTenders.length}</span>
                  </div>
                   <div className="p-3 space-y-3 overflow-y-auto scrollbar-hide">
                    {inDoubtTenders.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-neutral-600 gap-3 opacity-50">
                        <HelpCircle size={40} strokeWidth={1} />
                        <p className="text-xs font-medium">Vacío</p>
                      </div>
                    ) : (
                      inDoubtTenders.map(tender => (
                        <TenderCard 
                          key={tender.id} 
                          tender={tender} 
                          onOpenDetail={setSelectedTender}
                        />
                      ))
                    )}
                  </div>
                </div>

                {/* Column 3: In Progress */}
                <div className="flex flex-col bg-neutral-900/50 rounded-3xl border border-white/5 overflow-hidden h-[calc(100vh-8rem)]">
                  <div className="p-4 border-b border-white/5 bg-neutral-900/80 backdrop-blur-sm sticky top-0 z-10 flex items-center justify-between">
                     <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-lime-400 shadow-[0_0_10px_rgba(163,230,53,0.5)]"></div>
                      <h3 className="font-bold text-lime-200 tracking-wide text-sm">En Trámite</h3>
                    </div>
                    <span className="bg-lime-400/10 text-lime-400 px-2 py-0.5 rounded text-xs font-bold">{inProgressTenders.length}</span>
                  </div>
                   <div className="p-3 space-y-3 overflow-y-auto scrollbar-hide">
                    {inProgressTenders.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-neutral-600 gap-3 opacity-50">
                        <ArrowRightCircle size={40} strokeWidth={1} />
                        <p className="text-xs font-medium">Vacío</p>
                      </div>
                    ) : (
                      inProgressTenders.map(tender => (
                        <TenderCard 
                          key={tender.id} 
                          tender={tender} 
                          onOpenDetail={setSelectedTender}
                        />
                      ))
                    )}
                  </div>
                </div>

                {/* Column 4: Rejected */}
                <div className="flex flex-col bg-neutral-900/50 rounded-3xl border border-white/5 overflow-hidden h-[calc(100vh-8rem)]">
                   <div className="p-4 border-b border-white/5 bg-neutral-900/80 backdrop-blur-sm sticky top-0 z-10 flex items-center justify-between">
                     <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]"></div>
                      <h3 className="font-bold text-red-200 tracking-wide text-sm">Descartados</h3>
                    </div>
                    <span className="bg-red-500/10 text-red-400 px-2 py-0.5 rounded text-xs font-bold">{rejectedTenders.length}</span>
                  </div>
                  <div className="p-3 space-y-3 overflow-y-auto scrollbar-hide">
                    {rejectedTenders.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-neutral-600 gap-3 opacity-50">
                        <XSquare size={40} strokeWidth={1} />
                        <p className="text-xs font-medium">Vacío</p>
                      </div>
                    ) : (
                      rejectedTenders.map(tender => (
                        <TenderCard 
                          key={tender.id} 
                          tender={tender}
                          onOpenDetail={setSelectedTender}
                        />
                      ))
                    )}
                  </div>
                </div>
             </div>
          ) : (
            // ARCHIVE VIEW
            <div className="bg-neutral-900/30 border border-white/5 rounded-3xl p-6 min-h-full">
               <div className="flex items-center justify-between mb-6">
                 <div>
                    <h2 className="text-xl font-bold text-white flex items-center gap-3">
                       <div className="bg-neutral-800 p-2 rounded-lg text-purple-400 border border-white/5">
                          <Archive size={20} />
                       </div>
                       Archivo Histórico
                    </h2>
                    <p className="text-sm text-neutral-500 mt-1 ml-14">Expedientes antiguos o cerrados.</p>
                 </div>
                 <span className="bg-neutral-800 text-neutral-300 px-3 py-1 rounded-full text-xs font-bold border border-white/5">{archivedTenders.length} Expedientes</span>
               </div>
               
               {archivedTenders.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-24 text-neutral-600 gap-4">
                     <Archive size={64} strokeWidth={1} className="opacity-50" />
                     <p>No hay expedientes archivados.</p>
                  </div>
               ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                     {archivedTenders.map(tender => (
                        <TenderCard 
                          key={tender.id} 
                          tender={tender}
                          onOpenDetail={setSelectedTender}
                        />
                     ))}
                  </div>
               )}
            </div>
          )}

        </div>
      </main>
    </div>
  );
};

export default App;