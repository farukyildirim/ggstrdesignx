import React from 'react';
import { Download, Layers, Database } from 'lucide-react';

interface NavbarProps {
  onOpenDrawing: () => void;
  onOpenFittingManager: () => void;
  onOpenSpringTypeConfig: () => void;
  onOpenBatchAutomation: () => void;
  onOpenErpModal: () => void;
  onDownloadStep: () => void;
  isValid: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenDrawing,
  onOpenFittingManager,
  onOpenSpringTypeConfig,
  onOpenBatchAutomation,
  onOpenErpModal,
  onDownloadStep,
  isValid,
}) => {
  return (
    <header className="flex items-center justify-between px-6 py-3.5 bg-slate-900 border-b border-slate-800 shrink-0">
      {/* Zone 1: Single text element wordmark */}
      <div className="flex items-center gap-3">
        <a href="/" className="text-base font-bold tracking-tight text-white flex items-center gap-2">
          <span className="text-blue-500 font-mono text-lg">⚙</span>
          <span>Gazlı Amortisör CAD Motoru</span>
        </a>
      </div>

      {/* Zone 2: 5 clean text navigation links */}
      <nav className="hidden lg:flex items-center gap-6 text-xs font-medium text-slate-300">
        <button
          onClick={onOpenSpringTypeConfig}
          className="hover:text-white transition-colors text-left"
        >
          Amortisör Tipleri
        </button>
        <button
          onClick={onOpenFittingManager}
          className="hover:text-white transition-colors text-left"
        >
          Uç Bağlantıları
        </button>
        <button
          onClick={onOpenBatchAutomation}
          className="hover:text-cyan-300 transition-colors text-left text-cyan-400 font-semibold"
        >
          Toplu Dizayn Otomasyonu
        </button>
        <button
          onClick={onOpenErpModal}
          className="hover:text-emerald-300 transition-colors text-left text-emerald-400 font-semibold"
        >
          ERP MSSQL & BOM
        </button>
        <button
          onClick={onOpenDrawing}
          className="hover:text-white transition-colors text-left"
        >
          2D Teknik Resim
        </button>
      </nav>

      {/* Zone 3: Primary action buttons */}
      <div className="flex items-center gap-2.5">
        <button
          onClick={onOpenBatchAutomation}
          className="px-3 py-1.5 text-xs font-medium text-cyan-300 bg-cyan-950/60 hover:bg-cyan-900/60 rounded-lg border border-cyan-800/80 transition-colors hidden sm:flex items-center gap-1.5"
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Toplu Dizayn</span>
        </button>
        <button
          onClick={onDownloadStep}
          disabled={!isValid}
          className={`px-3.5 py-1.5 text-xs font-semibold text-white rounded-lg transition-all flex items-center gap-1.5 shadow-md ${
            isValid
              ? 'bg-blue-600 hover:bg-blue-500 shadow-blue-900/30 active:scale-95 cursor-pointer'
              : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
          }`}
        >
          <Download className="w-3.5 h-3.5" />
          <span>.STEP İndir</span>
        </button>
      </div>
    </header>
  );
};
