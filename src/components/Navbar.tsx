import React from 'react';
import { Download, Layers, FolderGit2 } from 'lucide-react';

interface NavbarProps {
  onOpenDrawing: () => void;
  onOpenFittingManager: () => void;
  onOpenSpringTypeConfig: () => void;
  onOpenBatchAutomation: () => void;
  onOpenErpModal: () => void;
  onOpenDesignVault: () => void;
  onDownloadStep: () => void;
  isValid: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenDrawing,
  onOpenFittingManager,
  onOpenSpringTypeConfig,
  onOpenBatchAutomation,
  onOpenErpModal,
  onOpenDesignVault,
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

      {/* Zone 2: Clean text navigation links */}
      <nav className="hidden lg:flex items-center gap-5 text-xs font-medium text-slate-300">
        <button
          onClick={onOpenDesignVault}
          className="hover:text-cyan-300 transition-colors text-left flex items-center gap-1.5 text-cyan-400 font-semibold cursor-pointer"
        >
          <FolderGit2 className="w-3.5 h-3.5" />
          <span>Dizayn Arşivi & Revizyonlar</span>
        </button>
        <button
          onClick={onOpenSpringTypeConfig}
          className="hover:text-white transition-colors text-left cursor-pointer"
        >
          Amortisör Tipleri & Çaplar
        </button>
        <button
          onClick={onOpenFittingManager}
          className="hover:text-white transition-colors text-left cursor-pointer"
        >
          Uç Bağlantıları
        </button>
        <button
          onClick={onOpenBatchAutomation}
          className="hover:text-cyan-300 transition-colors text-left cursor-pointer"
        >
          Toplu Dizayn
        </button>
        <button
          onClick={onOpenErpModal}
          className="hover:text-emerald-300 transition-colors text-left text-emerald-400 font-semibold cursor-pointer"
        >
          ERP MSSQL & BOM
        </button>
        <button
          onClick={onOpenDrawing}
          className="hover:text-white transition-colors text-left cursor-pointer"
        >
          2D Teknik Resim
        </button>
      </nav>

      {/* Zone 3: Primary action buttons */}
      <div className="flex items-center gap-2.5">
        <button
          onClick={onOpenDesignVault}
          className="px-3 py-1.5 text-xs font-medium text-cyan-300 bg-cyan-950/70 hover:bg-cyan-900/80 rounded-lg border border-cyan-800/80 transition-colors flex items-center gap-1.5 cursor-pointer"
        >
          <FolderGit2 className="w-3.5 h-3.5" />
          <span>Dizayn Arşivi</span>
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
