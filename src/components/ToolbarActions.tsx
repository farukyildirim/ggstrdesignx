import React from 'react';
import { Download, Sliders, Eye, Layers, Scissors, Check, Sparkles } from 'lucide-react';

interface ToolbarActionsProps {
  compressionRatio: number;
  onCompressionChange: (val: number) => void;
  explodedRatio: number;
  onExplodedChange: (val: number) => void;
  cutawayMode: boolean;
  onToggleCutaway: () => void;
  showDimensions: boolean;
  onToggleDimensions: () => void;
  materialFinish: 'standard' | 'tactical' | 'stainless' | 'gold';
  onMaterialChange: (val: 'standard' | 'tactical' | 'stainless' | 'gold') => void;
  onDownloadStep: () => void;
  onDownloadStl: () => void;
  isValid: boolean;
  isGenerating: boolean;
}

export const ToolbarActions: React.FC<ToolbarActionsProps> = ({
  compressionRatio,
  onCompressionChange,
  explodedRatio,
  onExplodedChange,
  cutawayMode,
  onToggleCutaway,
  showDimensions,
  onToggleDimensions,
  materialFinish,
  onMaterialChange,
  onDownloadStep,
  onDownloadStl,
  isValid,
  isGenerating,
}) => {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl flex flex-col gap-4">
      {/* Simulation & Inspection Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Stroke Compression Slider */}
        <div className="flex flex-col gap-1.5 bg-slate-950/60 p-3 rounded-lg border border-slate-800/80">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-200 font-medium flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-blue-400" />
              <span>Strok Sıkıştırma Simülatörü</span>
            </span>
            <span className="font-mono text-cyan-300 tabular-nums">
              {Math.round(compressionRatio * 100)}% ({compressionRatio === 0 ? 'Açık' : compressionRatio === 1 ? 'Kapalı' : 'Ara Konum'})
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={compressionRatio}
            onChange={(e) => onCompressionChange(parseFloat(e.target.value))}
            className="w-full accent-blue-500 cursor-pointer h-1.5 bg-slate-700 rounded-lg"
          />
          <div className="flex justify-between text-[10px] text-slate-400">
            <span>0% (Tam Açık L)</span>
            <button
              onClick={() => onCompressionChange(compressionRatio > 0.5 ? 0 : 1)}
              className="text-cyan-400 hover:underline"
            >
              {compressionRatio > 0.5 ? 'Tam Aç' : 'Tam Kapat'}
            </button>
            <span>100% (Kapalı Boy)</span>
          </div>
        </div>

        {/* Exploded View Slider */}
        <div className="flex flex-col gap-1.5 bg-slate-950/60 p-3 rounded-lg border border-slate-800/80">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-200 font-medium flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-indigo-400" />
              <span>Montaj Patlatma (Exploded View)</span>
            </span>
            <span className="font-mono text-indigo-300 tabular-nums">
              {Math.round(explodedRatio * 100)}%
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={explodedRatio}
            onChange={(e) => onExplodedChange(parseFloat(e.target.value))}
            className="w-full accent-indigo-500 cursor-pointer h-1.5 bg-slate-700 rounded-lg"
          />
          <div className="flex justify-between text-[10px] text-slate-400">
            <span>0% (Montaj)</span>
            <button
              onClick={() => onExplodedChange(explodedRatio > 0 ? 0 : 0.8)}
              className="text-indigo-400 hover:underline"
            >
              {explodedRatio > 0 ? 'Topla' : 'Patlat'}
            </button>
            <span>100% (Ayrık Parçalar)</span>
          </div>
        </div>
      </div>

      {/* Mode Toggles & Material Finish Selector */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-slate-800/80">
        <div className="flex flex-wrap items-center gap-2">
          {/* Cutaway Cross Section */}
          <button
            onClick={onToggleCutaway}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg border flex items-center gap-1.5 transition-colors ${
              cutawayMode
                ? 'bg-amber-950/60 border-amber-500 text-amber-200'
                : 'bg-slate-800/80 border-slate-700/80 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <Scissors className="w-3.5 h-3.5" />
            <span>Kesit Görünüm (Cutaway)</span>
          </button>

          {/* Dimension Overlays */}
          <button
            onClick={onToggleDimensions}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg border flex items-center gap-1.5 transition-colors ${
              showDimensions
                ? 'bg-cyan-950/60 border-cyan-500 text-cyan-200'
                : 'bg-slate-800/80 border-slate-700/80 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Ölçülendirme Çizgileri</span>
          </button>

          {/* Material Finish Dropdown/Selector */}
          <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
            <span className="text-slate-400 text-[11px] px-1.5">Kaplama:</span>
            {(
              [
                ['standard', 'Standart (Siyah/Krom/Mavi)'],
                ['stainless', 'Paslanmaz Çelik (Inox)'],
                ['tactical', 'Taktik Mat Siyah'],
                ['gold', 'Sarı Çinko'],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                onClick={() => onMaterialChange(key)}
                className={`px-2 py-1 rounded text-[11px] transition-colors ${
                  materialFinish === key
                    ? 'bg-blue-600 text-white font-medium shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {label.split(' ')[0]}
              </button>
            ))}
          </div>
        </div>

        {/* CAD Export Downloads (Directly matching Gradio output buttons) */}
        <div className="flex items-center gap-2">
          <button
            onClick={onDownloadStep}
            disabled={!isValid || isGenerating}
            className={`px-3.5 py-2 rounded-lg font-semibold text-xs flex items-center gap-1.5 transition-all shadow-md ${
              isValid && !isGenerating
                ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-900/30 active:scale-95 cursor-pointer'
                : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
            }`}
            title="ISO 10303-21 Renkli STEP Montaj Dosyası"
          >
            <Download className="w-3.5 h-3.5" />
            <span>📥 Renkli .STEP Montajı İndir</span>
          </button>

          <button
            onClick={onDownloadStl}
            disabled={!isValid || isGenerating}
            className={`px-3.5 py-2 rounded-lg font-semibold text-xs flex items-center gap-1.5 transition-all shadow-md ${
              isValid && !isGenerating
                ? 'bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-600 active:scale-95 cursor-pointer'
                : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
            }`}
            title="3D Yazıcı & CAD Mesh Dosyası"
          >
            <Download className="w-3.5 h-3.5" />
            <span>📥 .STL İndir</span>
          </button>
        </div>
      </div>
    </div>
  );
};
