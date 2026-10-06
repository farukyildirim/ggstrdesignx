import React, { useState, useMemo } from 'react';
import {
  SavedDesign,
  DesignRevision,
  GasSpringParams,
  CalculationResult,
  EndFittingItem,
  GasSpringTypeDefinition,
} from '../types/cad';
import {
  FolderGit2,
  X,
  Plus,
  Search,
  Check,
  History,
  GitCommit,
  GitCompare,
  ArrowRight,
  Download,
  Upload,
  Trash2,
  Copy,
  Calendar,
  User,
  Tag,
  AlertCircle,
  FileCode,
  Sparkles,
  Layers,
} from 'lucide-react';

interface DesignVaultModalProps {
  isOpen: boolean;
  onClose: () => void;
  savedDesigns: SavedDesign[];
  activeDesignId: string | null;
  activeRevId: string | null;
  currentParams: GasSpringParams;
  currentCalc: CalculationResult;
  availableFittings: EndFittingItem[];
  availableTypes: GasSpringTypeDefinition[];
  onLoadDesignRevision: (design: SavedDesign, rev: DesignRevision) => void;
  onSaveNewDesign: (design: SavedDesign) => void;
  onUpdateDesign: (design: SavedDesign) => void;
  onDeleteDesign: (id: string) => void;
  onImportDesigns: (designs: SavedDesign[]) => void;
}

