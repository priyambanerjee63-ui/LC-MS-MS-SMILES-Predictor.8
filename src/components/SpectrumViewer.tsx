import React, { useState, useMemo, useRef } from 'react';
import { MSPeak, AdductType } from '../types';
import { identifyNeutralLoss } from '../utils/cheminformatics';
import { ZoomIn, ZoomOut, RotateCcw, Filter, Eye, Sparkles } from 'lucide-react';

interface SpectrumViewerProps {
  peaks: MSPeak[];
  precursorMz: number;
  adduct: AdductType;
  collisionEnergy: string;
  sampleName: string;
  highlightedMz?: number | null;
  onPeakSelect?: (peak: MSPeak) => void;
  matchedPeakMzs?: number[];
  className?: string;
}

export const SpectrumViewer: React.FC<SpectrumViewerProps> = ({
  peaks,
  precursorMz,
  adduct,
  collisionEnergy,
  sampleName,
  highlightedMz,
  onPeakSelect,
  matchedPeakMzs = [],
  className = '',
}) => {
  const [minIntensity, setMinIntensity] = useState<number>(2); // filter noise < 2%
  const [showNeutralLosses, setShowNeutralLosses] = useState<boolean>(true);
  const [hoveredPeak, setHoveredPeak] = useState<MSPeak | null>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);
  const [zoomRange, setZoomRange] = useState<{ minMz: number; maxMz: number } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  // Filter peaks by minimum threshold
  const filteredPeaks = useMemo(() => {
    return peaks.filter(p => p.intensity >= minIntensity);
  }, [peaks, minIntensity]);

  // Compute m/z bounds
  const { minMz, maxMz, maxIntensity } = useMemo(() => {
    if (filteredPeaks.length === 0) {
      return { minMz: 0, maxMz: 500, maxIntensity: 100 };
    }
    const allMzs = [...filteredPeaks.map(p => p.mz), precursorMz];
    const rawMin = Math.min(...allMzs);
    const rawMax = Math.max(...allMzs);
    const pad = Math.max(15, (rawMax - rawMin) * 0.08);

    const baseMin = Math.max(0, Math.floor(rawMin - pad));
    const baseMax = Math.ceil(rawMax + pad);

    return {
      minMz: zoomRange ? zoomRange.minMz : baseMin,
      maxMz: zoomRange ? zoomRange.maxMz : baseMax,
      maxIntensity: 105, // normalize to 100% with top headroom
    };
  }, [filteredPeaks, precursorMz, zoomRange]);

  // SVG coordinate dimensions
  const svgWidth = 740;
  const svgHeight = 320;
  const padLeft = 56;
  const padRight = 32;
  const padTop = 38;
  const padBottom = 48;

  const chartWidth = svgWidth - padLeft - padRight;
  const chartHeight = svgHeight - padTop - padBottom;

  const mzToX = (mz: number) => {
    if (maxMz <= minMz) return padLeft;
    return padLeft + ((mz - minMz) / (maxMz - minMz)) * chartWidth;
  };

  const intensityToY = (intensity: number) => {
    const clamped = Math.max(0, Math.min(intensity, 100));
    return padTop + chartHeight - (clamped / 100) * chartHeight;
  };

  // Generate X ticks
  const xTicks = useMemo(() => {
    const span = maxMz - minMz;
    let step = 50;
    if (span <= 50) step = 10;
    else if (span <= 120) step = 20;
    else if (span <= 300) step = 50;
    else step = 100;

    const ticks: number[] = [];
    const start = Math.ceil(minMz / step) * step;
    for (let mz = start; mz <= maxMz; mz += step) {
      ticks.push(mz);
    }
    return ticks;
  }, [minMz, maxMz]);

  // Generate Y ticks
  const yTicks = [0, 25, 50, 75, 100];

  const handleZoom = (direction: 'in' | 'out') => {
    const currentSpan = maxMz - minMz;
    const center = (maxMz + minMz) / 2;
    const factor = direction === 'in' ? 0.7 : 1.4;
    const newSpan = currentSpan * factor;
    setZoomRange({
      minMz: Math.max(0, Math.round(center - newSpan / 2)),
      maxMz: Math.round(center + newSpan / 2),
    });
  };

  const resetZoom = () => {
    setZoomRange(null);
  };

  return (
    <div
      id="lcms-spectrum-viewer"
      ref={containerRef}
      className={`bg-white rounded-2xl border border-zinc-200 shadow-xs p-4 flex flex-col gap-3 ${className}`}
    >
      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-100 pb-3">
        <div className="flex items-center gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-zinc-900">{sampleName}</h2>
              <span className="px-2 py-0.5 rounded-full text-xs font-mono font-medium bg-indigo-50 text-indigo-700 border border-indigo-200">
                Precursor m/z {precursorMz.toFixed(4)} ({adduct})
              </span>
              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-zinc-100 text-zinc-700">
                CE: {collisionEnergy}
              </span>
            </div>
            <p className="text-xs text-zinc-500 mt-0.5">
              MS/MS Stick Spectrum • {filteredPeaks.length} peaks displayed
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* Neutral loss toggle */}
          <button
            onClick={() => setShowNeutralLosses(!showNeutralLosses)}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors border ${
              showNeutralLosses
                ? 'bg-amber-50 text-amber-800 border-amber-200'
                : 'bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-50'
            }`}
            title="Toggle diagnostic neutral loss annotations (e.g. -H2O, -CO, -CO2)"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Neutral Losses
          </button>

          {/* Noise threshold slider */}
          <div className="flex items-center gap-1.5 bg-zinc-50 border border-zinc-200 rounded-lg px-2.5 py-1 text-xs text-zinc-600">
            <Filter className="w-3 h-3 text-zinc-400" />
            <span>Min Int:</span>
            <input
              type="range"
              min="0"
              max="20"
              step="1"
              value={minIntensity}
              onChange={e => setMinIntensity(Number(e.target.value))}
              className="w-16 accent-indigo-600 cursor-pointer"
            />
            <span className="font-mono w-6 text-right">{minIntensity}%</span>
          </div>

          {/* Zoom controls */}
          <div className="flex items-center border border-zinc-200 rounded-lg overflow-hidden bg-white">
            <button
              onClick={() => handleZoom('in')}
              className="p-1.5 hover:bg-zinc-100 text-zinc-600 transition-colors"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => handleZoom('out')}
              className="p-1.5 hover:bg-zinc-100 text-zinc-600 border-l border-zinc-200 transition-colors"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            {zoomRange && (
              <button
                onClick={resetZoom}
                className="p-1.5 hover:bg-zinc-100 text-zinc-600 border-l border-zinc-200 transition-colors"
                title="Reset Zoom"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Interactive SVG Canvas */}
      <div className="relative w-full overflow-hidden bg-zinc-950/2 rounded-xl border border-zinc-100">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-auto select-none"
          onMouseMove={e => {
            if (!containerRef.current) return;
            const rect = containerRef.current.getBoundingClientRect();
            setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
          }}
          onMouseLeave={() => {
            setHoveredPeak(null);
            setMousePos(null);
          }}
        >
          {/* Subtle Grid Lines */}
          {yTicks.map(tick => {
            const y = intensityToY(tick);
            return (
              <g key={`y-grid-${tick}`}>
                <line
                  x1={padLeft}
                  y1={y}
                  x2={svgWidth - padRight}
                  y2={y}
                  stroke={tick === 0 ? '#71717a' : '#e4e4e7'}
                  strokeWidth={tick === 0 ? 1.5 : 0.8}
                  strokeDasharray={tick === 0 ? undefined : '3 3'}
                />
                <text
                  x={padLeft - 8}
                  y={y + 3.5}
                  textAnchor="end"
                  className="text-[10px] fill-zinc-400 font-mono font-medium"
                >
                  {tick}%
                </text>
              </g>
            );
          })}

          {xTicks.map(mz => {
            const x = mzToX(mz);
            return (
              <g key={`x-grid-${mz}`}>
                <line
                  x1={x}
                  y1={padTop}
                  x2={x}
                  y2={padTop + chartHeight}
                  stroke="#f4f4f5"
                  strokeWidth={0.8}
                />
                <line
                  x1={x}
                  y1={padTop + chartHeight}
                  x2={x}
                  y2={padTop + chartHeight + 5}
                  stroke="#71717a"
                  strokeWidth={1}
                />
                <text
                  x={x}
                  y={padTop + chartHeight + 18}
                  textAnchor="middle"
                  className="text-[10px] fill-zinc-500 font-mono font-medium"
                >
                  {mz}
                </text>
              </g>
            );
          })}

          {/* X Axis Label */}
          <text
            x={padLeft + chartWidth / 2}
            y={svgHeight - 8}
            textAnchor="middle"
            className="text-xs fill-zinc-600 font-medium"
          >
            Mass-to-charge ratio (m/z)
          </text>

          {/* Y Axis Label */}
          <text
            x={-(padTop + chartHeight / 2)}
            y={16}
            transform="rotate(-90)"
            textAnchor="middle"
            className="text-xs fill-zinc-600 font-medium"
          >
            Relative Abundance (%)
          </text>

          {/* Neutral Loss Connectors / Arcs */}
          {showNeutralLosses &&
            filteredPeaks
              .filter(p => p.mz < precursorMz && p.intensity > 18)
              .slice(0, 3)
              .map(p => {
                const x1 = mzToX(p.mz);
                const x2 = mzToX(precursorMz);
                const yTop = Math.min(intensityToY(p.intensity), intensityToY(100)) - 14;
                const loss = identifyNeutralLoss(precursorMz, p.mz);

                return (
                  <g key={`loss-${p.mz}`}>
                    <path
                      d={`M ${x1} ${intensityToY(p.intensity) - 6} Q ${(x1 + x2) / 2} ${yTop - 12} ${x2} ${intensityToY(100) - 6}`}
                      fill="none"
                      stroke="#f59e0b"
                      strokeWidth={1.2}
                      strokeDasharray="3 2"
                      opacity={0.7}
                    />
                    <rect
                      x={(x1 + x2) / 2 - 28}
                      y={yTop - 22}
                      width={56}
                      height={14}
                      rx={3}
                      fill="#fffbeb"
                      stroke="#fde68a"
                      strokeWidth={0.8}
                    />
                    <text
                      x={(x1 + x2) / 2}
                      y={yTop - 12}
                      textAnchor="middle"
                      className="text-[9px] fill-amber-800 font-mono font-medium"
                    >
                      {loss.annotation ? loss.annotation.split(' ')[0] : `-${loss.delta} Da`}
                    </text>
                  </g>
                );
              })}

          {/* Peak Sticks */}
          {filteredPeaks.map((peak, idx) => {
            const x = mzToX(peak.mz);
            const y = intensityToY(peak.intensity);
            const baselineY = padTop + chartHeight;

            const isPrecursor = Math.abs(peak.mz - precursorMz) < 0.1;
            const isHighlighted = highlightedMz && Math.abs(peak.mz - highlightedMz) < 0.1;
            const isMatched = matchedPeakMzs.some(m => Math.abs(m - peak.mz) < 0.1);
            const isHovered = hoveredPeak?.mz === peak.mz;

            // Pick color scheme
            let strokeColor = '#2563eb'; // standard peak: blue
            let strokeWidth = 2.0;

            if (isPrecursor) {
              strokeColor = '#4f46e5'; // indigo
              strokeWidth = 2.5;
            }
            if (isMatched) {
              strokeColor = '#10b981'; // matched fragment: emerald green
              strokeWidth = 2.5;
            }
            if (isHighlighted || isHovered) {
              strokeColor = '#ea580c'; // active hover: orange
              strokeWidth = 3.0;
            }

            // Show text labels on prominent peaks (intensity > 18% or highlighted or precursor)
            const showLabel = peak.intensity >= 16 || isPrecursor || isHighlighted || isMatched || isHovered;

            return (
              <g
                key={`peak-${idx}-${peak.mz}`}
                className="cursor-pointer group"
                onMouseEnter={() => {
                  setHoveredPeak(peak);
                  if (onPeakSelect) onPeakSelect(peak);
                }}
                onClick={() => onPeakSelect && onPeakSelect(peak)}
              >
                {/* Wider invisible hit area for easy hover on thin sticks */}
                <line
                  x1={x}
                  y1={y - 8}
                  x2={x}
                  y2={baselineY}
                  stroke="transparent"
                  strokeWidth={14}
                />

                {/* Visible Peak Stick */}
                <line
                  x1={x}
                  y1={y}
                  x2={x}
                  y2={baselineY}
                  stroke={strokeColor}
                  strokeWidth={strokeWidth}
                  strokeLinecap="round"
                />

                {/* Peak head marker */}
                <circle
                  cx={x}
                  cy={y}
                  r={isHovered || isHighlighted ? 4 : 2.5}
                  fill={strokeColor}
                />

                {/* Peak m/z label */}
                {showLabel && (
                  <text
                    x={x}
                    y={y - 7}
                    textAnchor="middle"
                    className={`text-[9.5px] font-mono font-medium transition-all ${
                      isHighlighted || isHovered
                        ? 'fill-orange-600 font-bold'
                        : isMatched
                        ? 'fill-emerald-700 font-semibold'
                        : isPrecursor
                        ? 'fill-indigo-700 font-semibold'
                        : 'fill-zinc-600'
                    }`}
                  >
                    {peak.mz.toFixed(2)}
                  </text>
                )}
              </g>
            );
          })}
        </svg>

        {/* Hover Tooltip Card */}
        {hoveredPeak && (
          <div
            className="absolute pointer-events-none z-20 bg-zinc-900/95 backdrop-blur-xs text-white px-3 py-2 rounded-lg shadow-xl text-xs flex flex-col gap-1 border border-zinc-700"
            style={{
              left: Math.min(Math.max(12, (mousePos?.x || 200) - 80), svgWidth - 180),
              top: Math.max(12, (mousePos?.y || 100) - 75),
            }}
          >
            <div className="flex items-center justify-between gap-3 border-b border-zinc-700 pb-1">
              <span className="font-mono font-bold text-amber-300">
                m/z {hoveredPeak.mz.toFixed(4)}
              </span>
              <span className="text-zinc-300 font-mono">
                {hoveredPeak.intensity.toFixed(1)}% rel. int.
              </span>
            </div>
            {hoveredPeak.annotation && (
              <div className="text-zinc-200 text-[11px]">
                {hoveredPeak.annotation}
              </div>
            )}
            {hoveredPeak.formula && (
              <div className="text-emerald-400 font-mono text-[10px]">
                Formula: [{hoveredPeak.formula}]
              </div>
            )}
            {hoveredPeak.mz < precursorMz && (
              <div className="text-amber-400 font-mono text-[10px]">
                Δ Loss: {(precursorMz - hoveredPeak.mz).toFixed(2)} Da from [M+H]+
              </div>
            )}
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center justify-between text-xs text-zinc-500 pt-1">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 inline-block" />
            Precursor Ion
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-600 inline-block" />
            MS/MS Fragments
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
            Substructure Match
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
            Diagnostic Neutral Loss
          </span>
        </div>
        <span className="text-[11px] text-zinc-400">
          Hover peaks for accurate m/z & fragment assignments
        </span>
      </div>
    </div>
  );
};
