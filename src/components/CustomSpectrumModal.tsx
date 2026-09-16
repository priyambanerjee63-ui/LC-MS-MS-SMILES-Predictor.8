import React, { useState } from 'react';
import { SpectrumSample, AdductType, IonMode, MSPeak } from '../types';
import { X, Upload, FileText, Sparkles, Check, AlertCircle } from 'lucide-react';

interface CustomSpectrumModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (newSample: SpectrumSample) => void;
}

export const CustomSpectrumModal: React.FC<CustomSpectrumModalProps> = ({
  isOpen,
  onClose,
  onImport,
}) => {
  const [sampleName, setSampleName] = useState('Custom LC-MS/MS Sample');
  const [precursorMz, setPrecursorMz] = useState('207.1379');
  const [adduct, setAdduct] = useState<AdductType>('[M+H]+');
  const [ionMode, setIonMode] = useState<IonMode>('Positive');
  const [collisionEnergy, setCollisionEnergy] = useState('30 eV');
  const [isNovelScaffold, setIsNovelScaffold] = useState(false);
  const [groundTruthSmiles, setGroundTruthSmiles] = useState('');
  const [peakText, setPeakText] = useState(
`207.1379 35.0
161.1325 100.0
119.0855 48.0
105.0699 29.5
91.0542 34.0`
  );
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleParseAndSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const pMz = parseFloat(precursorMz);
    if (isNaN(pMz) || pMz <= 0) {
      setError('Please provide a valid numeric Precursor m/z value.');
      return;
    }

    const lines = peakText.trim().split('\n');
    const parsedPeaks: MSPeak[] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;

      // Handle space, tab, or comma separated m/z and intensity
      const parts = trimmed.split(/[\s,;:]+/);
      if (parts.length >= 2) {
        const mz = parseFloat(parts[0]);
        const intensity = parseFloat(parts[1]);
        if (!isNaN(mz) && !isNaN(intensity)) {
          parsedPeaks.push({
            mz,
            intensity,
            neutralLoss: pMz > mz ? Number((pMz - mz).toFixed(4)) : 0,
            annotation: parts.slice(2).join(' ') || undefined,
          });
        }
      }
    }

    if (parsedPeaks.length === 0) {
      setError('Could not parse any valid spectral peaks. Format: m/z intensity on each line.');
      return;
    }

    // Normalize intensity so max peak = 100%
    const maxInt = Math.max(...parsedPeaks.map(p => p.intensity));
    if (maxInt > 0) {
      parsedPeaks.forEach(p => {
        p.intensity = Number(((p.intensity / maxInt) * 100).toFixed(1));
      });
    }

    const newSample: SpectrumSample = {
      id: `custom_${Date.now()}`,
      name: sampleName.trim() || 'Custom Sample',
      groundTruthSmiles: groundTruthSmiles.trim(),
      formula: 'Unknown',
      exactMass: pMz - 1.0073,
      precursorMz: pMz,
      adduct,
      ionMode,
      collisionEnergy,
      peaks: parsedPeaks,
      chemicalClass: isNovelScaffold ? 'Novel Unseen Class' : 'User Imported Spectrum',
      isNovelScaffold,
      challengeDescription: 'User-provided custom LC-MS/MS peak spectrum for de novo SMILES prediction.',
    };

    onImport(newSample);
    onClose();
  };

  // Preset loaders
  const loadPreset = (type: 'quercetin' | 'spiro' | 'aspirin') => {
    if (type === 'quercetin') {
      setSampleName('Quercetin Flavonoid');
      setPrecursorMz('303.0499');
      setAdduct('[M+H]+');
      setCollisionEnergy('35 eV');
      setIsNovelScaffold(false);
      setGroundTruthSmiles('O=C1C(O)=C(c2ccc(O)c(O)c2)Oc3cc(O)cc(O)c13');
      setPeakText(`303.0499 100.0 Precursor
285.0394 18.2 -H2O
153.0182 65.8 RDA A-ring
137.0233 48.3 RDA B-ring`);
    } else if (type === 'spiro') {
      setSampleName('Fluorinated Spiro-Oxindole');
      setPrecursorMz('297.1398');
      setAdduct('[M+H]+');
      setCollisionEnergy('35 eV');
      setIsNovelScaffold(true);
      setGroundTruthSmiles('O=C1Nc2ccccc2C12CCN(CC2)c3ccc(F)cc3');
      setPeakText(`297.1398 58.0 Precursor
178.0898 100.0 Fluorophenyl-piperideinium
136.0428 45.0 Benzylamine fragment
95.0292 22.0 Fluorobenzene cation`);
    } else {
      setSampleName('Acetylsalicylic Acid (Aspirin)');
      setPrecursorMz('181.0495');
      setAdduct('[M+H]+');
      setCollisionEnergy('20 eV');
      setIsNovelScaffold(false);
      setGroundTruthSmiles('CC(=O)Oc1ccccc1C(=O)O');
      setPeakText(`181.0495 25.0 Precursor
139.0389 100.0 Loss of ketene (-42 Da)
121.0284 68.0 Loss of acetic acid (-60 Da)
93.0335 32.0 Phenol cation`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/40 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl border border-zinc-200 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-zinc-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-indigo-600" />
            <div>
              <h3 className="text-base font-semibold text-zinc-900">
                Import Custom LC-MS/MS Spectrum
              </h3>
              <p className="text-xs text-zinc-500">
                Enter precursor parameters and fragment peak list for prediction
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Presets */}
        <div className="px-4 py-2.5 bg-zinc-50 border-b border-zinc-100 flex items-center gap-2 text-xs">
          <span className="text-zinc-500 font-medium">Quick Presets:</span>
          <button
            type="button"
            onClick={() => loadPreset('aspirin')}
            className="px-2 py-1 rounded bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-100 transition-colors"
          >
            Aspirin
          </button>
          <button
            type="button"
            onClick={() => loadPreset('quercetin')}
            className="px-2 py-1 rounded bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-100 transition-colors"
          >
            Quercetin
          </button>
          <button
            type="button"
            onClick={() => loadPreset('spiro')}
            className="px-2 py-1 rounded bg-purple-50 border border-purple-200 text-purple-700 hover:bg-purple-100 transition-colors flex items-center gap-1"
          >
            <Sparkles className="w-3 h-3" />
            Novel Spiro Scaffold
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleParseAndSubmit} className="p-4 flex flex-col gap-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-zinc-700 block mb-1">
                Sample / Molecule Name
              </label>
              <input
                type="text"
                value={sampleName}
                onChange={e => setSampleName(e.target.value)}
                placeholder="e.g. Kaempferol Analogue"
                className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-xs text-zinc-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-zinc-700 block mb-1">
                Precursor m/z (accurate mass)
              </label>
              <input
                type="number"
                step="0.0001"
                value={precursorMz}
                onChange={e => setPrecursorMz(e.target.value)}
                placeholder="e.g. 195.0877"
                required
                className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-xs font-mono text-zinc-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-zinc-700 block mb-1">
                Ion Adduct
              </label>
              <select
                value={adduct}
                onChange={e => setAdduct(e.target.value as AdductType)}
                className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-xs text-zinc-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              >
                <option value="[M+H]+">[M+H]+ (Protonated, +1.0073)</option>
                <option value="[M+Na]+">[M+Na]+ (Sodiated, +22.9892)</option>
                <option value="[M+K]+">[M+K]+ (Potassiated, +38.9632)</option>
                <option value="[M+NH4]+">[M+NH4]+ (Ammonium, +18.0338)</option>
                <option value="[M-H]-">[M-H]- (Deprotonated, -1.0073)</option>
                <option value="[M+HCOO]-">[M+HCOO]- (Formate adduct, +44.9982)</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-zinc-700 block mb-1">
                Collision Energy
              </label>
              <input
                type="text"
                value={collisionEnergy}
                onChange={e => setCollisionEnergy(e.target.value)}
                placeholder="e.g. 30 eV or Stepped"
                className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-xs text-zinc-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Novel Scaffold toggle */}
          <div className="flex items-center gap-2 p-3 bg-purple-50/60 rounded-xl border border-purple-200/80">
            <input
              type="checkbox"
              id="novel-scaffold-toggle"
              checked={isNovelScaffold}
              onChange={e => setIsNovelScaffold(e.target.checked)}
              className="accent-purple-600 rounded cursor-pointer w-4 h-4"
            />
            <label htmlFor="novel-scaffold-toggle" className="text-xs text-purple-950 font-medium cursor-pointer">
              Tag as Unseen / Novel Scaffold (Challenge ML Generalization)
            </label>
          </div>

          {/* Optional Ground Truth SMILES */}
          <div>
            <label className="text-xs font-semibold text-zinc-700 block mb-1">
              Optional Ground Truth SMILES (for benchmarking & Tanimoto score)
            </label>
            <input
              type="text"
              value={groundTruthSmiles}
              onChange={e => setGroundTruthSmiles(e.target.value)}
              placeholder="e.g. CC(=O)Oc1ccccc1C(=O)O"
              className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-xs font-mono text-zinc-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>

          {/* Peak List Input */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-zinc-700">
                MS/MS Peak List (m/z & intensity per line)
              </label>
              <span className="text-[11px] text-zinc-400">
                Format: <code className="font-mono">mz intensity [annotation]</code>
              </span>
            </div>
            <textarea
              rows={6}
              value={peakText}
              onChange={e => setPeakText(e.target.value)}
              placeholder={`195.0877 100.0 Precursor\n138.0662 84.5 Fragment`}
              className="w-full px-3 py-2 rounded-xl border border-zinc-200 font-mono text-xs text-zinc-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>

          {/* Submit */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-zinc-600 hover:bg-zinc-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl text-xs font-medium bg-indigo-600 text-white hover:bg-indigo-700 transition-colors shadow-xs flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>Import & Run Prediction</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
