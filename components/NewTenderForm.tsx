import React, { useState, useCallback } from 'react';
import { Plus, Upload, Link as LinkIcon, FileText, X, Loader2, FileCheck, AlertTriangle, Trash2, Globe, ExternalLink, Terminal, Euro, BarChart3 } from 'lucide-react';
import { TenderDocument, TenderStatus } from '../types';
import { extractMetadataFromTenderFile, downloadFileFromUrl, scrapeDocsFromWeb, extractLinksFromPdf, probeLinksInBatches } from '../services/geminiService';

interface Props {
  onAddTender: (tender: TenderDocument) => void;
}

const NewTenderForm: React.FC<Props> = ({ onAddTender }) => {
  const [isOpen, setIsOpen] = useState(false);
  
  // Form State
  const [name, setName] = useState('');
  const [budget, setBudget] = useState('');
  const [scoringSystem, setScoringSystem] = useState('');
  const [tenderPageUrl, setTenderPageUrl] = useState('');
  const [adminUrl, setAdminUrl] = useState('');
  const [adminFile, setAdminFile] = useState<File | null>(null);
  const [techUrl, setTechUrl] = useState('');
  const [techFile, setTechFile] = useState<File | null>(null);
  const [summaryFile, setSummaryFile] = useState<File | null>(null);

  // UI State
  const [isExtracting, setIsExtracting] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [downloadError, setDownloadError] = useState<{show: boolean, msg: string}>({show: false, msg: ""});
  
  // Drag State
  const [dragActive, setDragActive] = useState<{summary: boolean, admin: boolean, tech: boolean}>({
    summary: false, admin: false, tech: false
  });

  const addLog = (msg: string) => setLogs(prev => [...prev, msg]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;

    const newTender: TenderDocument = {
      id: crypto.randomUUID(),
      name,
      budget,
      scoringSystem,
      tenderPageUrl,
      adminUrl,
      adminFile,
      techUrl,
      techFile,
      summaryFile,
      status: TenderStatus.PENDING,
      createdAt: Date.now(),
    };

    onAddTender(newTender);
    resetForm();
    setIsOpen(false);
  };

  const resetForm = () => {
    setName('');
    setBudget('');
    setScoringSystem('');
    setTenderPageUrl('');
    setAdminUrl('');
    setAdminFile(null);
    setTechUrl('');
    setTechFile(null);
    setSummaryFile(null);
    setLogs([]);
    setDownloadError({show: false, msg: ""});
  };

  const processUrlForDocs = async (url: string, currentAdminFile: File | null, currentTechFile: File | null) => {
    if (!url) return { adminFile: currentAdminFile, techFile: currentTechFile, scrapeSuccess: false };

    let newAdminFile = currentAdminFile;
    let newTechFile = currentTechFile;
    let scrapeSuccess = false;

    try {
      addLog("> Analizando web oficial...");
      const scrapedLinks = await scrapeDocsFromWeb(url);
      
      let finalAdminUrl = scrapedLinks.adminUrl;
      let finalTechUrl = scrapedLinks.techUrl;
      let downloadCount = 0;

      if (finalAdminUrl) {
         setAdminUrl(finalAdminUrl);
         if (!newAdminFile) {
           addLog("> Descargando PCAP...");
           const f = await downloadFileFromUrl(finalAdminUrl, "PCAP");
           if (f) { newAdminFile = f; downloadCount++; addLog("  [OK] PCAP descargado"); }
         }
      }
      
      if (finalTechUrl) {
         setTechUrl(finalTechUrl);
         if (!newTechFile) {
           addLog("> Descargando PPT...");
           const f = await downloadFileFromUrl(finalTechUrl, "PPT");
           if (f) { newTechFile = f; downloadCount++; addLog("  [OK] PPT descargado"); }
         }
      }

      if (downloadCount > 0 || finalAdminUrl || finalTechUrl) scrapeSuccess = true;
      
      if ((finalAdminUrl || finalTechUrl) && downloadCount === 0) {
           setDownloadError({
             show: true,
             msg: "Bloqueo anti-robot. Descarga manual."
           });
      }

    } catch (e) {
      console.error("Scraping error", e);
    }
    
    return { adminFile: newAdminFile, techFile: newTechFile, scrapeSuccess };
  };

  const handleManualScrape = async () => {
    if (!tenderPageUrl) return;
    setIsExtracting(true);
    setLogs(["> Iniciando escaneo manual..."]);
    setDownloadError({show: false, msg: ""});
    
    try {
      const result = await processUrlForDocs(tenderPageUrl, adminFile, techFile);
      if (result.adminFile) setAdminFile(result.adminFile);
      if (result.techFile) setTechFile(result.techFile);
      
      if (!result.adminFile && !result.techFile && !result.scrapeSuccess) {
         setDownloadError({ show: true, msg: "No se encontraron documentos." });
      } else {
         addLog("> Escaneo finalizado.");
      }
    } finally {
      setIsExtracting(false);
    }
  };

  const handleFile = async (file: File, type: 'summary' | 'admin' | 'tech') => {
    if (type === 'summary') {
      setSummaryFile(file);
      setIsExtracting(true);
      setLogs(["> Iniciando motor de análisis..."]);
      setDownloadError({show: false, msg: ""});
      
      try {
        // Parallel Task 1: Gemini extraction
        const metadataPromise = extractMetadataFromTenderFile(file).then(data => {
            if (data.name) {
                setName(data.name);
                addLog(`> Título extraído`);
            }
            if (data.budget) setBudget(data.budget);
            if (data.scoringSystem) setScoringSystem(data.scoringSystem);
            return data;
        });

        // Parallel Task 2: PDF Link extraction
        const linksPromise = extractLinksFromPdf(file).then(links => {
            addLog(`> PDF escaneado: ${links.length} enlaces`);
            return links;
        });

        const [data, internalLinks] = await Promise.all([metadataPromise, linksPromise]);
        
        let foundAdmin = null;
        let foundTech = null;

        // Use new Batch Probing Logic
        if (internalLinks.length > 0) {
           addLog(`> Sondeando enlaces (Lotes paralelos)...`);
           const results = await probeLinksInBatches(internalLinks, (processed, total) => {
              if (processed % 5 === 0 || processed === total) {
                 // Update logs occasionally
              }
           });

           if (results.admin) { foundAdmin = results.admin; addLog("  [OK] Doc. Administrativo detectado"); }
           if (results.tech) { foundTech = results.tech; addLog("  [OK] Doc. Técnico detectado"); }
        }
        
        if (foundAdmin) setAdminFile(foundAdmin);
        if (foundTech) setTechFile(foundTech);

        let currentUrl = data.tenderPageUrl;
        
        // If Gemini missed the URL, try finding it in links
        if (!currentUrl) {
           for (const link of internalLinks) {
             const l = link.toLowerCase();
             if (l.includes('contratacion') || l.includes('placsp')) {
               currentUrl = link;
               break;
             }
           }
        }
        if (currentUrl) setTenderPageUrl(currentUrl);

        // Fallback to Web Scraping if docs missing
        if (currentUrl && (!foundAdmin || !foundTech)) {
           const result = await processUrlForDocs(currentUrl, foundAdmin || adminFile, foundTech || techFile);
           if (result.adminFile) setAdminFile(result.adminFile);
           if (result.techFile) setTechFile(result.techFile);
        }
        
        addLog("> Proceso completado.");

      } catch (err) {
        console.error("Auto extraction failed", err);
        setDownloadError({show: true, msg: "Error en el análisis."});
      } finally {
        setIsExtracting(false);
      }
    } else if (type === 'admin') {
      setAdminFile(file);
    } else if (type === 'tech') {
      setTechFile(file);
    }
  };

  const handleDrag = useCallback((e: React.DragEvent, type: 'summary' | 'admin' | 'tech') => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(prev => ({...prev, [type]: true}));
    } else if (e.type === "dragleave") {
      setDragActive(prev => ({...prev, [type]: false}));
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, type: 'summary' | 'admin' | 'tech') => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(prev => ({...prev, [type]: false}));
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type === "application/pdf" || type === 'summary') {
         handleFile(file, type);
      }
    }
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'summary' | 'admin' | 'tech') => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0], type);
    }
  };

  const UploadZone = ({ type, file, label }: { type: 'summary' | 'admin' | 'tech', file: File | null, label: string }) => {
    const isActive = dragActive[type];
    const isSummary = type === 'summary';

    if (file) {
      return (
        <div className="bg-neutral-900 border border-lime-500/30 rounded-xl p-3 shadow-lg group relative overflow-hidden flex items-center gap-3">
           <div className="p-2 bg-neutral-800 rounded-lg text-lime-400 border border-white/5 shrink-0">
               {type === 'summary' ? <FileText size={18} /> : <FileCheck size={18} />}
           </div>
           <div className="min-w-0 flex-1">
               <p className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-0.5">{label}</p>
               <p className="text-sm font-medium text-white truncate">{file.name}</p>
           </div>
           <button 
             type="button" 
             onClick={() => isSummary ? setSummaryFile(null) : type === 'admin' ? setAdminFile(null) : setTechFile(null)}
             className="text-neutral-500 hover:text-red-400 p-2 hover:bg-neutral-800 rounded-full transition-colors"
           >
             <Trash2 size={16} />
           </button>
        </div>
      );
    }

    return (
      <div 
        className={`relative border border-dashed rounded-xl transition-all duration-200 ease-in-out group
          ${isActive 
            ? 'border-lime-500 bg-lime-500/10' 
            : 'border-neutral-700 bg-neutral-900/30 hover:border-neutral-500 hover:bg-neutral-800'
          }
          h-24 flex flex-col items-center justify-center text-center px-4 cursor-pointer
        `}
        onDragEnter={(e) => handleDrag(e, type)}
        onDragOver={(e) => handleDrag(e, type)}
        onDragLeave={(e) => handleDrag(e, type)}
        onDrop={(e) => handleDrop(e, type)}
      >
        <input
          type="file"
          accept={isSummary ? ".pdf,.jpg,.png" : ".pdf"}
          onChange={(e) => handleInputChange(e, type)}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
        />
        
        <div className="text-neutral-500 group-hover:text-lime-400 transition-colors mb-1">
           {type === 'summary' ? <Upload size={20} /> : <Plus size={20} />}
        </div>
        <p className="text-xs font-bold text-neutral-400 uppercase tracking-wider">{label}</p>
        <p className="text-[10px] text-neutral-600 mt-0.5">Arrastrar o Clic</p>
      </div>
    );
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="w-full py-5 border border-dashed border-neutral-700 bg-neutral-900/50 rounded-xl flex items-center justify-center gap-3 text-neutral-400 hover:border-lime-500/50 hover:text-lime-400 hover:bg-lime-500/5 transition-all group duration-300"
      >
        <div className="bg-neutral-800 p-2 rounded-full group-hover:bg-lime-500 group-hover:text-black transition-all">
          <Plus size={20} />
        </div>
        <span className="font-bold text-base tracking-tight">Nuevo Expediente</span>
      </button>
    );
  }

  return (
    <div className="bg-neutral-900 rounded-2xl shadow-2xl border border-white/10 p-5 animate-in fade-in zoom-in-95 duration-300 relative overflow-hidden flex flex-col max-h-[85vh]">
      
      <div className="flex justify-between items-start mb-4">
        <div>
           <h3 className="text-lg font-bold text-white tracking-tight">Nuevo Expediente</h3>
        </div>
        <button onClick={() => { setIsOpen(false); resetForm(); }} className="text-neutral-500 hover:text-white p-1 hover:bg-neutral-800 rounded-full transition-colors">
          <X size={20} />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 overflow-y-auto pr-1 scrollbar-hide">
        
        {/* Step 1: Summary File & Console */}
        <div className="space-y-3">
             <UploadZone 
               type="summary" 
               file={summaryFile} 
               label="Hoja Resumen" 
             />
             
             {/* Terminal Output */}
             {(isExtracting || logs.length > 0) && (
                <div className="bg-black rounded-lg p-3 font-mono text-[10px] text-lime-500 border border-white/10 h-32 overflow-y-auto shadow-inner flex flex-col-reverse">
                   {isExtracting && <div className="flex items-center gap-2 text-white animate-pulse"><Loader2 size={10} className="animate-spin"/> Procesando...</div>}
                   {logs.slice().reverse().map((log, i) => (
                      <div key={i} className="whitespace-pre-wrap opacity-90">{log}</div>
                   ))}
                   <div className="text-neutral-500 mb-1 border-b border-white/10 pb-1 flex items-center gap-1"><Terminal size={10}/> SYSTEM LOG</div>
                </div>
             )}
             
             {downloadError.show && (
                <div className="text-xs text-amber-200 bg-amber-500/10 p-3 rounded-lg border border-amber-500/20 flex flex-col gap-2">
                  <div className="flex items-start gap-2">
                    <AlertTriangle size={14} className="shrink-0 mt-0.5 text-amber-400" />
                    <span>{downloadError.msg}</span>
                  </div>
                  {tenderPageUrl && (
                    <a href={tenderPageUrl} target="_blank" rel="noopener noreferrer" className="self-start inline-flex items-center gap-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors">
                      <ExternalLink size={12} />
                      Abrir Web Oficial
                    </a>
                  )}
                </div>
              )}
        </div>

        {/* Step 2: Details */}
        <div className="space-y-3 pt-2 border-t border-white/5">
           <div>
            <label className="block text-[10px] font-bold text-neutral-500 uppercase mb-1.5 ml-1">Título</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2.5 bg-neutral-800 border border-neutral-700 rounded-lg text-sm text-white focus:outline-none focus:border-lime-500 focus:ring-1 focus:ring-lime-500/50 transition-all placeholder:text-neutral-600"
              placeholder="Nombre del proyecto..."
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
             <div className="relative group">
                <Euro className="absolute left-3 top-3 text-neutral-500 group-focus-within:text-lime-400 transition-colors" size={14} />
                <input
                  type="text"
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                  className="w-full pl-9 px-3 py-2.5 bg-neutral-800 border border-neutral-700 rounded-lg text-xs text-white focus:outline-none focus:border-lime-500 focus:ring-1 focus:ring-lime-500/50 transition-all placeholder:text-neutral-600"
                  placeholder="Presupuesto"
                />
             </div>
             <div className="relative group">
                <BarChart3 className="absolute left-3 top-3 text-neutral-500 group-focus-within:text-lime-400 transition-colors" size={14} />
                <input
                  type="text"
                  value={scoringSystem}
                  onChange={(e) => setScoringSystem(e.target.value)}
                  className="w-full pl-9 px-3 py-2.5 bg-neutral-800 border border-neutral-700 rounded-lg text-xs text-white focus:outline-none focus:border-lime-500 focus:ring-1 focus:ring-lime-500/50 transition-all placeholder:text-neutral-600"
                  placeholder="Criterios (ej: 60% Precio)"
                />
             </div>
          </div>

          <div className="relative group">
            <LinkIcon className="absolute left-3 top-3 text-neutral-500 group-focus-within:text-lime-400 transition-colors" size={14} />
            <input
              type="url"
              value={tenderPageUrl}
              onChange={(e) => setTenderPageUrl(e.target.value)}
              className="w-full pl-9 pr-10 py-2.5 bg-neutral-800 border border-neutral-700 rounded-lg text-sm text-white focus:outline-none focus:border-lime-500 focus:ring-1 focus:ring-lime-500/50 transition-all placeholder:text-neutral-600"
              placeholder="URL Plataforma Contratación"
            />
            {tenderPageUrl && !isExtracting && (
              <button
                type="button"
                onClick={handleManualScrape}
                className="absolute right-1.5 top-1.5 p-1.5 bg-neutral-700 text-neutral-300 rounded hover:bg-lime-500 hover:text-black transition-all"
                title="Escanear web"
              >
                 <Globe size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Step 3: Documents */}
        <div className="grid grid-cols-2 gap-3 pt-2 border-t border-white/5">
           <UploadZone 
             type="admin" 
             file={adminFile}
             label="PCAP" 
           />

           <UploadZone 
             type="tech" 
             file={techFile}
             label="PPT" 
           />
        </div>

        <button
          type="submit"
          className="w-full bg-lime-400 hover:bg-lime-300 text-black font-bold py-3 rounded-xl transition-all shadow-[0_0_15px_rgba(163,230,53,0.3)] hover:shadow-[0_0_25px_rgba(163,230,53,0.5)] flex items-center justify-center gap-2 transform active:scale-[0.98] mt-2"
        >
          <Plus size={18} strokeWidth={2.5} />
          <span>Crear Expediente</span>
        </button>
      </form>
    </div>
  );
};

export default NewTenderForm;