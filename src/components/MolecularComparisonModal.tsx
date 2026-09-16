import React from 'react';
import { ChemicalStructureViewer } from './ChemicalStructureViewer';
import { deriveFormulaFromSmiles, calculateTanimotoSimilarity, calculateLevenshteinDistance } from '../utils/cheminformatics';
import { X, CheckCircle2, AlertTriangle, ArrowRight, ShieldCheck } from 'lucide-react';

interface MolecularComparisonModalProps {
  isOpen: boolean;
  onClose: () => void;
  groundTruthSmiles: string;
  predictedSmiles: string;
  sampleName: string;
}

export const MolecularComparisonModal: React.FC<MolecularComparisonModalProps> = ({
  isOpen,
  onClose,
  groundTruthSmiles,
  predictedSmiles,
  sampleName,
}) => {
  if (!isOpen) return null;

  const groundDerived = deriveFormulaFromSmiles(groundTruthSmiles);
  const predDerived = deriveFormulaFromSmiles(predictedSmiles);
  const tanimoto = calculateTanimotoSimilarity(groundTruthSmiles, predictedSmiles);
  const editDistance = calculateLevenshteinDistance(groundTruthSmiles, predictedSmiles);
  const isExactMatch = groundTruthSmiles.trim() === predictedSmiles.trim();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/40 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl border border-zinc-200 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-zinc-100 flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-zinc-900">
              Structural Alignment: Ground Truth vs Predicted SMILES
            </h3>
            <p className="text-xs text-zinc-500">
              Detailed cheminformatics comparison for {sampleName}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Comparison Header Badges */}
        <div className="px-6 py-3 bg-zinc-50 border-b border-zinc-100 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <span className="font-medium text-zinc-600">Metric Alignment:</span>
            <div
              className={`px-3 py-1 rounded-full font-mono font-bold text-xs border flex items-center gap-1.5 ${
                tanimoto >= 0.85
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : tanimoto >= 0.6
                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                  : 'bg-rose-50 text-rose-700 border-rose-200'
              }`}
            >
              <span>Tanimoto Similarity:</span>
              <span>{(tanimoto * 100).toFixed(1)}%</span>
            </div>

            <span className="px-2.5 py-1 rounded-full font-mono bg-zinc-200/80 text-zinc-800 border border-zinc-300">
              Levenshtein Edit Dist: {editDistance}
            </span>
          </div>

          <div>
            {isExactMatch ? (
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-600 text-white flex items-center gap-1 shadow-xs">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Exact 1:1 Chemical Match
              </span>
            ) : (
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                Structural Isomer / Analogue
              </span>
            )}
          </div>
        </div>

        {/* Side-by-side 2D structure layout */}
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Ground Truth Column */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                Ground Truth Reference
              </span>
              <span className="text-[11px] font-mono text-zinc-500">
                {groundDerived.formula}
              </span>
            </div>

            <ChemicalStructureViewer
              smiles={groundTruthSmiles}
              name={`${sampleName} (Reference)`}
              width={300}
              height={200}
              showFormula={false}
              showMass={false}
              className="w-full bg-zinc-50/30"
            />

            <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-xl font-mono text-xs text-zinc-800 break-all select-all">
              <span className="text-zinc-400 block text-[10px] mb-0.5">Reference SMILES:</span>
              {groundTruthSmiles}
            </div>
          </div>

          {/* Predicted Structure Column */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">
                ML Model Top-1 Prediction
              </span>
              <span className="text-[11px] font-mono text-indigo-700">
                {predDerived.formula}
              </span>
            </div>

            <ChemicalStructureViewer
              smiles={predictedSmiles}
              name={`${sampleName} (Predicted)`}
              width={300}
              height={200}
              showFormula={false}
              showMass={false}
              className="w-full border-indigo-200 bg-indigo-50/20"
            />

            <div className="p-3 bg-indigo-50/50 border border-indigo-200 rounded-xl font-mono text-xs text-indigo-950 break-all select-all">
              <span className="text-indigo-400 block text-[10px] mb-0.5">Predicted SMILES:</span>
              {predictedSmiles}
            </div>
          </div>
        </div>

        {/* Physical Property Alignment Table */}
        <div className="px-6 pb-6">
          <h4 className="text-xs font-semibold text-zinc-700 uppercase tracking-wide mb-2">
            Property & Mass Concordance
          </h4>
          <div className="border border-zinc-200 rounded-xl overflow-hidden text-xs">
            <table className="w-full text-left font-mono">
              <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-600 font-medium">
                <tr>
                  <th className="py-2.5 px-4 font-sans">Descriptor</th>
                  <th className="py-2.5 px-4">Ground Truth</th>
                  <th className="py-2.5 px-4 text-indigo-600">Predicted</th>
                  <th className="py-2.5 px-4 font-sans">Agreement</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                <tr>
                  <td className="py-2 px-4 font-sans text-zinc-800">Molecular Formula</td>
                  <td className="py-2 px-4">{groundDerived.formula}</td>
                  <td className="py-2 px-4 text-indigo-600 font-semibold">{predDerived.formula}</td>
                  <td className="py-2 px-4 font-sans">
                    {groundDerived.formula === predDerived.formula ? (
                      <span className="text-emerald-600 font-medium">Exact Match</span>
                    ) : (
                      <span className="text-amber-600">Formula Shift</span>
                    )}
                  </td>
                </tr>
                <tr>
                  <td className="py-2 px-4 font-sans text-zinc-800">Exact Monoisotopic Mass</td>
                  <td className="py-2 px-4">{groundDerived.exactMass.toFixed(4)} Da</td>
                  <td className="py-2 px-4 text-indigo-600 font-semibold">{predDerived.exactMass.toFixed(4)} Da</td>
                  <td className="py-2 px-4 font-sans">
                    {Math.abs(groundDerived.exactMass - predDerived.exactMass) < 0.05 ? (
                      <span className="text-emerald-600 font-medium">
                        &lt; 5 ppm Mass Concordance
                      </span>
                    ) : (
                      <span className="text-amber-600 font-medium">
                        Δ {Math.abs(groundDerived.exactMass - predDerived.exactMass).toFixed(4)} Da
                      </span>
                    )}
                  </td>
                </tr>
                <tr>
                  <td className="py-2 px-4 font-sans text-zinc-800">Morgan ECFP4 Circular Fingerprint</td>
                  <td className="py-2 px-4">1024-bit representation</td>
                  <td className="py-2 px-4 text-indigo-600">1024-bit representation</td>
                  <td className="py-2 px-4 font-sans">
                    <span className="font-bold text-emerald-700">
                      {(tanimoto * 100).toFixed(1)}% Subgraph Overlap
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-zinc-50 border-t border-zinc-100 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-medium bg-zinc-900 text-white hover:bg-zinc-800 transition-colors"
          >
            Close Comparison
          </button>
        </div>
      </div>
    </div>
  );
};
