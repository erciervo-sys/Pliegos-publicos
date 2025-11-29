
export enum TenderStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS', // En trámite
  IN_DOUBT = 'IN_DOUBT',       // En duda
  REJECTED = 'REJECTED',       // Descartado
  ARCHIVED = 'ARCHIVED'        // Archivado
}

export interface TenderDocument {
  id: string;
  name: string;
  summaryFile: File | null;
  
  tenderPageUrl?: string;

  adminUrl: string;
  adminFile: File | null;
  
  techUrl: string;
  techFile: File | null;
  
  // New fields for extraction
  budget?: string;
  scoringSystem?: string;
  
  status: TenderStatus;
  aiAnalysis?: AnalysisResult; // Updated to use the complex type
  createdAt: number;
}

export interface BusinessRules {
  content: string;
}

export interface ScoringSubCriterion {
  label: string;
  weight: number; // The points or percentage
  category: 'PRICE' | 'FORMULA' | 'VALUE';
}

export interface AnalysisResult {
  decision: 'KEEP' | 'DISCARD' | 'REVIEW'; // Added REVIEW option
  summaryReasoning: string; // Short summary for the card header
  
  // 1. Economic
  economic: {
    budget: string;
    model: string;
    basis: string;
  };
  
  // 2. Scope
  scope: {
    objective: string;
    deliverables: string[];
  };
  
  // 3. Resources
  resources: {
    duration: string;
    team: string;
    dedication: string;
  };
  
  // 4. Solvency / Blockers
  solvency: {
    certifications: string;
    specificSolvency: string;
    penalties: string;
  };
  
  // 5. Strategy
  strategy: {
    angle: string;
  };

  // 6. Scoring Breakdown (Numeric for visualization)
  scoring: {
    priceWeight: number; // 0-100
    formulaWeight: number; // 0-100 (Automatic formulas other than price)
    valueWeight: number; // 0-100 (Subjective)
    details: string;
    subCriteria: ScoringSubCriterion[]; // Detailed breakdown list
  };
}