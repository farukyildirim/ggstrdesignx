import React from 'react';
import { GasSpringParams, CalculationResult } from '../types/cad';
import { Printer, X, Download } from 'lucide-react';

interface TechnicalDrawing2DProps {
  params: GasSpringParams;
  calc: CalculationResult;
  isOpen: boolean;
  onClose: () => void;
}

export const TechnicalDrawing2D: React.FC<TechnicalDrawing2DProps> = ({
  params,
  calc,
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadSvg = () => {
    const svgElem = document.getElementById('cad-drawing-svg');
    if (!svgElem) return;
    const serializer = new XMLSerializer();
    const source = serializer.serializeToString(svgElem);
    const blob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${calc.partNumber}_2D_Drawing.svg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/70">
          <div>
            <h3 className="text-base font-semibold text-slate-100 flex items-center gap-2">
              <span>📐</span> 2D İmalat Teknik Resmi & Ölçü Sayfası
            </h3>
            <span className="text-xs font-mono text-cyan-400">{calc.partNumber}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadSvg}
              className="px-3 py-1.5 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 transition-colors flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>SVG İndir</span>
            </button>
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors flex items-center gap-1.5"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Yazdır / PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body: CAD Blueprint Drawing */}
        <div className="p-6 overflow-auto flex-1 bg-slate-950 flex flex-col items-center justify-center">
          <div className="w-full max-w-3xl bg-[#0a1120] border-2 border-[#1e3a8a] rounded-lg p-6 relative shadow-inner">
            <svg
              id="cad-drawing-svg"
              viewBox="0 0 800 320"
              className="w-full h-auto"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Background Grid */}
              <defs>
                <pattern id="cadGrid" width="20" height="20" patternUnits="userSpaceOnUse">
                  <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#1e293b" strokeWidth="0.5" />
                </pattern>
              </defs>
              <rect width="800" height="320" fill="url(#cadGrid)" />

              {/* Title Block Box (Standard ISO Drawing Border) */}
              <rect x="5" y="5" width="790" height="310" fill="none" stroke="#2563eb" strokeWidth="1.5" />
              <rect x="560" y="240" width="235" height="75" fill="#0f172a" stroke="#2563eb" strokeWidth="1" />
              <text x="570" y="258" fill="#94a3b8" fontSize="10" fontFamily="sans-serif">PARÇA NO:</text>
              <text x="570" y="274" fill="#38bdf8" fontSize="11" fontFamily="monospace" fontWeight="bold">{calc.partNumber}</text>
              <text x="570" y="292" fill="#94a3b8" fontSize="10" fontFamily="sans-serif">ÖLÇEK: 1:2 · TOLERANS: ISO 2768-m</text>
              <text x="570" y="306" fill="#34d399" fontSize="10" fontFamily="sans-serif">F1 = {params.forceN} N | P = {calc.requiredPressureBar.toFixed(1)} Bar</text>

              {/* Center Line Axis */}
              <line x1="40" y1="140" x2="760" y2="140" stroke="#ef4444" strokeWidth="1" strokeDasharray="16,4,4,4" />

              {/* TUBE END FITTING (Left) */}
              <g transform="translate(60, 140)">
                <circle cx="0" cy="0" r="16" fill="#1e3a8a" stroke="#60a5fa" strokeWidth="1.5" />
                <circle cx="0" cy="0" r="5" fill="#0a1120" stroke="#93c5fd" strokeWidth="1" />
                <rect x="0" y="-10" width="25" height="20" fill="#1e3a8a" stroke="#60a5fa" strokeWidth="1.5" />
              </g>

              {/* OUTER TUBE (Black Body) */}
              <rect
                x="85"
                y={140 - (params.tubeOd * 1.5)}
                width="340"
                height={params.tubeOd * 3}
                fill="#18181b"
                stroke="#64748b"
                strokeWidth="1.5"
                rx="2"
              />
              <text x="255" y="144" fill="#cbd5e1" fontSize="11" textAnchor="middle" fontFamily="monospace">
                TÜP Ø{params.tubeOd} mm (L_tüp: {calc.tubeHeight.toFixed(0)}mm)
              </text>

              {/* PISTON ROD (Chrome) */}
              <rect
                x="425"
                y={140 - (params.rodOd * 1.5)}
                width="240"
                height={params.rodOd * 3}
                fill="#e2e8f0"
                stroke="#94a3b8"
                strokeWidth="1.5"
              />
              <text x="545" y="144" fill="#0f172a" fontSize="10" textAnchor="middle" fontFamily="monospace" fontWeight="bold">
                MİL Ø{params.rodOd} mm
              </text>

              {/* ROD END FITTING (Right) */}
              <g transform="translate(685, 140)">
                <rect x="-20" y="-10" width="20" height="20" fill="#1e3a8a" stroke="#60a5fa" strokeWidth="1.5" />
                <circle cx="0" cy="0" r="16" fill="#1e3a8a" stroke="#60a5fa" strokeWidth="1.5" />
                <circle cx="0" cy="0" r="5" fill="#0a1120" stroke="#93c5fd" strokeWidth="1" />
              </g>

              {/* DIMENSIONS */}
              {/* Full Extended Length (L) Dimension Line */}
              <line x1="60" y1="50" x2="685" y2="50" stroke="#38bdf8" strokeWidth="1.5" />
              <line x1="60" y1="42" x2="60" y2="120" stroke="#38bdf8" strokeWidth="0.8" strokeDasharray="3,3" />
              <line x1="685" y1="42" x2="685" y2="120" stroke="#38bdf8" strokeWidth="0.8" strokeDasharray="3,3" />
              {/* Arrows */}
              <polygon points="60,50 72,46 72,54" fill="#38bdf8" />
              <polygon points="685,50 673,46 673,54" fill="#38bdf8" />
              <text x="372" y="44" fill="#38bdf8" fontSize="12" textAnchor="middle" fontFamily="monospace" fontWeight="bold">
                AÇIK BOY L = {params.extLength} ± 2 mm (Merkezden Merkeze)
              </text>

              {/* Stroke (S) Dimension Line */}
              <line x1="425" y1="80" x2="665" y2="80" stroke="#34d399" strokeWidth="1.5" />
              <line x1="425" y1="72" x2="425" y2="120" stroke="#34d399" strokeWidth="0.8" strokeDasharray="3,3" />
              <line x1="665" y1="72" x2="665" y2="120" stroke="#34d399" strokeWidth="0.8" strokeDasharray="3,3" />
              <polygon points="425,80 437,76 437,84" fill="#34d399" />
              <polygon points="665,80 653,76 653,84" fill="#34d399" />
              <text x="545" y="75" fill="#34d399" fontSize="11" textAnchor="middle" fontFamily="monospace" fontWeight="bold">
                STROK S = {params.stroke} mm
              </text>

              {/* Closed Length Dimension */}
              <text x="372" y="225" fill="#94a3b8" fontSize="11" textAnchor="middle" fontFamily="monospace">
                KAPALI BOY (L_min) = {calc.closedLength} mm
              </text>
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
};
