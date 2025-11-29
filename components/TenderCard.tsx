
import React, { useState } from 'react';
import { FileText, Link as LinkIcon, ExternalLink, Loader2, CheckCircle, XCircle, File, FileCode, FileSpreadsheet, Download, AlertCircle, Sparkles, Euro, BarChart3, ChevronDown, ChevronUp, Target, Users, ShieldAlert, Lightbulb, Maximize2, HelpCircle, ArrowRightCircle, Archive } from 'lucide-react';
import { TenderDocument, TenderStatus, AnalysisResult } from '../types';

interface Props {
  tender: TenderDocument;
  onAnalyze?: (tender: TenderDocument) => void;
  onOpenDetail?: (tender: TenderDocument) => void;
  isAnalyzing?: boolean;
}

const TenderCard: React.FC<Props> = ({ tender, onAnalyze, onOpenDetail, isAnalyzing }) => {
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  
  const getStatusColor = () => {
    switch (tender.status) {
      case TenderStatus.IN_PROGRESS: return 'bg-neutral-900 border-lime-500/50 shadow-[0_0_15px_rgba(132,204,22,0.1)]'; // En tramite
      case TenderStatus.IN_DOUBT: return 'bg-neutral-900 border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.1)]'; // En duda
      case TenderStatus.REJECTED: return 'bg-neutral-900 border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.1)]'; // Descartado
      case TenderStatus.ARCHIVED: return 'bg-neutral-900/50 border-neutral-800 opacity-75 grayscale-[0.5]'; // Archivado
      default: return 'bg-neutral-900 border-white/5 hover:border-white/10'; // Pendiente
    }
  };

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

  const renderDocumentRow = (
    label: string, 
    type: 'SUMMARY' | 'ADMIN' | 'TECH',
    file: File | null, 
    url: string
  ) => {
    if (!file && !url) return null;

    let Icon = File;
    let colorClass = "text-neutral-400";
    let bgClass = "bg-neutral-800";

    if (type === 'ADMIN') { Icon = FileSpreadsheet; colorClass = "text-amber-400"; bgClass = "bg-amber-950/30"; }
    if (type === 'TECH') { Icon = FileCode; colorClass = "text-indigo-400"; bgClass = "bg-indigo-950/30"; }
    if (type === 'SUMMARY') { Icon = FileText; colorClass = "text-blue-400"; bgClass = "bg-blue-950/30"; }

    return (
      <div className="flex items-center gap-3 p-2 rounded-lg border border-white/5 bg-neutral-950/30 hover:bg-neutral-800 transition-colors group">
        <div className={`p-2 rounded-md ${bgClass} ${colorClass} border border-white/5`}>
          <Icon size={14} />
        </div>
        
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-0.5">{label}</p>
          <p className="text-xs font-medium text-neutral-300 truncate font-mono" title={file ? file.name : url}>
            {file ? file.name : "Enlace Externo"}
          </p>
        </div>

        {file ? (
          <button 
            onClick={(e) => { e.stopPropagation(); handleDownloadFile(file); }}
            className="p-1.5 text-neutral-500 hover:text-lime-400 hover:bg-lime-950/30 rounded-md transition-colors"
            title="Descargar"
          >
            <Download size={16} />
          </button>
        ) : (
          <a 
            href={url} 
            target="_blank" 
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="p-1.5 text-neutral-500 hover:text-lime-400 hover:bg-lime-950/30 rounded-md transition-colors"
            title="Abrir enlace"
          >
            <ExternalLink size={16} />
          </a>
        )}
      </div>
    );
  };

  const renderReportSection = (title: string, icon: React.ReactNode, content: React.ReactNode, id: string) => {
     const isExpanded = expandedSection === id;
     return (
       <div className="border border-white/10 rounded-lg overflow-hidden bg-neutral-900/50">
          <button 
            onClick={(e) => { e.stopPropagation(); setExpandedSection(isExpanded ? null : id); }}
            className="w-full flex items-center justify-between p-3 hover:bg-white/5 transition-colors"
          >
             <div className="flex items-center gap-2 text-xs font-bold text-neutral-300">
               {icon}
               <span>{title}</span>
             </div>
             {isExpanded ? <ChevronUp size={14} className="text-neutral-500"/> : <ChevronDown size={14} className="text-neutral-500"/>}
          </button>
          {isExpanded && (
             <div className="p-3 pt-0 border-t border-white/5 text-xs text-neutral-400 leading-relaxed space-y-2 bg-neutral-950/30">
               {content}
             </div>
          )}
       </div>
     );
  };

  return (
    <div 
      onClick={() => onOpenDetail && onOpenDetail(tender)}
      className={`rounded-2xl border p-5 transition-all duration-300 hover:-translate-y-1 ${getStatusColor()} relative overflow-hidden group cursor-pointer`}
    >
      {/* Decorative colored line based on status */}
      <div className={`absolute top-0 left-0 w-1 h-full 
         ${tender.status === TenderStatus.IN_PROGRESS ? 'bg-lime-500' : 
           tender.status === TenderStatus.IN_DOUBT ? 'bg-amber-500' :
           tender.status === TenderStatus.REJECTED ? 'bg-red-500' : 
           tender.status === TenderStatus.ARCHIVED ? 'bg-purple-500' :
           'bg-transparent'}`
      }></div>
      
      {/* Expand Icon Hint */}
      <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
         <div className="p-1.5 bg-neutral-800 rounded-full text-neutral-400 hover:text-white border border-white/5">
            <Maximize2 size={14} />
         </div>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3 pl-2">
        <div className="min-w-0 w-full pr-8">
            <div className="flex items-center gap-2 mb-1.5">
               <span className="text-[10px] text-neutral-500 font-mono px-1.5 py-0.5 bg-white/5 rounded">ID: {tender.id.slice(0, 6)}</span>
               <span className="text-[10px] text-neutral-500">{new Date(tender.createdAt).toLocaleDateString()}</span>
            </div>
            
            {/* BIG BUDGET DISPLAY */}
            <div className="flex items-center justify-between mb-2">
               <h4 className="font-bold text-neutral-100 leading-snug text-sm md:text-base line-clamp-2 hover:text-white transition-colors cursor-default pr-2" title={tender.name}>
                 {tender.name}
               </h4>
               {tender.budget && (
                 <div className="shrink-0 flex items-center gap-1 bg-emerald-950/50 border border-emerald-500/30 px-3 py-1.5 rounded-lg text-emerald-300 font-bold text-sm shadow-sm">
                    <Euro size={14} /> {tender.budget}
                 </div>
               )}
            </div>
        </div>
      </div>

      {/* Document Manager Section */}
      <div className="bg-neutral-800/20 rounded-xl p-2 space-y-1.5 mb-5 border border-white/5 pl-2">
        {renderDocumentRow("Resumen", "SUMMARY", tender.summaryFile, "")}
        {renderDocumentRow("PCAP", "ADMIN", tender.adminFile, tender.adminUrl)}
        {renderDocumentRow("PPT", "TECH", tender.techFile, tender.techUrl)}

        {!tender.adminUrl && !tender.techUrl && !tender.summaryFile && !tender.adminFile && !tender.techFile && (
           <div className="flex items-center gap-2 text-xs text-neutral-600 italic p-2 justify-center">
             <AlertCircle size={14} />
             Sin documentos
           </div>
        )}
      </div>

      {/* AI Decision / Action Area */}
      <div className="pl-2" onClick={(e) => e.stopPropagation()}>
        {tender.status === TenderStatus.PENDING ? (
          <button
            onClick={() => onAnalyze && onAnalyze(tender)}
            disabled={isAnalyzing}
            className="w-full flex items-center justify-center gap-2 bg-neutral-800 hover:bg-neutral-700 text-white py-3 rounded-xl text-sm font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed border border-white/5 shadow-sm group hover:border-lime-500/30"
          >
            {isAnalyzing ? (
              <>
                <Loader2 size={16} className="animate-spin text-lime-400" />
                <span className="text-neutral-300">Analizando...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-lime-400 group-hover:animate-pulse" />
                <span>Analizar Viabilidad</span>
              </>
            )}
          </button>
        ) : (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
            {/* Decision Badge */}
            <div className="flex items-center justify-between">
               {tender.status === TenderStatus.IN_PROGRESS ? (
                 <span className="flex items-center gap-2 text-xs font-bold text-lime-400 bg-lime-400/10 px-3 py-1.5 rounded-full border border-lime-400/20">
                    <ArrowRightCircle size={14} /> EN TRAMITE
                 </span>
               ) : tender.status === TenderStatus.IN_DOUBT ? (
                 <span className="flex items-center gap-2 text-xs font-bold text-amber-400 bg-amber-400/10 px-3 py-1.5 rounded-full border border-amber-400/20">
                    <HelpCircle size={14} /> EN DUDA
                 </span>
               ) : tender.status === TenderStatus.REJECTED ? (
                <span className="flex items-center gap-2 text-xs font-bold text-red-400 bg-red-400/10 px-3 py-1.5 rounded-full border border-red-400/20">
                    <XCircle size={14} /> DESCARTADO
                 </span>
               ) : tender.status === TenderStatus.ARCHIVED ? (
                <span className="flex items-center gap-2 text-xs font-bold text-purple-400 bg-purple-400/10 px-3 py-1.5 rounded-full border border-purple-400/20">
                    <Archive size={14} /> ARCHIVADO
                 </span>
               ) : null}
            </div>
            
            {tender.aiAnalysis && (
              <div className="space-y-3">
                 {/* Summary Header */}
                 <div className="text-xs text-neutral-300 italic px-1 border-l-2 border-white/20 pl-3">
                    "{tender.aiAnalysis.summaryReasoning}"
                 </div>

                 {/* SCORING BREAKDOWN VISUALIZATION */}
                 {tender.aiAnalysis.scoring && (
                    <div className="bg-neutral-950/50 rounded-lg p-3 border border-white/10">
                       <div className="flex items-center justify-between text-[10px] text-neutral-500 uppercase font-bold mb-2">
                          <span>Desglose Puntuación</span>
                          <BarChart3 size={12}/>
                       </div>
                       
                       <div className="h-3 w-full bg-neutral-800 rounded-full overflow-hidden flex mb-3">
                          <div style={{ width: `${tender.aiAnalysis.scoring.priceWeight}%` }} className="h-full bg-emerald-500" title={`Precio: ${tender.aiAnalysis.scoring.priceWeight}%`}></div>
                          <div style={{ width: `${tender.aiAnalysis.scoring.formulaWeight}%` }} className="h-full bg-blue-500" title={`Fórmula: ${tender.aiAnalysis.scoring.formulaWeight}%`}></div>
                          <div style={{ width: `${tender.aiAnalysis.scoring.valueWeight}%` }} className="h-full bg-purple-500" title={`Juicio Valor: ${tender.aiAnalysis.scoring.valueWeight}%`}></div>
                       </div>
                       
                       {/* DETAILED LIST OF SUB-CRITERIA */}
                       {tender.aiAnalysis.scoring.subCriteria && tender.aiAnalysis.scoring.subCriteria.length > 0 && (
                          <div className="space-y-1.5 mt-2 pt-2 border-t border-white/5">
                             {tender.aiAnalysis.scoring.subCriteria.map((sub, idx) => {
                                let dotColor = "bg-neutral-500";
                                if (sub.category === 'PRICE') dotColor = "bg-emerald-500";
                                if (sub.category === 'FORMULA') dotColor = "bg-blue-500";
                                if (sub.category === 'VALUE') dotColor = "bg-purple-500";
                                
                                return (
                                  <div key={idx} className="flex items-center justify-between text-[10px]">
                                     <div className="flex items-center gap-1.5 text-neutral-400 truncate max-w-[70%]">
                                        <div className={`w-1.5 h-1.5 rounded-full ${dotColor} shrink-0`}></div>
                                        <span className="truncate">{sub.label}</span>
                                     </div>
                                     <span className="font-mono font-bold text-neutral-300">{sub.weight}%</span>
                                  </div>
                                );
                             })}
                          </div>
                       )}
                    </div>
                 )}
                 
                 {/* COLLAPSED REPORT SECTIONS */}
                 <div className="space-y-1">
                    {renderReportSection("Económico", <Euro size={12} className="text-emerald-400"/>, (
                       <div className="grid grid-cols-1 gap-2">
                          <p><span className="text-neutral-500">Modelo:</span> {tender.aiAnalysis.economic.model}</p>
                          <p><span className="text-neutral-500">Base:</span> {tender.aiAnalysis.economic.basis}</p>
                       </div>
                    ), "eco")}
                    
                    {renderReportSection("Alcance", <Target size={12} className="text-blue-400"/>, (
                       <div>
                          <p className="mb-2 line-clamp-3">{tender.aiAnalysis.scope.objective}</p>
                       </div>
                    ), "scope")}
                 </div>
                 
                 <button 
                   onClick={() => onOpenDetail && onOpenDetail(tender)}
                   className="w-full text-center text-xs text-neutral-500 hover:text-white mt-2 pt-2 border-t border-white/5 transition-colors"
                 >
                   Ver informe completo
                 </button>

              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default TenderCard;