import React, { useState } from 'react';
import { Terminal, Eye, Code2 } from 'lucide-react';
import { buildAnalysisSystemPrompt } from '../services/geminiService';

interface Props {
  rules: string;
  setRules: (rules: string) => void;
}

const BusinessRulesEditor: React.FC<Props> = ({ rules, setRules }) => {
  const [showPreview, setShowPreview] = useState(false);

  return (
    <div className="bg-neutral-900 rounded-3xl shadow-xl border border-white/10 p-6 flex flex-col h-full overflow-hidden">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-neutral-800 rounded-lg text-lime-400 border border-white/5">
            <Terminal size={20} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Reglas de Negocio</h2>
            <p className="text-xs text-neutral-500 font-medium">Lógica de decisión</p>
          </div>
        </div>
        
        <div className="flex bg-neutral-800 rounded-lg p-0.5 border border-white/5">
           <button 
             onClick={() => setShowPreview(false)}
             className={`px-3 py-1.5 rounded-md text-[10px] font-bold transition-all flex items-center gap-1.5 ${!showPreview ? 'bg-neutral-700 text-white shadow-sm' : 'text-neutral-400 hover:text-white'}`}
           >
             <Code2 size={12} /> Editor
           </button>
           <button 
             onClick={() => setShowPreview(true)}
             className={`px-3 py-1.5 rounded-md text-[10px] font-bold transition-all flex items-center gap-1.5 ${showPreview ? 'bg-lime-500/20 text-lime-400 shadow-sm' : 'text-neutral-400 hover:text-white'}`}
           >
             <Eye size={12} /> System Prompt
           </button>
        </div>
      </div>
      
      {!showPreview ? (
        <>
          <p className="text-xs text-neutral-400 mb-4 leading-relaxed">
            Define los criterios de filtrado. La IA usará estas reglas estrictas para evaluar cada expediente.
          </p>

          <div className="flex-1 relative group">
             <div className="absolute inset-0 bg-neutral-950 rounded-xl border border-neutral-800 pointer-events-none group-focus-within:border-lime-500/50 transition-colors"></div>
             <textarea
                value={rules}
                onChange={(e) => setRules(e.target.value)}
                className="relative z-10 w-full h-full p-4 text-sm font-mono text-lime-100 bg-transparent border-none rounded-xl focus:ring-0 resize-none outline-none leading-relaxed placeholder:text-neutral-700"
                spellCheck={false}
                placeholder="// Escribe tus reglas aquí..."
              />
          </div>
          
          <div className="mt-4 flex items-center justify-between text-[10px] text-neutral-600 font-mono">
            <span>{rules.length} caracteres</span>
            <span>Auto-guardado activo</span>
          </div>
        </>
      ) : (
        <div className="flex-1 bg-neutral-950 rounded-xl border border-neutral-800 p-4 overflow-y-auto font-mono text-xs text-neutral-400">
           <div className="whitespace-pre-wrap">
             {buildAnalysisSystemPrompt("{{TUS REGLAS SE INSERTAN AQUÍ}}").split("{{TUS REGLAS SE INSERTAN AQUÍ}}")[0]}
             <span className="text-lime-400 font-bold block my-2 border-l-2 border-lime-500 pl-3 py-1 bg-lime-500/5">
                {rules || "// (Sin reglas definidas)"}
             </span>
             {buildAnalysisSystemPrompt("{{TUS REGLAS SE INSERTAN AQUÍ}}").split("{{TUS REGLAS SE INSERTAN AQUÍ}}")[1]}
           </div>
        </div>
      )}
    </div>
  );
};

export default BusinessRulesEditor;