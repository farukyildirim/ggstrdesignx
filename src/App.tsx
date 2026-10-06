import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  GasSpringParams,
  EndFittingItem,
  GasSpringTypeDefinition,
  ErpMssqlConfig,
  SavedDesign,
  DesignRevision,
} from './types/cad';
import {
  DEFAULT_FITTINGS,
  DEFAULT_GAS_SPRING_TYPES,
  DEFAULT_ERP_CONFIG,
  DEFAULT_SAVED_DESIGNS,
} from './utils/engineeringData';
import { calculateGasSpringParams } from './utils/gasSpringMath';
import { generateStepFile } from './utils/stepExporter';
import { Navbar } from './components/Navbar';
import { ParametricControls } from './components/ParametricControls';
import { ThreeViewport, ThreeViewportHandle } from './components/ThreeViewport';
import { ToolbarActions } from './components/ToolbarActions';
import { EngineeringReport } from './components/EngineeringReport';
import { TechnicalDrawing2D } from './components/TechnicalDrawing2D';
import { FittingManagerModal } from './components/FittingManagerModal';
import { SpringTypeConfigModal } from './components/SpringTypeConfigModal';
import { BatchDesignAutomationModal } from './components/BatchDesignAutomationModal';
import { ErpMssqlModal } from './components/ErpMssqlModal';
import { DesignVaultModal } from './components/DesignVaultModal';
import { Check, Download, AlertCircle, Layers, Database, Wrench, Sliders, FolderGit2 } from 'lucide-react';

const DEFAULT_PARAMS: GasSpringParams = {
  tubeOd: 18,
  rodOd: 8,
  stroke: 150,
  extLength: 350,
  forceN: 400,
  rodFittingId: 'fitting_eyelet_8',
  tubeFittingId: 'fitting_eyelet_8',
  springTypeId: 'type_standard_push',
};

