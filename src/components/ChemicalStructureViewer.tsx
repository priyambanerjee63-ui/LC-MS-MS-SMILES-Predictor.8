import React, { useEffect, useRef, useState } from 'react';
import SmilesDrawer from 'smiles-drawer';
import { deriveFormulaFromSmiles } from '../utils/cheminformatics';
import { Copy, Check, FlaskConical, AlertCircle } from 'lucide-react';

interface ChemicalStructureViewerProps {
  smiles: string;
  name?: string;
  width?: number;
  height?: number;
  showFormula?: boolean;
  showMass?: boolean;
  highlightScaffold?: boolean;
  className?: string;
  compact?: boolean;
}

export const ChemicalStructureViewer: React.FC<ChemicalStructureViewerProps> = ({
  smiles,
  name,
  width = 280,
  height = 180,
  showFormula = true,
  showMass = true,
  highlightScaffold = false,
  className = '',
  compact = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hasError, setHasError] = useState(false);
  const [copied, setCopied] = useState(false);
  const [molInfo, setMolInfo] = useState({ formula: '', exactMass: 0 });

  useEffect(() => {
    if (!smiles) {
      setHasError(true);
      return;
    }

    try {
      const derived = deriveFormulaFromSmiles(smiles);
      setMolInfo({ formula: derived.formula, exactMass: derived.exactMass });
    } catch {
      // ignore
    }

    if (!canvasRef.current) return;

    try {
      const canvas = canvasRef.current;
      const drawer = new (SmilesDrawer as any).Drawer({
        width: width,
        height: height,
        bondThickness: 1.5,
        bondLength: 16,
        shortBondLength: 0.8,
        bondSpacing: 0.18 * 16,
        atomVisualization: 'default',
        isomeric: true,
        debug: false,
        terminalCarbons: false,
        explicitHydrogens: false,
        overlapSensitivity: 0.42,
        compactDrawing: compact,
        fontSizeLarge: 7,
        fontSizeSmall: 5,
        padding: 14,
        themes: {
          light: {
            C: '#27272a',
            O: '#dc2626',
            N: '#2563eb',
            F: '#0d9488',
            Cl: '#16a34a',
            Br: '#991b1b',
            I: '#7c3aed',
            P: '#ea580c',
            S: '#d97706',
            B: '#ca8a04',
            H: '#71717a',
            BACKGROUND: '#ffffff',
          },
        },
      });

      // Clear previous canvas drawing
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, width, height);
      }

      (SmilesDrawer as any).parse(
        smiles,
        (tree: any) => {
          setHasError(false);
          drawer.draw(tree, canvas, 'light', false);
        },
        (err: any) => {
          console.warn('Smiles parse error for:', smiles, err);
          setHasError(true);
        }
      );
    } catch (e) {
      console.warn('Drawing error:', e);
      setHasError(true);
    }
  }, [smiles, width, height, compact]);

  const copySmiles = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(smiles);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      id={`chem-viewer-${Math.abs(smiles.split('').reduce((a, b) => (a << 5) - a + b.charCodeAt(0), 0))}`}
      className={`relative rounded-xl border border-zinc-200 bg-white shadow-xs overflow-hidden flex flex-col items-center transition-all hover:border-zinc-300 ${className}`}
    >
      {/* Header Info */}
      {(name || showFormula) && (
        <div className="w-full px-3 py-1.5 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/70 text-xs">
          <div className="flex items-center gap-1.5 min-w-0">
            <FlaskConical className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
            <span className="font-medium text-zinc-800 truncate" title={name || molInfo.formula}>
              {name || molInfo.formula || 'Structure'}
            </span>
          </div>
          <button
            onClick={copySmiles}
            title="Copy SMILES to clipboard"
            className="p-1 rounded text-zinc-400 hover:text-zinc-700 hover:bg-zinc-200/60 transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </div>
      )}

      {/* Canvas 2D Structure */}
      <div className="relative flex items-center justify-center p-2 w-full min-h-[120px] bg-white">
        {hasError ? (
          <div className="flex flex-col items-center justify-center text-center p-4 text-zinc-400">
            <AlertCircle className="w-7 h-7 text-amber-500 mb-1" />
            <span className="text-xs font-mono text-zinc-600 break-all max-w-[200px]">{smiles}</span>
            <span className="text-[11px] text-zinc-400 mt-1">2D layout unavailable</span>
          </div>
        ) : (
          <canvas
            ref={canvasRef}
            width={width}
            height={height}
            className="max-w-full h-auto object-contain select-none"
          />
        )}

        {highlightScaffold && (
          <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded text-[10px] font-medium bg-purple-50 text-purple-700 border border-purple-200">
            Novel Scaffold
          </div>
        )}
      </div>

      {/* Footer Details: Formula and Mass */}
      {(showFormula || showMass) && molInfo.formula && (
        <div className="w-full px-3 py-1.5 border-t border-zinc-100 bg-zinc-50/50 flex items-center justify-between text-[11px] text-zinc-500 font-mono">
          <span>{molInfo.formula}</span>
          <span>{molInfo.exactMass.toFixed(4)} Da</span>
        </div>
      )}
    </div>
  );
};
