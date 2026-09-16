export interface MSPeak {
  mz: number;
  intensity: number; // 0 to 100 or raw abundance
  annotation?: string;
  formula?: string;
  neutralLoss?: number;
  matchedSubstructure?: string;
}

export type AdductType = '[M+H]+' | '[M+Na]+' | '[M+K]+' | '[M+NH4]+' | '[M-H]-' | '[M+HCOO]-' | '[M+CH3COO]-';
export type IonMode = 'Positive' | 'Negative';

export interface SpectrumSample {
  id: string;
  name: string;
  groundTruthSmiles: string;
  formula: string;
  exactMass: number;
  precursorMz: number;
  adduct: AdductType;
  ionMode: IonMode;
  collisionEnergy: string;
  retentionTimeSec?: number;
  peaks: MSPeak[];
  chemicalClass: string;
  isNovelScaffold: boolean; // True for out-of-distribution / novel unseen test cases
  challengeDescription: string;
  biologicalContext?: string;
}

export interface PredictionCandidate {
  rank: number;
  smiles: string;
  iupacName?: string;
  molecularFormula: string;
  exactMass: number;
  massErrorPpm: number;
  tanimotoSimilarity: number; // 0.0 to 1.0 (vs ground truth)
  confidenceScore: number; // 0 to 100
  fragmentMatches: {
    mz: number;
    fragmentName: string;
    substructureSmiles?: string;
  }[];
  reasoning: string;
  modelUsed: string;
  isChemicallyValid: boolean;
  unseenFeatureScore: number; // 0 to 100 (how well it handled novel feature generalization)
}

export interface ModelArchitectureInfo {
  id: string;
  name: string;
  badge: string;
  category: 'Deep Transformer' | 'Graph Neural Net' | 'Multimodal LLM' | 'Ensemble';
  description: string;
  encoderType: string;
  decoderType: string;
  novelGeneralizationRating: number; // 1 - 5 stars
  avgLatencyMs: number;
}

export interface BenchmarkMetrics {
  totalEvaluated: number;
  top1Accuracy: number; // Exact SMILES match %
  top3Accuracy: number;
  top5Accuracy: number;
  averageTanimoto: number; // 0 - 1
  knownScaffoldTanimoto: number;
  novelScaffoldTanimoto: number;
  generalizationGap: number; // known - novel (lower is better generalization)
  validSmilesRate: number; // % valid grammar
  meanPpmError: number;
}