export default function App() {
  // Persistence for Custom Fittings, Types, ERP Config, and Saved Designs Vault
  const [availableFittings, setAvailableFittings] = useState<EndFittingItem[]>(() => {
    try {
      const saved = localStorage.getItem('gasspring_fittings');
      return saved ? JSON.parse(saved) : DEFAULT_FITTINGS;
    } catch {
      return DEFAULT_FITTINGS;
    }
  });

  const [availableTypes, setAvailableTypes] = useState<GasSpringTypeDefinition[]>(() => {
    try {
      const saved = localStorage.getItem('gasspring_types');
      return saved ? JSON.parse(saved) : DEFAULT_GAS_SPRING_TYPES;
    } catch {
      return DEFAULT_GAS_SPRING_TYPES;
    }
  });

  const [erpConfig, setErpConfig] = useState<ErpMssqlConfig>(() => {
    try {
      const saved = localStorage.getItem('gasspring_erp_config');
      return saved ? JSON.parse(saved) : DEFAULT_ERP_CONFIG;
    } catch {
      return DEFAULT_ERP_CONFIG;
    }
  });

  const [savedDesigns, setSavedDesigns] = useState<SavedDesign[]>(() => {
    try {
      const saved = localStorage.getItem('gasspring_designs_vault');
      return saved ? JSON.parse(saved) : DEFAULT_SAVED_DESIGNS;
    } catch {
      return DEFAULT_SAVED_DESIGNS;
    }
  });

  // Track currently active loaded design & rev
  const [activeDesignId, setActiveDesignId] = useState<string | null>('dsg_001_cabinet');
  const [activeRevId, setActiveRevId] = useState<string | null>('REV-02');
  const [isDesignVaultOpen, setIsDesignVaultOpen] = useState<boolean>(false);
  const [designVaultMode, setDesignVaultMode] = useState<'browse' | 'saveNew' | 'bumpRev'>('browse');

  const handleOpenVault = (mode: 'browse' | 'saveNew' | 'bumpRev' = 'browse') => {
    setDesignVaultMode(mode);
    setIsDesignVaultOpen(true);
  };

  useEffect(() => {
    try {
      localStorage.setItem('gasspring_fittings', JSON.stringify(availableFittings));
    } catch {}
  }, [availableFittings]);

  useEffect(() => {
    try {
      localStorage.setItem('gasspring_types', JSON.stringify(availableTypes));
    } catch {}
  }, [availableTypes]);

  useEffect(() => {
    try {
      localStorage.setItem('gasspring_erp_config', JSON.stringify(erpConfig));
    } catch {}
  }, [erpConfig]);

  useEffect(() => {
    try {
      localStorage.setItem('gasspring_designs_vault', JSON.stringify(savedDesigns));
    } catch {}
  }, [savedDesigns]);

  const currentActiveDesign = useMemo(
    () => savedDesigns.find((d) => d.id === activeDesignId) || null,
    [savedDesigns, activeDesignId]
  );

  // Main Parameter & Viewport State
  const [params, setParams] = useState<GasSpringParams>(DEFAULT_PARAMS);
  const [compressionRatio, setCompressionRatio] = useState<number>(0);
  const [explodedRatio, setExplodedRatio] = useState<number>(0);
  const [cutawayMode, setCutawayMode] = useState<boolean>(false);
  const [showDimensions, setShowDimensions] = useState<boolean>(true);
  const [materialFinish, setMaterialFinish] = useState<'standard' | 'tactical' | 'stainless' | 'gold'>('standard');
  const [generationToast, setGenerationToast] = useState<string | null>(null);

  // Modals Visibility
  const [isDrawingOpen, setIsDrawingOpen] = useState<boolean>(false);
  const [isFittingModalOpen, setIsFittingModalOpen] = useState<boolean>(false);
  const [isTypeModalOpen, setIsTypeModalOpen] = useState<boolean>(false);
  const [isBatchModalOpen, setIsBatchModalOpen] = useState<boolean>(false);
  const [isErpModalOpen, setIsErpModalOpen] = useState<boolean>(false);

  const viewportRef = useRef<ThreeViewportHandle>(null);

  // Real-time calculation with dynamic fittings & spring types
  const calc = useMemo(
    () => calculateGasSpringParams(params, availableFittings, availableTypes),
    [params, availableFittings, availableTypes]
  );

  // Update material theme automatically if stainless spring is selected
  useEffect(() => {
    if (calc.springType.formulaType === 'stainless' && materialFinish !== 'stainless') {
      setMaterialFinish('stainless');
    }
  }, [calc.springType.formulaType]);

  const handleParamChange = (updated: Partial<GasSpringParams>) => {
    setParams((prev) => ({ ...prev, ...updated }));
  };

  const handleReset = () => {
    setParams(DEFAULT_PARAMS);
    setCompressionRatio(0);
    setExplodedRatio(0);
    setCutawayMode(false);
    setShowDimensions(true);
    setMaterialFinish('standard');
  };

  // Fitting Management Handlers
  const handleAddFitting = (newFitting: EndFittingItem) => {
    setAvailableFittings((prev) => [...prev, newFitting]);
    setGenerationToast(`"${newFitting.name}" başarıyla kütüphaneye eklendi.`);
    setTimeout(() => setGenerationToast(null), 3500);
  };

  const handleDeleteFitting = (id: string) => {
    setAvailableFittings((prev) => prev.filter((f) => f.id !== id));
    if (params.rodFittingId === id) {
      setParams((prev) => ({ ...prev, rodFittingId: DEFAULT_FITTINGS[0].id }));
    }
    if (params.tubeFittingId === id) {
      setParams((prev) => ({ ...prev, tubeFittingId: DEFAULT_FITTINGS[0].id }));
    }
  };

  const handleUpdateFitting = (updated: EndFittingItem) => {
    setAvailableFittings((prev) => prev.map((f) => (f.id === updated.id ? updated : f)));
  };

  // Spring Type Handlers
  const handleAddSpringType = (newType: GasSpringTypeDefinition) => {
    setAvailableTypes((prev) => [...prev, newType]);
    setParams((prev) => ({ ...prev, springTypeId: newType.id }));
    setGenerationToast(`"${newType.name}" amortisör tipi oluşturuldu ve seçildi.`);
    setTimeout(() => setGenerationToast(null), 3500);
  };

  const handleDeleteSpringType = (id: string) => {
    setAvailableTypes((prev) => prev.filter((t) => t.id !== id));
    if (params.springTypeId === id) {
      setParams((prev) => ({ ...prev, springTypeId: DEFAULT_GAS_SPRING_TYPES[0].id }));
    }
  };

  const handleUpdateSpringType = (updated: GasSpringTypeDefinition) => {
    setAvailableTypes((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
  };

  const handleResetSpringTypes = () => {
    setAvailableTypes(DEFAULT_GAS_SPRING_TYPES);
  };

  // Design Vault & Revision Management Handlers
  const handleLoadDesignRevision = (design: SavedDesign, rev: DesignRevision) => {
    setParams({ ...rev.params });
    setActiveDesignId(design.id);
    setActiveRevId(rev.revId);
    setGenerationToast(`"${design.name}" (${rev.revId}) CAD motoruna yüklendi.`);
    setTimeout(() => setGenerationToast(null), 4000);
  };

  const handleSaveNewDesign = (newDesign: SavedDesign) => {
    setSavedDesigns((prev) => [newDesign, ...prev]);
    setActiveDesignId(newDesign.id);
    setActiveRevId(newDesign.currentRevId);
    setGenerationToast(`"${newDesign.name}" yeni tasarım olarak başarıyla kaydedildi!`);
    setTimeout(() => setGenerationToast(null), 4000);
  };

  const handleUpdateDesign = (updated: SavedDesign) => {
    setSavedDesigns((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
    setActiveDesignId(updated.id);
    setActiveRevId(updated.currentRevId);
    setGenerationToast(`"${updated.name}" için yeni revizyon (${updated.currentRevId}) oluşturuldu.`);
    setTimeout(() => setGenerationToast(null), 4000);
  };

  const handleDeleteDesign = (id: string) => {
    setSavedDesigns((prev) => prev.filter((d) => d.id !== id));
    if (activeDesignId === id) {
      setActiveDesignId(null);
      setActiveRevId(null);
    }
  };

  const handleImportDesigns = (imported: SavedDesign[]) => {
    setSavedDesigns(imported);
    if (imported.length > 0) {
      setActiveDesignId(imported[0].id);
      setActiveRevId(imported[0].currentRevId);
    }
    setGenerationToast(`${imported.length} adet dizayn içe aktarıldı.`);
    setTimeout(() => setGenerationToast(null), 4000);
  };

  // Batch Automation Load to Workbench
  const handleLoadFromBatch = (batchParams: GasSpringParams) => {
    setParams(batchParams);
    setGenerationToast(`${batchParams.tubeOd}x${batchParams.rodOd} L=${batchParams.extLength}mm çalışma alanına yüklendi.`);
    setTimeout(() => setGenerationToast(null), 4000);
  };

  // Downloads
  const handleGenerateAssembly = () => {
    if (!calc.isValid) return;
    setGenerationToast('Renkli .STEP Montajı ve .STL başarıyla oluşturuldu! Aşağıdan indirebilirsiniz.');
    setTimeout(() => setGenerationToast(null), 4500);
  };

  const handleDownloadStep = () => {
    if (!calc.isValid) return;
    const stepContent = generateStepFile(params, calc, availableFittings);
    const blob = new Blob([stepContent], { type: 'application/step' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `colored_gas_spring_assembly_${calc.partNumber}.step`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadStl = () => {
    if (!calc.isValid || !viewportRef.current) return;
    const stlBlob = viewportRef.current.exportStl(true);
    if (!stlBlob) return;
    const url = URL.createObjectURL(stlBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `colored_gas_spring_assembly_${calc.partNumber}.stl`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      {/* Top Bar Navigation conforming to contract */}
      <Navbar
        onOpenDrawing={() => setIsDrawingOpen(true)}
        onOpenFittingManager={() => setIsFittingModalOpen(true)}
        onOpenSpringTypeConfig={() => setIsTypeModalOpen(true)}
        onOpenBatchAutomation={() => setIsBatchModalOpen(true)}
        onOpenErpModal={() => setIsErpModalOpen(true)}
        onOpenDesignVault={() => handleOpenVault('browse')}
        onDownloadStep={handleDownloadStep}
        isValid={calc.isValid}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-[1600px] w-full mx-auto p-4 md:p-6 lg:p-8 flex flex-col gap-6">
        {/* Editorial Sub-header Title & Fast Action Badges */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-2 border-b border-slate-800">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
              <span>🌀</span>
              <span>Parametrik Gazlı Amortisör CAD & İmalat Yönetim Motoru</span>
            </h1>
            <p className="text-xs md:text-sm text-slate-400 mt-1 max-w-3xl leading-relaxed">
              Özelleştirilebilir uç mafsalları, amortisör tipi ve silindir/mil çapı formül kuralları,{' '}
              <strong className="text-cyan-400">Dizayn Revizyon Yönetimi</strong>,{' '}
              <strong className="text-emerald-400">ERP MSSQL BOM aktarımı</strong> ve{' '}
              <strong className="text-cyan-400">Toplu Dizayn Otomasyonu</strong>.
            </p>
          </div>

          {/* Quick status bar */}
          <div className="flex flex-wrap items-center gap-2.5 text-xs text-slate-400 shrink-0">
            <button
              onClick={() => handleOpenVault('browse')}
              className="px-2.5 py-1 rounded-lg bg-blue-950/80 border border-blue-700/80 hover:border-blue-500 text-blue-300 font-medium transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
              title="Dizayn kütüphanesini ve revizyon geçmişini aç"
            >
              <FolderGit2 className="w-3.5 h-3.5 text-blue-400" />
              <span>
                {currentActiveDesign ? `${currentActiveDesign.code} (${activeRevId})` : 'Dizayn Arşivi'}
              </span>
            </button>

            <button
              onClick={() => setIsBatchModalOpen(true)}
              className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700 hover:border-cyan-500 text-cyan-300 font-medium transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Toplu Dizayn</span>
            </button>

            <button
              onClick={() => setIsErpModalOpen(true)}
              className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700 hover:border-emerald-500 text-emerald-300 font-medium transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Database className="w-3.5 h-3.5" />
              <span>ERP MSSQL</span>
            </button>

            <span className="text-slate-600 hidden sm:inline">·</span>
            <span className="font-mono text-cyan-400 text-xs hidden sm:inline">{calc.partNumber}</span>
          </div>
        </div>

        {/* Success / Generation Toast Notification */}
        {generationToast && (
          <div className="bg-emerald-950/80 border border-emerald-500/70 text-emerald-200 px-4 py-3 rounded-xl flex items-center justify-between gap-3 shadow-lg shadow-emerald-950/50 animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center gap-2.5 text-xs md:text-sm font-medium">
              <Check className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{generationToast}</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleDownloadStep}
                className="px-2.5 py-1 text-xs bg-emerald-600 hover:bg-emerald-500 text-white rounded font-medium transition-colors cursor-pointer"
              >
                .STEP İndir
              </button>
              <button
                onClick={handleDownloadStl}
                className="px-2.5 py-1 text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 rounded font-medium transition-colors cursor-pointer"
              >
                .STL İndir
              </button>
            </div>
          </div>
        )}

        {/* 2-Column Responsive Workspace */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Parametric Controls & Fitting Management */}
          <div id="controls" className="lg:col-span-5 flex flex-col gap-6">
            <ParametricControls
              params={params}
              calc={calc}
              onChange={handleParamChange}
              onGenerate={handleGenerateAssembly}
              onReset={handleReset}
              availableFittings={availableFittings}
              availableTypes={availableTypes}
              onOpenFittingManager={() => setIsFittingModalOpen(true)}
              onOpenSpringTypeConfig={() => setIsTypeModalOpen(true)}
              onOpenBatchAutomation={() => setIsBatchModalOpen(true)}
              onOpenErpModal={() => setIsErpModalOpen(true)}
              onOpenDesignVault={(mode) => handleOpenVault(mode || 'browse')}
              activeDesignName={currentActiveDesign?.name}
              activeRevCode={activeRevId || undefined}
            />
          </div>

          {/* Right Column: 3D Viewport, Simulation, and Engineering Report */}
          <div className="lg:col-span-7 flex flex-col gap-6">
            {/* 3D Model Interactive Viewport */}
            <div id="viewer" className="w-full h-[480px]">
              <ThreeViewport
                ref={viewportRef}
                params={params}
                calc={calc}
                compressionRatio={compressionRatio}
                explodedRatio={explodedRatio}
                cutawayMode={cutawayMode}
                showDimensions={showDimensions}
                materialFinish={materialFinish}
                availableFittings={availableFittings}
              />
            </div>

            {/* Simulation & Inspection Toolbar + Downloads */}
            <ToolbarActions
              compressionRatio={compressionRatio}
              onCompressionChange={setCompressionRatio}
              explodedRatio={explodedRatio}
              onExplodedChange={setExplodedRatio}
              cutawayMode={cutawayMode}
              onToggleCutaway={() => setCutawayMode(!cutawayMode)}
              showDimensions={showDimensions}
              onToggleDimensions={() => setShowDimensions(!showDimensions)}
              materialFinish={materialFinish}
              onMaterialChange={setMaterialFinish}
              onDownloadStep={handleDownloadStep}
              onDownloadStl={handleDownloadStl}
              isValid={calc.isValid}
              isGenerating={false}
            />

            {/* Mühendislik Raporu */}
            <div id="report">
              <EngineeringReport params={params} calc={calc} />
            </div>
          </div>
        </div>
      </main>

      {/* 2D Blueprint Modal */}
      <TechnicalDrawing2D
        params={params}
        calc={calc}
        isOpen={isDrawingOpen}
        onClose={() => setIsDrawingOpen(false)}
      />

      {/* Fitting Manager Modal */}
      <FittingManagerModal
        isOpen={isFittingModalOpen}
        onClose={() => setIsFittingModalOpen(false)}
        fittings={availableFittings}
        onAddFitting={handleAddFitting}
        onDeleteFitting={handleDeleteFitting}
        onUpdateFitting={handleUpdateFitting}
      />

      {/* Spring Type Config Modal with Diameter Rules & Custom Type Addition */}
      <SpringTypeConfigModal
        isOpen={isTypeModalOpen}
        onClose={() => setIsTypeModalOpen(false)}
        springTypes={availableTypes}
        selectedTypeId={params.springTypeId}
        onSelectType={(id) => handleParamChange({ springTypeId: id })}
        onUpdateType={handleUpdateSpringType}
        onAddType={handleAddSpringType}
        onDeleteType={handleDeleteSpringType}
        onResetDefaults={handleResetSpringTypes}
      />

      {/* Batch Design Automation Modal */}
      <BatchDesignAutomationModal
        isOpen={isBatchModalOpen}
        onClose={() => setIsBatchModalOpen(false)}
        availableFittings={availableFittings}
        availableTypes={availableTypes}
        onLoadToWorkbench={handleLoadFromBatch}
        erpConfig={erpConfig}
      />

      {/* ERP MSSQL & BOM Transfer Modal */}
      <ErpMssqlModal
        isOpen={isErpModalOpen}
        onClose={() => setIsErpModalOpen(false)}
        config={erpConfig}
        onUpdateConfig={setErpConfig}
        params={params}
        calc={calc}
        availableFittings={availableFittings}
      />

      {/* Design Vault & Revision Management Modal */}
      <DesignVaultModal
        isOpen={isDesignVaultOpen}
        onClose={() => setIsDesignVaultOpen(false)}
        savedDesigns={savedDesigns}
        activeDesignId={activeDesignId}
        activeRevId={activeRevId}
        currentParams={params}
        currentCalc={calc}
        availableFittings={availableFittings}
        availableTypes={availableTypes}
        initialMode={designVaultMode}
        onLoadDesignRevision={handleLoadDesignRevision}
        onSaveNewDesign={handleSaveNewDesign}
        onUpdateDesign={handleUpdateDesign}
        onDeleteDesign={handleDeleteDesign}
        onImportDesigns={handleImportDesigns}
      />

      {/* Engineering Footer */}
      <footer className="mt-auto border-t border-slate-900 bg-slate-950 px-6 py-4 text-center text-xs text-slate-500">
        <div className="max-w-[1600px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>
            Parametrik Gazlı Amortisör CAD Motoru · CadQuery & Three.js Assembly Engine
          </span>
          <span className="font-mono text-[11px] text-slate-400">
            ISO 10303-21 STEP AP214 · STL Mesh · Dizayn Revizyon Kontrolü · ERP MSSQL BOM
          </span>
        </div>
      </footer>
    </div>
  );
}
