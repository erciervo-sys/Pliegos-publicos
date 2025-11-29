import React from 'react';
import { X, Calendar, Euro, FileText, BarChart3, Download, ExternalLink, FileSpreadsheet, FileCode, File, Sparkles, ChevronDown, Archive, XCircle, HelpCircle, ArrowRightCircle, Clock, Target, Users, ShieldAlert, Lightbulb } from 'lucide-react';
import { TenderDocument, TenderStatus } from '../types';

interface Props {
  tender: TenderDocument;
  onClose: () => void;
  onStatusChange: (id: string, status: TenderStatus) => void;
}

const TenderDetailView: React.FC<Props> = ({ tender, onClose, onStatusChange }) => {
  const analysis = tender.aiAnalysis;

  const handleDownloadFile = (file: File) => {
    const url = URL.createObjectURL(file);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const DocItem = ({ label, file, url, type }: { label: string, file: File | null, url: string, type: 'ADMIN' | 'TECH' | 'SUMMARY' }) => {
    if (!file && !url) return null;
    let Icon = File;
    let color = "text-neutral-400";
    if (type === 'ADMIN') { Icon = FileSpreadsheet; color = "text-amber-400"; }
    if (type === 'TECH') { Icon = FileCode; color = "text-indigo-400"; }
    
    return (
      <div className="flex items-center justify-between p-3 bg-neutral-900 rounded-xl border border-white/5 hover:border-white/10 transition-colors">
         <div className="flex items-center gap-3 min-w-0">
            <div className={`p-2 bg-neutral-800 rounded-lg ${color}`}>
               <Icon size={18} />
            </div>
            <div className="min-w-0">
               <p className="text-xs text-neutral-500 font-bold uppercase">{label}</p>
               <p className="text-sm text-neutral-300 truncate max-w-[200px]">{file ? file.name : "Enlace Externo"}</p>
            </div>
         </div>
         <div className="flex items-center gap-2">
             {file ? (
               <button onClick={() => handleDownloadFile(file)} className="p-2 hover:bg-neutral-800 rounded-lg text-neutral-400 hover:text-white transition-colors">
                  <Download size={18} />
               </button>
             ) : (
               <a href={url} target="_blank" rel="noopener noreferrer" className="p-2 hover:bg-neutral-800 rounded-lg text-neutral-400 hover:text-white transition-colors">
                  <ExternalLink size={18} />
               </a>
             )}
         </div>
      </div>
    );
  };

  const StatusSelector = () => {
    const statusConfig = {
      [TenderStatus.PENDING]: { label: 'PENDIENTE', color: 'text-neutral-400', bg: 'bg-neutral-800', border: 'border-neutral-700', icon: Clock },
      [TenderStatus.IN_PROGRESS]: { label: 'EN TRAMITE', color: 'text-lime-400', bg: 'bg-lime-400/10', border: 'border-lime-400/20', icon: ArrowRightCircle },
      [TenderStatus.IN_DOUBT]: { label: 'EN DUDA', color: 'text-amber-400', bg: 'bg-amber-400/10', border: 'border-amber-400/20', icon: HelpCircle },
      [TenderStatus.REJECTED]: { label: 'DESCARTADO', color: 'text-red-400', bg: 'bg-red-400/10', border: 'border-red-400/20', icon: XCircle },
      [TenderStatus.ARCHIVED]: { label: 'ARCHIVADO', color: 'text-purple-400', bg: 'bg-purple-400/10', border: 'border-purple-400/20', icon: Archive },
    };

    const current = statusConfig[tender.status];
    const Icon = current.icon;

    return (
      <div className="relative group z-20">
        <button className={`flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-full border transition-all ${current.color} ${current.bg} ${current.border} hover:opacity-80`}>
           <Icon size={14} />
           <span>{current.label}</span>
           <ChevronDown size={12} className="ml-1 opacity-70" />
        </button>
        
        {/* Dropdown Menu */}
        <div className="absolute top-full left-0 mt-2 w-48 bg-neutral-900 border border-white/10 rounded-xl shadow-2xl p-1 hidden group-hover:block animate-in fade-in zoom-in-95 duration-200">
           {Object.keys(statusConfig).map((key) => {
              const statusKey = key as TenderStatus;
              if (statusKey === tender.status) return null; // Don't show current status
              const config = statusConfig[statusKey];
              const OptionIcon = config.icon;
              return (
                <button 
                  key={key}
                  onClick={() => onStatusChange(tender.id, statusKey)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-neutral-300 hover:bg-white/5 rounded-lg transition-colors text-left"
                >
                   <OptionIcon size={14} className={config.color} />
                   {config.label}
                </button>
              )
           })}
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-4xl h-full bg-neutral-950 border-l border-white/10 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
        
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-white/5 bg-neutral-900/50">
          <div className="flex-1 pr-8">
             <div className="flex items-center gap-3 mb-3">
               <StatusSelector />
               <span className="flex items-center gap-1.5 text-xs text-neutral-500 font-mono">
                  <Calendar size={12} /> {new Date(tender.createdAt).toLocaleDateString()}
               </span>
             </div>
             <h2 className="text-2xl font-bold text-white leading-tight mb-2">{tender.name}</h2>
             {tender.budget && (
                <div className="inline-flex items-center gap-2 bg-emerald-950/30 border border-emerald-500/20 px-3 py-1.5 rounded-lg text-emerald-400 font-mono font-bold">
                   <Euro size={16} /> {tender.budget}
                </div>
             )}
          </div>
          <button onClick={onClose} className="p-2 hover:bg-neutral-800 rounded-full text-neutral-500 hover:text-white transition-colors">
             <X size={24} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-8">
           <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              
              {/* Left Column: Docs & Quick Info */}
              <div className="space-y-6">
                 <div>
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                       <FileText size={16} className="text-lime-400"/> Documentación
                    </h3>
                    <div className="space-y-3">
                       <DocItem label="Resumen" type="SUMMARY" file={tender.summaryFile} url="" />
                       <DocItem label="PCAP" type="ADMIN" file={tender.adminFile} url={tender.adminUrl} />
                       <DocItem label="PPT" type="TECH" file={tender.techFile} url={tender.techUrl} />
                    </div>
                 </div>

                 {analysis && (
                   <div className="bg-neutral-900/50 rounded-2xl p-5 border border-white/5">
                      <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                         <BarChart3 size={16} className="text-purple-400"/> Puntuación
                      </h3>
                      
                      {/* Progress Bar */}
                      <div className="h-4 w-full bg-neutral-800 rounded-full overflow-hidden flex mb-4">
                          <div style={{ width: `${analysis.scoring.priceWeight}%` }} className="h-full bg-emerald-500"></div>
                          <div style={{ width: `${analysis.scoring.formulaWeight}%` }} className="h-full bg-blue-500"></div>
                          <div style={{ width: `${analysis.scoring.valueWeight}%` }} className="h-full bg-purple-500"></div>
                       </div>

                       {/* Detailed Breakdown List */}
                       <div className="space-y-3">
                          {analysis.scoring.subCriteria && analysis.scoring.subCriteria.map((sub, idx) => {
                             let color = "text-neutral-400";
                             let bg = "bg-neutral-800";
                             if (sub.category === 'PRICE') { color = "text-emerald-400"; bg = "bg-emerald-950/30"; }
                             if (sub.category === 'FORMULA') { color = "text-blue-400"; bg = "bg-blue-950/30"; }
                             if (sub.category === 'VALUE') { color = "text-purple-400"; bg = "bg-purple-950/30"; }

                             return (
                                <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-neutral-950/50 border border-white/5">
                                   <div className="flex items-center gap-3">
                                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${bg} ${color} w-12 text-center`}>
                                         {sub.category === 'FORMULA' ? 'AUTO' : sub.category === 'VALUE' ? 'VALOR' : 'PRECIO'}
                                      </span>
                                      <span className="text-sm text-neutral-300">{sub.label}</span>
                                   </div>
                                   <span className="font-mono font-bold text-white">{sub.weight}%</span>
                                </div>
                             )
                          })}
                       </div>
                   </div>
                 )}
              </div>

              {/* Right Column: Full Report */}
              <div className="md:col-span-2 space-y-8">
                 {!analysis ? (
                    <div className="h-full flex flex-col items-center justify-center text-neutral-600 border-2 border-dashed border-neutral-800 rounded-3xl p-10">
                       <Sparkles size={48} className="mb-4 opacity-20" />
                       <p>Análisis pendiente. Ejecuta la IA para ver el informe.</p>
                    </div>
                 ) : (
                    <>
                       {/* Section: Economic */}
                       <section>
                          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2 border-b border-white/10 pb-2">
                             <Euro className="text-emerald-400" /> Análisis Económico
                          </h3>
                          <div className="grid grid-cols-2 gap-4">
                             <div className="bg-neutral-900 p-4 rounded-xl border border-white/5">
                                <p className="text-xs text-neutral-500 uppercase font-bold mb-1">Modelo de Precio</p>
                                <p className="text-neutral-200">{analysis.economic.model}</p>
                             </div>
                             <div className="bg-neutral-900 p-4 rounded-xl border border-white/5">
                                <p className="text-xs text-neutral-500 uppercase font-bold mb-1">Base de Cálculo</p>
                                <p className="text-neutral-200">{analysis.economic.basis}</p>
                             </div>
                          </div>
                       </section>

                       {/* Section: Scope */}
                       <section>
                          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2 border-b border-white/10 pb-2">
                             <Target className="text-blue-400" /> Alcance del Servicio
                          </h3>
                          <div className="bg-neutral-900 p-5 rounded-xl border border-white/5 space-y-4">
                             <div>
                                <p className="text-xs text-neutral-500 uppercase font-bold mb-2">Objetivo</p>
                                <p className="text-neutral-200 leading-relaxed">{analysis.scope.objective}</p>
                             </div>
                             <div>
                                <p className="text-xs text-neutral-500 uppercase font-bold mb-2">Entregables</p>
                                <ul className="list-disc list-inside space-y-1 text-neutral-300">
                                   {analysis.scope.deliverables.map((d, i) => <li key={i}>{d}</li>)}
                                </ul>
                             </div>
                          </div>
                       </section>

                       {/* Section: Resources */}
                       <section>
                          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2 border-b border-white/10 pb-2">
                             <Users className="text-amber-400" /> Recursos y Equipo
                          </h3>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                             <div className="bg-neutral-900 p-4 rounded-xl border border-white/5">
                                <p className="text-xs text-neutral-500 uppercase font-bold mb-1">Duración</p>
                                <p className="text-neutral-200">{analysis.resources.duration}</p>
                             </div>
                             <div className="bg-neutral-900 p-4 rounded-xl border border-white/5 md:col-span-2">
                                <p className="text-xs text-neutral-500 uppercase font-bold mb-1">Equipo Exigido</p>
                                <p className="text-neutral-200">{analysis.resources.team}</p>
                             </div>
                          </div>
                       </section>

                        {/* Section: Solvency */}
                        <section>
                          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2 border-b border-white/10 pb-2">
                             <ShieldAlert className="text-red-400" /> Solvencia y Riesgos
                          </h3>
                          <div className="space-y-4">
                              <div className="bg-neutral-900 p-4 rounded-xl border border-white/5 flex gap-4 items-start">
                                 <div className="min-w-[120px] text-xs text-neutral-500 uppercase font-bold pt-1">Certificaciones</div>
                                 <div className="text-neutral-200">{analysis.solvency.certifications}</div>
                              </div>
                              <div className="bg-neutral-900 p-4 rounded-xl border border-white/5 flex gap-4 items-start">
                                 <div className="min-w-[120px] text-xs text-neutral-500 uppercase font-bold pt-1">Solvencia</div>
                                 <div className="text-neutral-200">{analysis.solvency.specificSolvency}</div>
                              </div>
                              {analysis.solvency.penalties && (
                                 <div className="bg-red-950/20 p-4 rounded-xl border border-red-500/20 flex gap-4 items-start">
                                    <div className="min-w-[120px] text-xs text-red-400 uppercase font-bold pt-1">Penalidades</div>
                                    <div className="text-red-200">{analysis.solvency.penalties}</div>
                                 </div>
                              )}
                          </div>
                       </section>
                       
                       {/* Section: Strategy */}
                       <section>
                          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2 border-b border-white/10 pb-2">
                             <Lightbulb className="text-yellow-400" /> Enfoque Estratégico
                          </h3>
                          <div className="bg-yellow-950/10 p-5 rounded-xl border border-yellow-500/20">
                             <p className="text-yellow-100/80 italic text-lg leading-relaxed">"{analysis.strategy.angle}"</p>
                          </div>
                       </section>

                    </>
                 )}
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default TenderDetailView;