export const DesignVaultModal: React.FC<DesignVaultModalProps> = ({
  isOpen,
  onClose,
  savedDesigns,
  activeDesignId,
  activeRevId,
  currentParams,
  currentCalc,
  availableFittings,
  availableTypes,
  onLoadDesignRevision,
  onSaveNewDesign,
  onUpdateDesign,
  onDeleteDesign,
  onImportDesigns,
}) => {
  const [selectedDesignId, setSelectedDesignId] = useState<string>(
    activeDesignId || (savedDesigns[0]?.id || '')
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [modalMode, setModalMode] = useState<'browse' | 'saveNew' | 'bumpRev' | 'compare'>('browse');

  // Compare mode state
  const [compareRevAId, setCompareRevAId] = useState<string>('');
  const [compareRevBId, setCompareRevBId] = useState<string>('');

  // Save as New Design form state
  const [newDesignName, setNewDesignName] = useState('');
  const [newDesignCustomer, setNewDesignCustomer] = useState('');
  const [newDesignCode, setNewDesignCode] = useState(() => `DSG-${new Date().getFullYear()}-${(savedDesigns.length + 1).toString().padStart(3, '0')}`);
  const [newDesignAuthor, setNewDesignAuthor] = useState('CAD Mühendisi');
  const [newDesignNotes, setNewDesignNotes] = useState('İlk konsept tasarım ve mühendislik hesaplaması.');
  const [newDesignTags, setNewDesignTags] = useState('Endüstriyel, İtme Tipi');

  // Bump Revision form state
  const [bumpNotes, setBumpNotes] = useState('');
  const [bumpAuthor, setBumpAuthor] = useState('CAD Mühendisi');

  if (!isOpen) return null;

  const currentSelectedDesign = savedDesigns.find((d) => d.id === selectedDesignId) || savedDesigns[0];

  // Filtered designs
  const filteredDesigns = useMemo(() => {
    if (!searchQuery.trim()) return savedDesigns;
    const q = searchQuery.toLowerCase();
    return savedDesigns.filter(
      (d) =>
        d.name.toLowerCase().includes(q) ||
        d.code.toLowerCase().includes(q) ||
        d.customerOrProject?.toLowerCase().includes(q) ||
        d.revisions.some((r) => r.calcSnapshot?.partNumber?.toLowerCase().includes(q)) ||
        d.tags?.some((t) => t.toLowerCase().includes(q))
    );
  }, [savedDesigns, searchQuery]);

  // Handle Save As New Design
  const handleExecuteSaveNew = () => {
    if (!newDesignName.trim()) return;

    const newDesignId = `dsg_${Date.now()}`;
    const initialRev: DesignRevision = {
      revId: 'REV-01',
      timestamp: new Date().toISOString(),
      author: newDesignAuthor.trim() || 'Mühendis',
      notes: newDesignNotes.trim() || 'İlk tasarım konfigürasyonu.',
      params: { ...currentParams },
      calcSnapshot: {
        partNumber: currentCalc.partNumber,
        extLength: currentParams.extLength,
        stroke: currentParams.stroke,
        forceN: currentParams.forceN,
        tubeOd: currentParams.tubeOd,
        rodOd: currentParams.rodOd,
        requiredPressureBar: currentCalc.requiredPressureBar,
        f2Force: currentCalc.f2Force,
        kFactor: currentCalc.kFactor,
        springTypeName: currentCalc.springType.name,
      },
    };

    const newDesignObj: SavedDesign = {
      id: newDesignId,
      code: newDesignCode.trim() || `DSG-${Date.now().toString().slice(-4)}`,
      name: newDesignName.trim(),
      customerOrProject: newDesignCustomer.trim() || 'Standart Proje',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      currentRevId: 'REV-01',
      tags: newDesignTags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
      revisions: [initialRev],
    };

    onSaveNewDesign(newDesignObj);
    setSelectedDesignId(newDesignId);
    setModalMode('browse');
    onLoadDesignRevision(newDesignObj, initialRev);
  };

  // Handle Bump Revision on Existing Design
  const handleExecuteBumpRev = () => {
    if (!currentSelectedDesign) return;

    // Calculate next rev number
    const revCount = currentSelectedDesign.revisions.length;
    const nextRevNum = (revCount + 1).toString().padStart(2, '0');
    const nextRevId = `REV-${nextRevNum}`;

    const newRev: DesignRevision = {
      revId: nextRevId,
      timestamp: new Date().toISOString(),
      author: bumpAuthor.trim() || 'Mühendis',
      notes: bumpNotes.trim() || `Revizyon ${nextRevId} parametre güncellemesi.`,
      params: { ...currentParams },
      calcSnapshot: {
        partNumber: currentCalc.partNumber,
        extLength: currentParams.extLength,
        stroke: currentParams.stroke,
        forceN: currentParams.forceN,
        tubeOd: currentParams.tubeOd,
        rodOd: currentParams.rodOd,
        requiredPressureBar: currentCalc.requiredPressureBar,
        f2Force: currentCalc.f2Force,
        kFactor: currentCalc.kFactor,
        springTypeName: currentCalc.springType.name,
      },
    };

    const updatedDesign: SavedDesign = {
      ...currentSelectedDesign,
      updatedAt: new Date().toISOString(),
      currentRevId: nextRevId,
      revisions: [newRev, ...currentSelectedDesign.revisions],
    };

    onUpdateDesign(updatedDesign);
    setModalMode('browse');
    setBumpNotes('');
    onLoadDesignRevision(updatedDesign, newRev);
  };

  // Export designs to JSON file
  const handleExportJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(savedDesigns, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `GasSpring_Design_Vault_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Import designs from JSON file
  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].revisions) {
          onImportDesigns(parsed);
          alert(`${parsed.length} adet dizayn başarıyla içe aktarıldı!`);
        } else {
          alert('Geçersiz dizayn JSON dosyası formatı!');
        }
      } catch (err) {
        alert('JSON okuma hatası oluştu!');
      }
    };
    reader.readAsText(file);
  };

  // Rev Diff helper
  const revA = currentSelectedDesign?.revisions.find((r) => r.revId === compareRevAId) || currentSelectedDesign?.revisions[0];
  const revB = currentSelectedDesign?.revisions.find((r) => r.revId === compareRevBId) || currentSelectedDesign?.revisions[1] || currentSelectedDesign?.revisions[0];

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-6xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/80">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-600/20 text-blue-400 border border-blue-500/30">
              <FolderGit2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white flex items-center gap-2">
                <span>Dizayn Kütüphanesi & Revizyon Yönetimi</span>
                <span className="text-xs px-2 py-0.5 bg-blue-950 text-blue-300 border border-blue-800 rounded font-mono">
                  {savedDesigns.length} Kayıtlı Tasarım
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Daha önce oluşturulan dizaynları çağırın, değiştirin ve revizyon geçmişini (Rev 01, Rev 02...) takip edin
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportJson}
              className="px-2.5 py-1.5 text-xs text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Tüm dizaynları JSON olarak yedekle"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">JSON Dışa Aktar</span>
            </button>
            <label className="px-2.5 py-1.5 text-xs text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer">
              <Upload className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">JSON İçe Aktar</span>
              <input type="file" accept=".json" onChange={handleImportJson} className="hidden" />
            </label>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Sub Header Action Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-2.5 bg-slate-950/60 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setModalMode('browse')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                modalMode === 'browse'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 bg-slate-900'
              }`}
            >
              Tasarım Arşivi
            </button>
            <button
              onClick={() => {
                setModalMode('saveNew');
                setNewDesignCode(`DSG-${new Date().getFullYear()}-${(savedDesigns.length + 1).toString().padStart(3, '0')}`);
              }}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
                modalMode === 'saveNew'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-emerald-400 hover:text-emerald-300 bg-emerald-950/40 border border-emerald-800/60'
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Mevcut Parametreleri Yeni Tasarım Olarak Kaydet</span>
            </button>
            {currentSelectedDesign && (
              <button
                onClick={() => setModalMode('bumpRev')}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
                  modalMode === 'bumpRev'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-indigo-400 hover:text-indigo-300 bg-indigo-950/40 border border-indigo-800/60'
                }`}
              >
                <GitCommit className="w-3.5 h-3.5" />
                <span>Yeni Revizyon Yükselt ({currentSelectedDesign.currentRevId} → +1)</span>
              </button>
            )}
            {currentSelectedDesign && currentSelectedDesign.revisions.length > 1 && (
              <button
                onClick={() => {
                  setModalMode('compare');
                  setCompareRevAId(currentSelectedDesign.revisions[1]?.revId || currentSelectedDesign.revisions[0]?.revId);
                  setCompareRevBId(currentSelectedDesign.revisions[0]?.revId);
                }}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
                  modalMode === 'compare'
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'text-amber-400 hover:text-amber-300 bg-amber-950/40 border border-amber-800/60'
                }`}
              >
                <GitCompare className="w-3.5 h-3.5" />
                <span>Revizyonları Kıyasla (Diff)</span>
              </button>
            )}
          </div>

          {/* Quick Active CAD Indicator */}
          <div className="text-xs text-slate-400 flex items-center gap-2">
            <span>Anlık CAD Parametreleri:</span>
            <span className="font-mono text-cyan-300 font-semibold">
              Ø{currentParams.tubeOd}/{currentParams.rodOd} · S={currentParams.stroke}mm · L={currentParams.extLength}mm · {currentParams.forceN}N
            </span>
          </div>
        </div>

        {/* Modal Main Body */}
        <div className="p-6 overflow-y-auto flex-1">
          {/* MODE 1: BROWSE & LOAD */}
          {modalMode === 'browse' && (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 h-full">
              {/* Left Column: Designs List & Search */}
              <div className="md:col-span-5 flex flex-col gap-3">
                {/* Search Bar */}
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Tasarım adı, kod, müşteri veya parça no ara..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>

                {/* Designs Cards List */}
                <div className="flex flex-col gap-2 overflow-y-auto max-h-[460px] pr-1">
                  {filteredDesigns.length === 0 ? (
                    <div className="p-6 text-center text-slate-500 text-xs border border-dashed border-slate-800 rounded-xl">
                      Aramaya uygun kayıtlı tasarım bulunamadı.
                    </div>
                  ) : (
                    filteredDesigns.map((design) => {
                      const isSelected = design.id === selectedDesignId;
                      const isLoadedInCad = design.id === activeDesignId;
                      const latestRev = design.revisions[0];
                      return (
                        <div
                          key={design.id}
                          onClick={() => setSelectedDesignId(design.id)}
                          className={`p-3.5 rounded-xl border cursor-pointer transition-all flex flex-col gap-2 ${
                            isSelected
                              ? 'bg-blue-950/80 border-blue-500 shadow-md ring-1 ring-blue-500/40'
                              : 'bg-slate-950/50 border-slate-800 hover:bg-slate-800/40 text-slate-300'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-mono text-[11px] font-bold text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800/60">
                              {design.code}
                            </span>
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] font-mono px-1.5 py-0.5 bg-indigo-950 text-indigo-300 border border-indigo-800 rounded font-semibold">
                                {design.currentRevId} ({design.revisions.length} Rev)
                              </span>
                              {isLoadedInCad && (
                                <span className="text-[10px] px-1.5 py-0.5 bg-emerald-950 text-emerald-300 border border-emerald-800 rounded font-semibold">
                                  Aktif
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex flex-col gap-0.5">
                            <strong className="text-xs font-semibold text-white line-clamp-1">
                              {design.name}
                            </strong>
                            <span className="text-[11px] text-slate-400 line-clamp-1">
                              {design.customerOrProject || 'Müşteri Projesi'}
                            </span>
                          </div>

                          {/* Quick spec badge */}
                          {latestRev?.calcSnapshot && (
                            <div className="text-[10px] font-mono text-slate-300 bg-slate-900/80 px-2 py-1 rounded border border-slate-800 flex items-center justify-between">
                              <span>L={latestRev.calcSnapshot.extLength}mm · S={latestRev.calcSnapshot.stroke}mm</span>
                              <span className="text-amber-300 font-semibold">{latestRev.calcSnapshot.forceN} N</span>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Right Column: Selected Design Details & Full Revision History */}
              {currentSelectedDesign ? (
                <div className="md:col-span-7 bg-slate-950 p-5 rounded-xl border border-slate-800 flex flex-col gap-4">
                  {/* Design Header */}
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-slate-800 pb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-cyan-400 bg-cyan-950 px-2 py-0.5 rounded border border-cyan-800">
                          {currentSelectedDesign.code}
                        </span>
                        <h4 className="text-sm font-semibold text-white">
                          {currentSelectedDesign.name}
                        </h4>
                      </div>
                      <p className="text-xs text-slate-400 mt-1 flex items-center gap-2">
                        <span>Müşteri / Proje: <strong className="text-slate-200">{currentSelectedDesign.customerOrProject}</strong></span>
                        <span>·</span>
                        <span>Revizyon: <strong className="text-indigo-400 font-mono">{currentSelectedDesign.currentRevId}</strong></span>
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          const latest = currentSelectedDesign.revisions[0];
                          if (latest) {
                            onLoadDesignRevision(currentSelectedDesign, latest);
                            onClose();
                          }
                        }}
                        className="px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer shadow-md"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Bu Dizaynı CAD'e Yükle</span>
                      </button>
                      {savedDesigns.length > 1 && (
                        <button
                          onClick={() => {
                            if (confirm(`"${currentSelectedDesign.name}" tasarımını ve tüm revizyon geçmişini silmek istediğinize emin misiniz?`)) {
                              onDeleteDesign(currentSelectedDesign.id);
                              setSelectedDesignId(savedDesigns.filter((d) => d.id !== currentSelectedDesign.id)[0]?.id || '');
                            }
                          }}
                          className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                          title="Tasarımı sil"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Revisions Timeline List */}
                  <div className="flex flex-col gap-2">
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider font-mono flex items-center gap-1.5">
                      <History className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Revizyon Geçmişi ({currentSelectedDesign.revisions.length} Revizyon)</span>
                    </span>

                    <div className="flex flex-col gap-2.5 overflow-y-auto max-h-[360px] pr-1">
                      {currentSelectedDesign.revisions.map((rev, index) => {
                        const isLatest = index === 0;
                        const isCurrentActiveInCad = activeDesignId === currentSelectedDesign.id && activeRevId === rev.revId;
                        return (
                          <div
                            key={rev.revId}
                            className={`p-3.5 rounded-xl border flex flex-col gap-2 transition-all ${
                              isCurrentActiveInCad
                                ? 'bg-emerald-950/40 border-emerald-600/80'
                                : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-xs font-bold text-indigo-300 bg-indigo-950 px-2 py-0.5 rounded border border-indigo-800">
                                  {rev.revId}
                                </span>
                                {isLatest && (
                                  <span className="text-[10px] px-1.5 py-0.2 bg-blue-950 text-blue-300 border border-blue-800 rounded">
                                    En Güncel Rev
                                  </span>
                                )}
                                {isCurrentActiveInCad && (
                                  <span className="text-[10px] px-1.5 py-0.2 bg-emerald-950 text-emerald-300 border border-emerald-800 rounded">
                                    CAD'de Açık
                                  </span>
                                )}
                              </div>

                              <button
                                onClick={() => {
                                  onLoadDesignRevision(currentSelectedDesign, rev);
                                  onClose();
                                }}
                                className="px-2.5 py-1 text-xs font-medium text-cyan-300 hover:text-white bg-cyan-950 hover:bg-cyan-900 border border-cyan-800/80 rounded flex items-center gap-1 transition-colors cursor-pointer"
                              >
                                <span>Bu Revizyonu Çağır</span>
                                <ArrowRight className="w-3 h-3" />
                              </button>
                            </div>

                            {/* Revision Author and Date */}
                            <div className="flex items-center gap-3 text-[11px] text-slate-400">
                              <span className="flex items-center gap-1">
                                <User className="w-3 h-3 text-slate-500" />
                                <span>{rev.author}</span>
                              </span>
                              <span>·</span>
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3 text-slate-500" />
                                <span>{new Date(rev.timestamp).toLocaleString('tr-TR')}</span>
                              </span>
                            </div>

                            {/* Revision Notes */}
                            <p className="text-xs text-slate-200 bg-slate-950/80 p-2.5 rounded-lg border border-slate-800/80 leading-relaxed font-sans">
                              {rev.notes}
                            </p>

                            {/* Snapshot Specs */}
                            {rev.calcSnapshot && (
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[11px] font-mono">
                                <div className="bg-slate-950 p-1.5 rounded border border-slate-800/80 text-slate-300">
                                  <span className="text-slate-500 block text-[10px]">Strok / Açık Boy:</span>
                                  <span>{rev.calcSnapshot.stroke} / {rev.calcSnapshot.extLength} mm</span>
                                </div>
                                <div className="bg-slate-950 p-1.5 rounded border border-slate-800/80 text-slate-300">
                                  <span className="text-slate-500 block text-[10px]">Kuvvet (F1):</span>
                                  <span className="text-amber-400 font-bold">{rev.calcSnapshot.forceN} N</span>
                                </div>
                                <div className="bg-slate-950 p-1.5 rounded border border-slate-800/80 text-slate-300">
                                  <span className="text-slate-500 block text-[10px]">İç Basınç (N2):</span>
                                  <span className="text-cyan-400 font-bold">{rev.calcSnapshot.requiredPressureBar?.toFixed(1)} Bar</span>
                                </div>
                                <div className="bg-slate-950 p-1.5 rounded border border-slate-800/80 text-slate-300 truncate">
                                  <span className="text-slate-500 block text-[10px]">Parça No:</span>
                                  <span className="truncate">{rev.calcSnapshot.partNumber}</span>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          )}

          {/* MODE 2: SAVE AS NEW DESIGN */}
          {modalMode === 'saveNew' && (
            <div className="max-w-2xl mx-auto bg-slate-950 p-6 rounded-2xl border border-slate-800 flex flex-col gap-4 shadow-xl">
              <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
                <div>
                  <h4 className="text-base font-semibold text-white flex items-center gap-2">
                    <Plus className="w-5 h-5 text-emerald-400" />
                    <span>Mevcut Tasarımı Yeni Proje Olarak Kaydet</span>
                  </h4>
                  <p className="text-xs text-slate-400 mt-1">
                    Anlık CAD parametreleri ve mühendislik hesaplaması ile REV-01 oluşturulacaktır.
                  </p>
                </div>
                <button onClick={() => setModalMode('browse')} className="text-slate-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="text-slate-300 font-medium block mb-1">Tasarım Kodu</label>
                  <input
                    type="text"
                    value={newDesignCode}
                    onChange={(e) => setNewDesignCode(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-slate-300 font-medium block mb-1">Mühendis / Tasarımcı</label>
                  <input
                    type="text"
                    value={newDesignAuthor}
                    onChange={(e) => setNewDesignAuthor(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:border-emerald-500"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-slate-300 font-medium block mb-1">Tasarım Adı (Proje Başlığı)</label>
                  <input
                    type="text"
                    placeholder="örn. Jeneratör Kabin Havalandırma Kapağı Amortisörü"
                    value={newDesignName}
                    onChange={(e) => setNewDesignName(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-medium focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-slate-300 font-medium block mb-1">Müşteri veya Proje Adı</label>
                  <input
                    type="text"
                    placeholder="örn. Aksa Jeneratör / Proje 44"
                    value={newDesignCustomer}
                    onChange={(e) => setNewDesignCustomer(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-slate-300 font-medium block mb-1">Etiketler (Virgülle ayırın)</label>
                  <input
                    type="text"
                    placeholder="Kabin, Ağır Yük, Ø22/10"
                    value={newDesignTags}
                    onChange={(e) => setNewDesignTags(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:border-emerald-500"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-slate-300 font-medium block mb-1">REV-01 Açıklama & Revizyon Notu</label>
                  <textarea
                    rows={3}
                    value={newDesignNotes}
                    onChange={(e) => setNewDesignNotes(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Snapshot Summary Box */}
              <div className="bg-slate-900 p-3.5 rounded-xl border border-slate-800 text-xs flex flex-col gap-1.5">
                <span className="text-slate-400 font-mono text-[11px] uppercase">Kaydedilecek Parametre Özeti:</span>
                <div className="flex flex-wrap items-center gap-3 font-mono text-cyan-300">
                  <span>Ø{currentParams.tubeOd}/{currentParams.rodOd} mm</span>
                  <span>·</span>
                  <span>Strok: {currentParams.stroke} mm</span>
                  <span>·</span>
                  <span>Açık Boy: {currentParams.extLength} mm</span>
                  <span>·</span>
                  <span className="text-amber-400">{currentParams.forceN} N (F1)</span>
                  <span>·</span>
                  <span>{currentCalc.requiredPressureBar.toFixed(1)} Bar</span>
                  <span>·</span>
                  <span className="text-slate-400">{currentCalc.partNumber}</span>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  onClick={() => setModalMode('browse')}
                  className="px-4 py-2 text-xs text-slate-400 hover:text-white rounded-lg cursor-pointer"
                >
                  Vazgeç
                </button>
                <button
                  onClick={handleExecuteSaveNew}
                  disabled={!newDesignName.trim()}
                  className="px-5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg disabled:opacity-50 flex items-center gap-1.5 cursor-pointer shadow-md"
                >
                  <Check className="w-4 h-4" />
                  <span>Tasarımı Kaydet & Aç</span>
                </button>
              </div>
            </div>
          )}

          {/* MODE 3: BUMP REVISION */}
          {modalMode === 'bumpRev' && currentSelectedDesign && (
            <div className="max-w-2xl mx-auto bg-slate-950 p-6 rounded-2xl border border-slate-800 flex flex-col gap-4 shadow-xl">
              <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
                <div>
                  <h4 className="text-base font-semibold text-white flex items-center gap-2">
                    <GitCommit className="w-5 h-5 text-indigo-400" />
                    <span>Yeni Revizyon Oluştur & Kaydet</span>
                  </h4>
                  <p className="text-xs text-slate-400 mt-1">
                    Aktif tasarım: <strong className="text-white">{currentSelectedDesign.name}</strong> ({currentSelectedDesign.code})
                  </p>
                </div>
                <button onClick={() => setModalMode('browse')} className="text-slate-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="bg-indigo-950/40 border border-indigo-800/60 p-3.5 rounded-xl flex items-center justify-between text-xs">
                <div>
                  <span className="text-slate-400">Önceki Revizyon: </span>
                  <strong className="text-slate-200 font-mono">{currentSelectedDesign.currentRevId}</strong>
                </div>
                <ArrowRight className="w-4 h-4 text-indigo-400" />
                <div>
                  <span className="text-slate-400">Yeni Revizyon Kodu: </span>
                  <strong className="text-indigo-300 font-mono text-sm">
                    REV-{(currentSelectedDesign.revisions.length + 1).toString().padStart(2, '0')}
                  </strong>
                </div>
              </div>

              <div className="flex flex-col gap-3 text-xs">
                <div>
                  <label className="text-slate-300 font-medium block mb-1">Revizyonu Yapan Mühendis</label>
                  <input
                    type="text"
                    value={bumpAuthor}
                    onChange={(e) => setBumpAuthor(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-slate-300 font-medium block mb-1">
                    Revizyon Değişiklik Notları & Gerekçe
                  </label>
                  <textarea
                    rows={4}
                    placeholder="örn: Saha testleri sonucunda kapağın daha hızlı açılması için F1 kuvveti 400N'dan 500N'a çıkarıldı. Strok 180mm yapıldı."
                    value={bumpNotes}
                    onChange={(e) => setBumpNotes(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Diff Preview before bump */}
              <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 text-xs">
                <span className="text-slate-400 font-mono text-[10px] uppercase block mb-1">Yeni Revizyonda Güncellenecek Değerler:</span>
                <div className="flex flex-wrap items-center gap-3 font-mono text-cyan-300">
                  <span>Strok: {currentParams.stroke} mm</span>
                  <span>·</span>
                  <span>Açık Boy: {currentParams.extLength} mm</span>
                  <span>·</span>
                  <span className="text-amber-400">F1: {currentParams.forceN} N</span>
                  <span>·</span>
                  <span>Basınç: {currentCalc.requiredPressureBar.toFixed(1)} Bar</span>
                  <span>·</span>
                  <span className="text-slate-300">{currentCalc.partNumber}</span>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  onClick={() => setModalMode('browse')}
                  className="px-4 py-2 text-xs text-slate-400 hover:text-white rounded-lg cursor-pointer"
                >
                  Vazgeç
                </button>
                <button
                  onClick={handleExecuteBumpRev}
                  disabled={!bumpNotes.trim()}
                  className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg disabled:opacity-50 flex items-center gap-1.5 cursor-pointer shadow-md"
                >
                  <GitCommit className="w-4 h-4" />
                  <span>Yeni Revizyon Olarak Kaydet</span>
                </button>
              </div>
            </div>
          )}

          {/* MODE 4: COMPARE REVISIONS (DIFF) */}
          {modalMode === 'compare' && currentSelectedDesign && revA && revB && (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-950 p-4 rounded-xl border border-slate-800">
                <div className="flex items-center gap-2">
                  <GitCompare className="w-5 h-5 text-amber-400" />
                  <div>
                    <h4 className="text-sm font-semibold text-white">
                      Revizyon Karşılaştırma Matrisi (Diff)
                    </h4>
                    <p className="text-xs text-slate-400">
                      {currentSelectedDesign.name} ({currentSelectedDesign.code})
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5 text-xs">
                    <span className="text-slate-400">Revizyon 1:</span>
                    <select
                      value={compareRevAId}
                      onChange={(e) => setCompareRevAId(e.target.value)}
                      className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white font-mono"
                    >
                      {currentSelectedDesign.revisions.map((r) => (
                        <option key={r.revId} value={r.revId}>
                          {r.revId} ({new Date(r.timestamp).toLocaleDateString('tr-TR')})
                        </option>
                      ))}
                    </select>
                  </div>

                  <span className="text-slate-500">↔</span>

                  <div className="flex items-center gap-1.5 text-xs">
                    <span className="text-slate-400">Revizyon 2:</span>
                    <select
                      value={compareRevBId}
                      onChange={(e) => setCompareRevBId(e.target.value)}
                      className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white font-mono"
                    >
                      {currentSelectedDesign.revisions.map((r) => (
                        <option key={r.revId} value={r.revId}>
                          {r.revId} ({new Date(r.timestamp).toLocaleDateString('tr-TR')})
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    onClick={() => setModalMode('browse')}
                    className="p-1 text-slate-400 hover:text-white ml-2"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Comparison Table */}
              <div className="overflow-x-auto bg-slate-950 rounded-xl border border-slate-800 p-4">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 font-mono uppercase text-[11px]">
                      <th className="py-2.5 px-3">Mühendislik Parametresi</th>
                      <th className="py-2.5 px-3 bg-slate-900/40 text-blue-300">{revA.revId} Değeri</th>
                      <th className="py-2.5 px-3 bg-slate-900/70 text-indigo-300">{revB.revId} Değeri</th>
                      <th className="py-2.5 px-3 text-amber-300">Değişim / Fark (Delta)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono">
                    {/* Strok */}
                    <tr>
                      <td className="py-2 px-3 text-slate-300 font-sans font-medium">Strok (S)</td>
                      <td className="py-2 px-3 bg-slate-900/40">{revA.params.stroke} mm</td>
                      <td className="py-2 px-3 bg-slate-900/70">{revB.params.stroke} mm</td>
                      <td className="py-2 px-3 font-semibold">
                        {revB.params.stroke - revA.params.stroke === 0 ? (
                          <span className="text-slate-500 font-sans">Aynı</span>
                        ) : (
                          <span className="text-emerald-400">
                            {revB.params.stroke - revA.params.stroke > 0 ? '+' : ''}
                            {revB.params.stroke - revA.params.stroke} mm
                          </span>
                        )}
                      </td>
                    </tr>

                    {/* Açık Boy */}
                    <tr>
                      <td className="py-2 px-3 text-slate-300 font-sans font-medium">Açık Boy (L)</td>
                      <td className="py-2 px-3 bg-slate-900/40">{revA.params.extLength} mm</td>
                      <td className="py-2 px-3 bg-slate-900/70">{revB.params.extLength} mm</td>
                      <td className="py-2 px-3 font-semibold">
                        {revB.params.extLength - revA.params.extLength === 0 ? (
                          <span className="text-slate-500 font-sans">Aynı</span>
                        ) : (
                          <span className="text-emerald-400">
                            {revB.params.extLength - revA.params.extLength > 0 ? '+' : ''}
                            {revB.params.extLength - revA.params.extLength} mm
                          </span>
                        )}
                      </td>
                    </tr>

                    {/* Nominal Kuvvet F1 */}
                    <tr>
                      <td className="py-2 px-3 text-slate-300 font-sans font-medium">Nominal Kuvvet (F1)</td>
                      <td className="py-2 px-3 bg-slate-900/40">{revA.params.forceN} N</td>
                      <td className="py-2 px-3 bg-slate-900/70">{revB.params.forceN} N</td>
                      <td className="py-2 px-3 font-semibold">
                        {revB.params.forceN - revA.params.forceN === 0 ? (
                          <span className="text-slate-500 font-sans">Aynı</span>
                        ) : (
                          <span className="text-amber-400">
                            {revB.params.forceN - revA.params.forceN > 0 ? '+' : ''}
                            {revB.params.forceN - revA.params.forceN} N
                          </span>
                        )}
                      </td>
                    </tr>

                    {/* İç Basınç N2 */}
                    <tr>
                      <td className="py-2 px-3 text-slate-300 font-sans font-medium">İç Gaz Basıncı (N2)</td>
                      <td className="py-2 px-3 bg-slate-900/40">{revA.calcSnapshot?.requiredPressureBar?.toFixed(1) || '-'} Bar</td>
                      <td className="py-2 px-3 bg-slate-900/70">{revB.calcSnapshot?.requiredPressureBar?.toFixed(1) || '-'} Bar</td>
                      <td className="py-2 px-3 font-semibold">
                        {revA.calcSnapshot && revB.calcSnapshot ? (
                          (revB.calcSnapshot.requiredPressureBar - revA.calcSnapshot.requiredPressureBar) === 0 ? (
                            <span className="text-slate-500 font-sans">Aynı</span>
                          ) : (
                            <span className="text-cyan-400">
                              {(revB.calcSnapshot.requiredPressureBar - revA.calcSnapshot.requiredPressureBar).toFixed(1)} Bar
                            </span>
                          )
                        ) : '-'}
                      </td>
                    </tr>

                    {/* Boru & Mil Çapı */}
                    <tr>
                      <td className="py-2 px-3 text-slate-300 font-sans font-medium">Gövde / Mil Çapı</td>
                      <td className="py-2 px-3 bg-slate-900/40">Ø{revA.params.tubeOd} / Ø{revA.params.rodOd} mm</td>
                      <td className="py-2 px-3 bg-slate-900/70">Ø{revB.params.tubeOd} / Ø{revB.params.rodOd} mm</td>
                      <td className="py-2 px-3">
                        {revA.params.tubeOd === revB.params.tubeOd && revA.params.rodOd === revB.params.rodOd ? (
                          <span className="text-slate-500 font-sans">Aynı Çap</span>
                        ) : (
                          <span className="text-purple-400 font-sans font-semibold">Değiştirildi</span>
                        )}
                      </td>
                    </tr>

                    {/* Parça Kodu */}
                    <tr>
                      <td className="py-2 px-3 text-slate-300 font-sans font-medium">İmalat Parça Kodu</td>
                      <td className="py-2 px-3 bg-slate-900/40 text-[11px]">{revA.calcSnapshot?.partNumber || '-'}</td>
                      <td className="py-2 px-3 bg-slate-900/70 text-[11px]">{revB.calcSnapshot?.partNumber || '-'}</td>
                      <td className="py-2 px-3">
                        {revA.calcSnapshot?.partNumber === revB.calcSnapshot?.partNumber ? (
                          <span className="text-slate-500 font-sans">Aynı</span>
                        ) : (
                          <span className="text-emerald-400 font-sans font-semibold">Yeni Kod</span>
                        )}
                      </td>
                    </tr>

                    {/* Revizyon Notu */}
                    <tr>
                      <td className="py-2 px-3 text-slate-300 font-sans font-medium">Revizyon Notu</td>
                      <td className="py-2 px-3 bg-slate-900/40 font-sans text-slate-300">{revA.notes}</td>
                      <td className="py-2 px-3 bg-slate-900/70 font-sans text-slate-300">{revB.notes}</td>
                      <td className="py-2 px-3 text-slate-500 font-sans">-</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
