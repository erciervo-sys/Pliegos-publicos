
import { get, set } from 'idb-keyval';
import { TenderDocument } from '../types';

const TENDERS_KEY = 'licitaciones_ai_tenders_v1';
const RULES_KEY = 'licitaciones_ai_rules_v1';

export const saveTendersToStorage = async (tenders: TenderDocument[]) => {
  try {
    // IndexedDB can handle File objects directly (they are Blobs).
    // Note: If files are massive, we might hit browser quota limits.
    await set(TENDERS_KEY, tenders);
    // console.log('Tenders saved to IndexedDB'); 
  } catch (error: any) {
    if (error && error.name === 'QuotaExceededError') {
      console.error('ALMACENAMIENTO LLENO: No se pueden guardar más documentos.', error);
      alert("Almacenamiento lleno. Por favor, borra expedientes antiguos para liberar espacio.");
    } else {
      console.error('Error saving tenders:', error);
    }
  }
};

export const loadTendersFromStorage = async (): Promise<TenderDocument[]> => {
  try {
    const tenders = await get<TenderDocument[]>(TENDERS_KEY);
    return tenders || [];
  } catch (error) {
    console.error('Error loading tenders:', error);
    return [];
  }
};

export const saveRulesToStorage = async (rules: string) => {
  try {
    await set(RULES_KEY, rules);
  } catch (error) {
    console.error('Error saving rules:', error);
  }
};

export const loadRulesFromStorage = async (defaultRules: string): Promise<string> => {
  try {
    const rules = await get<string>(RULES_KEY);
    return rules || defaultRules;
  } catch (error) {
    return defaultRules;
  }
};
