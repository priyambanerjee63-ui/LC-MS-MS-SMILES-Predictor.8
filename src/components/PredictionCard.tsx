import React, { useState } from 'react';
import { PredictionCandidate } from '../types';
import { ChemicalStructureViewer } from './ChemicalStructureViewer';
import { Copy, Check, Eye, ShieldCheck, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';

interface PredictionCardProps {
  candidate: PredictionCandidate;
  groundTruthSmiles?: string;
  onHighlightPeak?: (mz: number | null) => void;
  onCompareWithGroundTruth?: () => void;
}

export const PredictionCard: React.FC<PredictionCardProps> = ({
  candidate,
  groundTruthSmiles,
  onHighlightPeak,
  onCompareWithGroundTruth,
}) => {
  const [copied, setCopied] = useState(false);
  const [isExpanded, setIsExpanded] = useState(candidate.rank === 1);

  const copySmiles = () => {
    navigator.clipboard.writeText(candidate.smiles);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Tanimoto color helper
  const getTanimotoBadgeColor = (val: number) => {
    if (val >= 0.85) return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (val >= 0.60) return 'bg-amber-50 text-amber-700 border-amber-200';
    return 'bg-rose-50 text-rose-700 border-rose-200';
  };

  const getRankBadge = (rank: number) => {
    if (rank === 1) return 'bg-indigo-600 text-white';
    if (rank === 2) return 'bg-zinc-700 text-white';
    return 'bg-zinc-500 text-white';
  };

  return (
    <div
      id={`prediction-card-rank-${candidate.rank}`}
      className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
        candidate.rank === 1
          ? 'border-indigo-200 bg-white shadow-sm ring-1 ring-indigo-500/10'
          : 'border-zinc-200 bg-white shadow-xs hover:border-zinc-300'
      }`}
    >
      {/* Header Bar */}
      <div className="p-4 border-b border-zinc-100 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs ${getRankBadge(candidate.rank)}`}>
            #{candidate.rank}
          </span>
          <div>
            <h3 className="text-sm font-semibold text-zinc-900 leading-tight">
              {candidate.iupacName || `Candidate Top-${candidate.rank}`}
            </h3>
            <span className="text-[11px] font-mono text-zinc-500">
              {candidate.molecularFormula} • {candidate.exactMass.toFixed(4)} Da
            </span>
          </div>
        </div>

        {/* Evaluation Badges */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {groundTruthSmiles && (
            <div
              className={`px-2.5 py-1 rounded-full text-xs font-mono font-semibold border flex items-center gap-1 ${getTanimotoBadgeColor(
                candidate.tanimotoSimilarity
              )}`}
              title="Morgan ECFP4 Circular Fingerprint Tanimoto similarity to ground truth"
            >
              <span>Tanimoto:</span>
              <span>{(candidate.tanimotoSimilarity * 100).toFixed(1)}%</span>
            </div>
          )}

          {/* Mass Error (ppm) */}
          <span
            className={`px-2 py-0.5 rounded-full text-xs font-mono font-medium border ${
              candidate.massErrorPpm < 10
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-zinc-100 text-zinc-700 border-zinc-200'
            }`}
          >
            Δ {candidate.massErrorPpm.toFixed(1)} ppm
          </span>

          {/* Generalization score */}
          <span
            className="px-2 py-0.5 rounded-full text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200 flex items-center gap-1"
            title="Generalization score on out-of-distribution / unseen molecular features"
          >
            <Sparkles className="w-3 h-3" />
            Gen: {candidate.unseenFeatureScore}%
          </span>
        </div>
      </div>

      {/* Main Content Layout */}
      <div className="p-4 grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
        {/* Chemical Structure Canvas */}
        <div className="md:col-span-4 flex flex-col items-center justify-center">
          <ChemicalStructureViewer
            smiles={candidate.smiles}
            name={candidate.iupacName}
            width={240}
            height={160}
            showFormula={false}
            showMass={false}
            className="w-full"
          />
        </div>

        {/* SMILES and Cheminformatics details */}
        <div className="md:col-span-8 flex flex-col gap-3">
          {/* SMILES Bar */}
          <div className="flex items-center justify-between gap-2 p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl font-mono text-xs">
            <div className="truncate flex-1 text-zinc-800 font-medium" title={candidate.smiles}>
              <span className="text-zinc-400 select-none mr-1.5">SMILES:</span>
              <span className="text-indigo-950 font-semibold">{candidate.smiles}</span>
            </div>
            <button
              onClick={copySmiles}
              className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-800 hover:bg-zinc-200/70 transition-colors shrink-0"
              title="Copy SMILES string"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>

          {/* AI Reasoning & Spectral Explanation */}
          <div className="text-xs text-zinc-600 bg-zinc-50/50 p-3 rounded-xl border border-zinc-100 leading-relaxed">
            <span className="font-semibold text-zinc-800 block mb-1">
              Structure Elucidation Reasoning:
            </span>
            <p>{candidate.reasoning}</p>
          </div>

          {/* Matched Substructure Fragment Peaks */}
          {candidate.fragmentMatches && candidate.fragmentMatches.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <span className="text-[11px] font-semibold text-zinc-700 uppercase tracking-wide">
                Key Spectral Peaks Explained by this Structure:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {candidate.fragmentMatches.map((frag, idx) => (
                  <button
                    key={`frag-${idx}-${frag.mz}`}
                    onMouseEnter={() => onHighlightPeak && onHighlightPeak(frag.mz)}
                    onMouseLeave={() => onHighlightPeak && onHighlightPeak(null)}
                    className="px-2 py-1 rounded-lg text-[11px] font-mono bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 transition-colors flex items-center gap-1.5"
                    title={`Highlight peak at m/z ${frag.mz} on stick spectrum`}
                  >
                    <span className="font-bold">m/z {frag.mz.toFixed(2)}</span>
                    <span className="text-emerald-600">({frag.fragmentName})</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Action Footer */}
          <div className="flex items-center justify-between pt-1 border-t border-zinc-100 text-xs">
            <div className="flex items-center gap-2 text-zinc-500">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Chemically valid valence & ring closures</span>
            </div>

            {groundTruthSmiles && onCompareWithGroundTruth && (
              <button
                onClick={onCompareWithGroundTruth}
                className="text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1 hover:underline text-xs"
              >
                <Eye className="w-3.5 h-3.5" />
                Inspect vs Ground Truth
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
