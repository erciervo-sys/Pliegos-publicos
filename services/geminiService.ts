import { GoogleGenAI, Type, Schema } from "@google/genai";
import { TenderDocument, AnalysisResult } from "../types";
// @ts-ignore
import * as pdfjsLib from 'pdfjs-dist';

// Configure PDF.js worker
if (typeof window !== 'undefined' && 'Worker' in window) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@4.0.379/build/pdf.worker.min.mjs`;
}

// LAZY INITIALIZATION: Only creates the client when needed
const getAiClient = () => {
  const key = process.env.API_KEY;
  if (!key) {
    throw new Error("API Key no encontrada. Asegúrate de configurar la variable de entorno API_KEY en tu archivo .env o en el panel de Netlify.");
  }
  return new GoogleGenAI({ apiKey: key });
};

// Helper to convert File to Base64
const fileToPart = async (file: File): Promise<{ inlineData: { data: string; mimeType: string } }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        const base64Data = reader.result.split(',')[1];
        resolve({
          inlineData: {
            data: base64Data,
            mimeType: file.type,
          },
        });
      } else {
        reject(new Error("Failed to read file"));
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

const normalizeText = (text: string) => {
  return text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
};

// Helper to classify a file based on its name
export const classifyFile = (file: File): 'ADMIN' | 'TECH' | 'UNKNOWN' => {
  const name = normalizeText(file.name);
  
  // Admin keywords
  if (
    name.includes('pcap') || 
    name.includes('admin') || 
    name.includes('clausula') || 
    name.includes('juridico') ||
    name.includes('caratula')
  ) {
    return 'ADMIN';
  }

  // Tech keywords
  if (
    name.includes('ppt') || 
    name.includes('tecnic') || 
    name.includes('prescrip') || 
    name.includes('memoria') ||
    name.includes('proyecto')
  ) {
    return 'TECH';
  }

  return 'UNKNOWN';
};

// Helper to extract embedded links from PDF structure
export const extractLinksFromPdf = async (file: File): Promise<string[]> => {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const links: Set<string> = new Set();

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const annotations = await page.getAnnotations();
      
      for (const ant of annotations) {
        if (ant.subtype === 'Link' && ant.url) {
          links.add(ant.url);
        }
      }
    }
    return Array.from(links);
  } catch (error) {
    console.warn("Failed to extract links with PDF.js", error);
    return [];
  }
};

// Helper to attempt to download a file from a URL to a File object
export const downloadFileFromUrl = async (url: string, defaultPrefix: string): Promise<File | null> => {
  if (!url || !url.startsWith('http')) return null;

  const tryDownload = async (fetchUrl: string): Promise<{ blob: Blob, filename?: string } | null> => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout per download

      const response = await fetch(fetchUrl, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!response.ok) return null;
      
      const blob = await response.blob();
      
      // Strict validation: Ensure it's not a small HTML error page
      if (blob.type.includes('text/html') || blob.size < 2000) {
        try {
          const text = await blob.text();
          if (text.includes('<html') || text.includes('Error') || text.includes('Denied')) return null;
        } catch (e) {}
        if (blob.type.includes('text/html')) return null;
      }

      // Try to extract filename from Content-Disposition
      let filename = "";
      const disposition = response.headers.get('Content-Disposition');
      if (disposition && disposition.includes('filename=')) {
        const match = disposition.match(/filename=['"]?([^'"]+)['"]?/);
        if (match && match[1]) filename = match[1];
      }

      return { blob, filename };
    } catch (e) {
      return null;
    }
  };

  try {
    // Try CORS Proxy first as it handles redirects better for downloads
    const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(url)}`;
    let result = await tryDownload(proxyUrl);

    // Fallback to AllOrigins
    if (!result) {
      const aoUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
      result = await tryDownload(aoUrl);
    }

    if (!result) return null;

    const { blob, filename } = result;
    
    // Determine extension
    let extension = ".pdf";
    if (filename && filename.includes('.')) {
       // Keep existing extension if present
    } else {
      if (blob.type === "application/pdf") extension = ".pdf";
      else if (blob.type.includes("zip")) extension = ".zip";
      else if (blob.type.includes("word")) extension = ".docx";
    }

    const finalName = filename || `${defaultPrefix}_${new Date().getTime()}${extension}`;
    return new File([blob], finalName, { type: blob.type });

  } catch (error) {
    console.warn(`Could not download file from ${url}:`, error);
    return null;
  }
};

// Filter heuristic: Don't probe links that are obviously not files
const isRelevantLink = (url: string): boolean => {
  const lower = url.toLowerCase();
  if (lower.startsWith('mailto:')) return false;
  if (lower.includes('google.com') || lower.includes('facebook') || lower.includes('twitter') || lower.includes('linkedin')) return false;
  if (lower.includes('maps.') || lower.includes('youtube')) return false;
  return true;
}

// Probe a link to see if it's a file we want
export const probeAndDownloadLink = async (url: string): Promise<{ file: File, type: 'ADMIN' | 'TECH' | 'UNKNOWN' } | null> => {
  if (!isRelevantLink(url)) return null;

  const file = await downloadFileFromUrl(url, "doc");
  if (file) {
    return {
      file,
      type: classifyFile(file)
    };
  }
  return null;
};

// --- Parallel Batch Processing ---
export const probeLinksInBatches = async (
  links: string[], 
  onProgress?: (processed: number, total: number) => void
): Promise<{ admin?: File, tech?: File }> => {
  
  const uniqueLinks = Array.from(new Set(links)).filter(isRelevantLink);
  const results: { admin?: File, tech?: File } = {};
  
  // Batch size of 4 to avoid browser connection limits/timeouts
  const BATCH_SIZE = 4;
  let processed = 0;

  for (let i = 0; i < uniqueLinks.length; i += BATCH_SIZE) {
    if (results.admin && results.tech) break;

    const batch = uniqueLinks.slice(i, i + BATCH_SIZE);
    const promises = batch.map(url => probeAndDownloadLink(url));
    
    const batchResults = await Promise.all(promises);

    for (const res of batchResults) {
      if (res && res.file) {
        if (res.type === 'ADMIN' && !results.admin) results.admin = res.file;
        else if (res.type === 'TECH' && !results.tech) results.tech = res.file;
        else if (res.type === 'UNKNOWN') {
           if (!results.admin) results.admin = res.file; 
           else if (!results.tech) results.tech = res.file;
        }
      }
    }
    
    processed += batch.length;
    if (onProgress) onProgress(Math.min(processed, uniqueLinks.length), uniqueLinks.length);
  }

  return results;
};

// Helper to scrape a web page for document links
export const scrapeDocsFromWeb = async (pageUrl: string): Promise<{ adminUrl?: string, techUrl?: string }> => {
  if (!pageUrl || !pageUrl.startsWith('http')) return {};

  try {
    const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(pageUrl)}`;
    
    const response = await fetch(proxyUrl);
    if (!response.ok) throw new Error("Proxy response not ok");
    
    const htmlString = await response.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlString, 'text/html');
    const links = Array.from(doc.querySelectorAll('a'));

    let adminUrl: string | undefined;
    let techUrl: string | undefined;
    let potentialPdfs: string[] = [];

    const resolveUrl = (href: string) => {
      try {
        if (href.startsWith('http')) return href;
        return new URL(href, pageUrl).href;
      } catch {
        return href;
      }
    };

    for (const link of links) {
      const href = link.getAttribute('href');
      const text = link.textContent || "";
      const title = link.getAttribute('title') || "";
      const ariaLabel = link.getAttribute('aria-label') || "";
      const id = link.getAttribute('id') || "";
      const className = link.getAttribute('class') || "";
      
      if (!href || href.startsWith('javascript') || href === '#' || href === '/') continue;

      const fullUrl = resolveUrl(href);
      const combinedText = normalizeText(`${text} ${title} ${ariaLabel} ${id} ${className} ${href}`);

      const isAdmin = (
        combinedText.includes('pcap') || 
        combinedText.includes('clausulas') || 
        combinedText.includes('administrativ') ||
        combinedText.includes('caratula') ||
        combinedText.includes('bases') ||
        combinedText.includes('anexo')
      );

      const isTech = (
        combinedText.includes('ppt') || 
        combinedText.includes('prescripciones') || 
        combinedText.includes('tecnic') ||
        combinedText.includes('memoria') ||
        combinedText.includes('proyecto')
      );

      const isFile = fullUrl.toLowerCase().endsWith('.pdf') || fullUrl.toLowerCase().endsWith('.zip');

      if (isFile) {
         potentialPdfs.push(fullUrl);
      }

      if (!adminUrl && isAdmin) adminUrl = fullUrl;
      if (!techUrl && isTech) techUrl = fullUrl;
    }

    if (potentialPdfs.length > 0) {
      if (!adminUrl && potentialPdfs[0]) adminUrl = potentialPdfs[0];
      if (!techUrl && potentialPdfs[1]) techUrl = potentialPdfs[1];
    }

    return { adminUrl, techUrl };

  } catch (error) {
    console.error("Scraping failed:", error);
    return {};
  }
};

export const extractMetadataFromTenderFile = async (file: File): Promise<{ 
  name: string; 
  adminUrl: string; 
  techUrl: string; 
  tenderPageUrl: string;
  budget: string;
  scoringSystem: string; 
}> => {
  const ai = getAiClient(); // LAZY LOAD HERE
  const modelName = "gemini-2.5-flash";
  const filePart = await fileToPart(file);

  const prompt = `
    Analiza este documento de licitación (Hoja Resumen). Extrae los siguientes datos con precisión:
    
    1. NAME: Título completo del expediente.
    2. BUDGET: Presupuesto base de licitación o valor estimado (SIN IMPUESTOS si es posible distinguir). Incluye el símbolo de moneda. Ej: "150.000 €".
    3. SCORING SYSTEM: Resume brevemente los criterios de adjudicación. Ej: "Precio 60%, Técnico 40%" o "Juicio de valor 30 ptos, Automático 70 ptos".
    4. TENDER PAGE URL: Enlace a la plataforma de contratación (contrataciondelestado, placsp, etc).
    5. ADMIN URL: Enlace directo al Pliego Administrativo (PCAP).
    6. TECH URL: Enlace directo al Pliego Técnico (PPT).
    
    Responde estrictamente en JSON.
  `;

  const responseSchema: Schema = {
    type: Type.OBJECT,
    properties: {
      name: { type: Type.STRING },
      budget: { type: Type.STRING, description: "Presupuesto del contrato" },
      scoringSystem: { type: Type.STRING, description: "Resumen de puntuación (ej: Precio 80%)" },
      tenderPageUrl: { type: Type.STRING },
      adminUrl: { type: Type.STRING },
      techUrl: { type: Type.STRING },
    },
    required: ["name"],
  };

  try {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: [{ role: 'user', parts: [filePart, { text: prompt }] }],
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
      },
    });

    const text = response.text;
    if (!text) return { name: "", adminUrl: "", techUrl: "", tenderPageUrl: "", budget: "", scoringSystem: "" };
    return JSON.parse(text);

  } catch (error) {
    console.error("Error extracting metadata:", error);
    throw error;
  }
};

// --- System Prompt Builder (Exported for UI Transparency) ---
export const buildAnalysisSystemPrompt = (rules: string) => {
  return `
    Actúa como un Analista Senior de Licitaciones Públicas (Bid Manager) en España. Voy a facilitarte información de los pliegos (PCAP y PPT) de una licitación.

    Tu objetivo es generar un "Informe Ejecutivo de Viabilidad" para decidir el Go/No-Go. Debes analizar el texto proporcionado y extraer EXCLUSIVAMENTE la información estructurada solicitada. Sé crítico: si falta información, indícalo.
    
    Tus decisiones deben basarse en las siguientes REGLAS DE NEGOCIO personalizadas:
    ${rules}
    
    DECISIÓN FINAL:
    - KEEP: Si el pliego cumple las reglas y es interesante.
    - DISCARD: Si incumple alguna regla bloqueante (Solvencia, ISOs) o no interesa.
    - REVIEW: Si faltan datos críticos para decidir (ej: documento de solvencia ilegible o faltante) o hay dudas razonables.

    INSTRUCCIONES DE EXTRACCIÓN Y ANÁLISIS:
    
    1. 💰 ANÁLISIS ECONÓMICO (PRECIO Y COSTES)
    - Presupuesto Base de Licitación (Sin IVA).
    - Modelo de Precio: ¿Es a tanto alzado o precios unitarios?
    - Base del Cálculo: ¿Qué incluye? (Dietas, desplazamientos, licencias, etc).

    2. 🎯 ALCANCE DEL SERVICIO (QUÉ HAY QUE HACER)
    - Resumen del Objeto: Explica en 2-3 frases sencillas qué trabajo físico o intelectual hay que entregar.
    - Entregables Clave: Lista los productos/informes/servicios principales.

    3. 👥 RECURSOS Y CRONOGRAMA
    - Duración: [Meses/Años] + [Posibles Prórrogas].
    - Equipo Mínimo Exigido (Adscripción de Medios): Perfiles, titulación, experiencia mínima.
    - Dedicación: ¿Exclusiva? ¿Presencial?

    4. 🚩 REQUISITOS BLOQUEANTES Y SOLVENCIA
    - Certificaciones (ISO, ENS, Grupo/Subgrupo).
    - Solvencia Técnica Específica (proyectos similares últimos 3 años).
    - Penalidades inusuales.

    5. 💡 ENFOQUE ESTRATÉGICO SUGERIDO
    - Ángulo de Ataque: ¿Cómo plantear la propuesta?

    6. 📊 PUNTUACIÓN DETALLADA (CRÍTICO)
    - Debes desglosar la puntuación en tres categorías:
       A) PRECIO (Matemático puro).
       B) FÓRMULAS AUTOMÁTICAS (Objetivo pero no es precio, ej: bolsa de horas, mejoras, certificaciones).
       C) JUICIO DE VALOR (Subjetivo, memoria técnica).
    - IMPORTANTE: LISTA CADA SUB-CRITERIO INDIVIDUAL con su peso específico (puntos o %).
      Ejemplo: "Mejoras de plazo" (Automático) -> 5 ptos. "Plan de trabajo" (Valor) -> 20 ptos.

    Devuelve todo en formato JSON estricto.
  `;
};

export const analyzeTenderWithGemini = async (
  tender: TenderDocument,
  rules: string
): Promise<AnalysisResult> => {
  const ai = getAiClient(); // LAZY LOAD HERE
  const modelName = "gemini-2.5-flash";

  // Use the shared builder so the prompt is consistent with what the user sees
  const systemInstruction = buildAnalysisSystemPrompt(rules);

  const parts: any[] = [];

  parts.push({
    text: `
      --- TENDER INFO ---
      Name: ${tender.name}
      Budget: ${tender.budget || "Not specified"}
      Scoring: ${tender.scoringSystem || "Not specified"}
      Source URL: ${tender.tenderPageUrl || "N/A"}
      
      --- ATTACHED DOCUMENTS FOR ANALYSIS ---
    `
  });

  if (tender.summaryFile) {
    try { parts.push({ text: "--- DOCUMENTO 1: HOJA RESUMEN ---" }); parts.push(await fileToPart(tender.summaryFile)); } catch (e) {}
  }
  if (tender.adminFile) {
    try { parts.push({ text: "--- DOCUMENTO 2: PLIEGO ADMINISTRATIVO (PCAP) ---" }); parts.push(await fileToPart(tender.adminFile)); } catch (e) {}
  }
  if (tender.techFile) {
    try { parts.push({ text: "--- DOCUMENTO 3: PLIEGO TÉCNICO (PPT) ---" }); parts.push(await fileToPart(tender.techFile)); } catch (e) {}
  }

  const responseSchema: Schema = {
    type: Type.OBJECT,
    properties: {
      decision: { type: Type.STRING, enum: ["KEEP", "DISCARD", "REVIEW"] },
      summaryReasoning: { type: Type.STRING, description: "Breve justificación de 1 frase para la cabecera" },
      
      economic: {
        type: Type.OBJECT,
        properties: {
          budget: { type: Type.STRING },
          model: { type: Type.STRING },
          basis: { type: Type.STRING },
        }
      },
      scope: {
        type: Type.OBJECT,
        properties: {
          objective: { type: Type.STRING },
          deliverables: { type: Type.ARRAY, items: { type: Type.STRING } },
        }
      },
      resources: {
        type: Type.OBJECT,
        properties: {
          duration: { type: Type.STRING },
          team: { type: Type.STRING },
          dedication: { type: Type.STRING },
        }
      },
      solvency: {
        type: Type.OBJECT,
        properties: {
          certifications: { type: Type.STRING },
          specificSolvency: { type: Type.STRING },
          penalties: { type: Type.STRING },
        }
      },
      strategy: {
        type: Type.OBJECT,
        properties: {
          angle: { type: Type.STRING },
        }
      },
      scoring: {
        type: Type.OBJECT,
        properties: {
          priceWeight: { type: Type.NUMBER, description: "Peso total del precio (0-100)" },
          formulaWeight: { type: Type.NUMBER, description: "Peso total de fórmulas automáticas NO precio (0-100)" },
          valueWeight: { type: Type.NUMBER, description: "Peso total juicio de valor (0-100)" },
          details: { type: Type.STRING, description: "Resumen textual" },
          subCriteria: {
            type: Type.ARRAY,
            description: "Lista detallada de cada sub-criterio de puntuación",
            items: {
              type: Type.OBJECT,
              properties: {
                label: { type: Type.STRING, description: "Nombre del criterio (ej: Plan de Calidad)" },
                weight: { type: Type.NUMBER, description: "Puntos o porcentaje" },
                category: { type: Type.STRING, enum: ["PRICE", "FORMULA", "VALUE"] }
              },
              required: ["label", "weight", "category"]
            }
          }
        },
        required: ["priceWeight", "formulaWeight", "valueWeight", "details", "subCriteria"]
      },
    },
    required: ["decision", "summaryReasoning", "economic", "scope", "resources", "solvency", "strategy", "scoring"],
  };

  try {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: [{ role: 'user', parts: parts }],
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        responseSchema: responseSchema,
      },
    });

    const text = response.text;
    if (!text) throw new Error("No response from Gemini");

    return JSON.parse(text);

  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};