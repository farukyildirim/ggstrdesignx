import React, { useState } from 'react';
import { GasSpringTypeDefinition, DiameterPairRule, SpringFormulaType } from '../types/cad';
import {
  X,
  RotateCcw,
  Check,
  Plus,
  Trash2,
  Sliders,
  Copy,
  Layers,
  Info,
  ShieldAlert,
} from 'lucide-react';

interface SpringTypeConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  springTypes: GasSpringTypeDefinition[];
  selectedTypeId: string;
  onSelectType: (id: string) => void;
  onUpdateType: (updated: GasSpringTypeDefinition) => void;
  onAddType?: (newType: GasSpringTypeDefinition) => void;
  onDeleteType?: (id: string) => void;
  onResetDefaults: () => void;
}

const FORMULA_TYPES: { id: SpringFormulaType; label: string; desc: string }[] = [
  { id: 'push', label: 'İtme Tipi (Push)', desc: 'Mil dışarı itilir (standart gazlı yay)' },
  { id: 'pull', label: 'Çekme Tipi (Pull / Traction)', desc: 'Mil içeri çekilir (halka odacıklı basınç)' },
  { id: 'lockable', label: 'Blokeli / Kilitlenebilir', desc: 'İç valf ile kademesiz rijit kilitlenme' },
  { id: 'stainless', label: 'Paslanmaz Çelik 316', desc: 'Deniz ve kimya için yüksek korozyon direnci' },
  { id: 'damper', label: 'Hidrolik Hız Damperi', desc: 'Kuvvet yerine hız/darbe sönümleme' },
  { id: 'custom', label: 'Özel Mühendislik Tipi', desc: 'Özel iç geometri ve toleranslar' },
];

export const SpringTypeConfigModal: React.FC<SpringTypeConfigModalProps> = ({
  isOpen,
  onClose,
  springTypes,
  selectedTypeId,
  onSelectType,
  onUpdateType,
  onAddType,
  onDeleteType,
  onResetDefaults,
}) => {
  const [activeEditingId, setActiveEditingId] = useState<string>(selectedTypeId || springTypes[0]?.id || '');
  const [activeTab, setActiveTab] = useState<'params' | 'diameterRules'>('params');

  // New Type Creation State
  const [showAddTypeModal, setShowAddTypeModal] = useState(false);
  const [newTypeName, setNewTypeName] = useState('');
  const [newTypeFormula, setNewTypeFormula] = useState<SpringFormulaType>('push');
  const [newTypeDesc, setNewTypeDesc] = useState('');
  const [newTypeK, setNewTypeK] = useState(1.35);
  const [newTypeDeadLen, setNewTypeDeadLen] = useState(40);
  const [newTypeMaxPress, setNewTypeMaxPress] = useState(180);

  // New Diameter Rule State
  const [showAddRuleForm, setShowAddRuleForm] = useState(false);
  const [newRuleTubeOd, setNewRuleTubeOd] = useState<number>(18);
  const [newRuleRodOd, setNewRuleRodOd] = useState<number>(8);
  const [newRuleK, setNewRuleK] = useState<number>(1.35);
  const [newRuleDeadLen, setNewRuleDeadLen] = useState<number>(40);
  const [newRuleMaxPress, setNewRuleMaxPress] = useState<number>(180);
  const [newRuleMaxForce, setNewRuleMaxForce] = useState<number>(800);
  const [newRuleTubeWall, setNewRuleTubeWall] = useState<number>(1.5);
  const [newRuleNote, setNewRuleNote] = useState<string>('');

  if (!isOpen) return null;

  const currentType = springTypes.find((t) => t.id === activeEditingId) || springTypes[0] || {
    id: 'type_fallback',
    name: 'Standart İtme',
    formulaType: 'push',
    description: '',
    kFactor: 1.35,
    deadLengthMm: 40,
    maxPressureBar: 180,
    oilDampingRatio: 0.12,
    tempMinC: -30,
    tempMaxC: 80,
    materialGrade: 'St 37-2BK',
  };

  const handleFieldChange = (field: keyof GasSpringTypeDefinition, val: any) => {
    onUpdateType({
      ...currentType,
      [field]: val,
    });
  };

  const handleCreateNewType = () => {
    if (!newTypeName.trim()) return;
    const newId = `type_custom_${Date.now()}`;
    const newTypeObj: GasSpringTypeDefinition = {
      id: newId,
      name: newTypeName.trim(),
      formulaType: newTypeFormula,
      description: newTypeDesc.trim() || 'Kullanıcı tanımlı özel gazlı amortisör tipi.',
      kFactor: newTypeK,
      deadLengthMm: newTypeDeadLen,
      maxPressureBar: newTypeMaxPress,
      oilDampingRatio: 0.15,
      tempMinC: -25,
      tempMaxC: 80,
      materialGrade: 'İmalat Çeliği & Sert Krom Mil',
      isCustom: true,
      diameterRules: [
        {
          id: `rule_${newId}_18_8`,
          tubeOd: 18,
          rodOd: 8,
          kFactor: newTypeK,
          deadLengthMm: newTypeDeadLen,
          maxPressureBar: newTypeMaxPress,
          maxForceN: 800,
          tubeWallMm: 1.5,
          note: 'Standart Çap Eşleşmesi',
        },
      ],
    };

    if (onAddType) {
      onAddType(newTypeObj);
    }
    setActiveEditingId(newId);
    onSelectType(newId);
    setShowAddTypeModal(false);
    setNewTypeName('');
    setNewTypeDesc('');
  };

  const handleDuplicateType = () => {
    const cloneId = `type_clone_${Date.now()}`;
    const cloneObj: GasSpringTypeDefinition = {
      ...currentType,
      id: cloneId,
      name: `${currentType.name} (Kopya)`,
      isCustom: true,
      diameterRules: currentType.diameterRules
        ? currentType.diameterRules.map((r) => ({ ...r, id: `rule_${Date.now()}_${Math.random().toString(36).substring(2, 6)}` }))
        : [],
    };
    if (onAddType) {
      onAddType(cloneObj);
    }
    setActiveEditingId(cloneId);
    onSelectType(cloneId);
  };

  const handleDeleteType = (idToDelete: string) => {
    if (springTypes.length <= 1) return;
    if (confirm(`"${currentType.name}" amortisör tipini silmek istediğinize emin misiniz?`)) {
      if (onDeleteType) {
        onDeleteType(idToDelete);
      }
      const remaining = springTypes.filter((t) => t.id !== idToDelete);
      if (remaining.length > 0) {
        setActiveEditingId(remaining[0].id);
        onSelectType(remaining[0].id);
      }
    }
  };

  // Diameter Rule Management
  const handleAddDiameterRule = () => {
    const rules = currentType.diameterRules ? [...currentType.diameterRules] : [];
    const newRule: DiameterPairRule = {
      id: `rule_${Date.now()}`,
      tubeOd: newRuleTubeOd,
      rodOd: newRuleRodOd,
      kFactor: newRuleK,
      deadLengthMm: newRuleDeadLen,
      maxPressureBar: newRuleMaxPress,
      maxForceN: newRuleMaxForce,
      tubeWallMm: newRuleTubeWall,
      note: newRuleNote.trim() || `Ø${newRuleTubeOd}/Ø${newRuleRodOd} Çap Kuralı`,
    };

    // Replace if exists for same tubeOd and rodOd, or append
    const existingIdx = rules.findIndex((r) => r.tubeOd === newRuleTubeOd && r.rodOd === newRuleRodOd);
    if (existingIdx >= 0) {
      rules[existingIdx] = newRule;
    } else {
      rules.push(newRule);
    }

    onUpdateType({
      ...currentType,
      diameterRules: rules,
    });
    setShowAddRuleForm(false);
    setNewRuleNote('');
  };

  const handleDeleteDiameterRule = (ruleId: string) => {
    if (!currentType.diameterRules) return;
    const updated = currentType.diameterRules.filter((r) => r.id !== ruleId);
    onUpdateType({
      ...currentType,
      diameterRules: updated,
    });
  };

  const handleUpdateDiameterRuleField = (ruleId: string, field: keyof DiameterPairRule, val: any) => {
    if (!currentType.diameterRules) return;
    const updated = currentType.diameterRules.map((r) => {
      if (r.id === ruleId) {
        return { ...r, [field]: val };
      }
      return r;
    });
    onUpdateType({
      ...currentType,
      diameterRules: updated,
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-5xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/80">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">
                Amortisör Tipleri & Hesaplama Parametreleri Yönetimi
              </h3>
              <p className="text-xs text-slate-400">
                Yeni tip ekleyin, K-faktörünü ve sızdırmazlık ölü boyunu silindir ve mil çapına göre özelleştirin
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Main Body */}
        <div className="p-6 overflow-y-auto flex-1 grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* Left Column: Spring Types List */}
          <div className="md:col-span-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider font-mono">
                Tipler ({springTypes.length})
              </span>
              <button
                type="button"
                onClick={() => setShowAddTypeModal(true)}
                className="px-2.5 py-1 text-xs font-medium text-cyan-300 bg-cyan-950/70 hover:bg-cyan-900/80 border border-cyan-800/80 rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Yeni Tip Ekle</span>
              </button>
            </div>

            <div className="flex flex-col gap-2 overflow-y-auto max-h-[440px] pr-1">
              {springTypes.map((type) => {
                const isSelected = type.id === selectedTypeId;
                const isEditing = type.id === activeEditingId;
                const rulesCount = type.diameterRules?.length || 0;
                return (
                  <div
                    key={type.id}
                    onClick={() => {
                      setActiveEditingId(type.id);
                      onSelectType(type.id);
                    }}
                    className={`p-3 rounded-xl border cursor-pointer transition-all flex flex-col gap-1.5 ${
                      isEditing
                        ? 'bg-blue-950/80 border-blue-500 shadow-md ring-1 ring-blue-500/40'
                        : 'bg-slate-950/50 border-slate-800 hover:bg-slate-800/50 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <strong className="text-xs font-semibold text-white flex items-center gap-1.5 truncate">
                        {type.name}
                      </strong>
                      <div className="flex items-center gap-1 shrink-0">
                        {type.isCustom && (
                          <span className="text-[9px] px-1.5 py-0.2 bg-purple-950 text-purple-300 border border-purple-800 rounded font-medium">
                            Özel
                          </span>
                        )}
                        {isSelected && (
                          <span className="text-[10px] px-1.5 py-0.2 bg-emerald-950 text-emerald-300 border border-emerald-800 rounded font-medium">
                            Aktif
                          </span>
                        )}
                      </div>
                    </div>
                    <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                      {type.description}
                    </p>
                    <div className="flex items-center justify-between text-[10px] font-mono text-cyan-300 pt-1 border-t border-slate-800/70">
                      <span>K: {type.kFactor.toFixed(2)}</span>
                      <span>·</span>
                      <span>Ölü Boy: {type.deadLengthMm}mm</span>
                      <span>·</span>
                      <span className="text-indigo-300">
                        {rulesCount} Çap Kuralı
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            <button
              onClick={onResetDefaults}
              className="mt-auto flex items-center justify-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 bg-slate-800/50 hover:bg-slate-800 p-2 rounded-lg border border-slate-700/60 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Fabrika Standartlarına Sıfırla</span>
            </button>
          </div>

          {/* Right Column: Parameters & Diameter Pairing Rules Editor */}
          <div className="md:col-span-8 bg-slate-950 p-5 rounded-xl border border-slate-800 flex flex-col gap-4">
            {/* Header of Right Column with Action Buttons */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-semibold text-white">
                    {currentType.name}
                  </h4>
                  {currentType.id === selectedTypeId && (
                    <span className="text-[10px] px-1.5 py-0.5 bg-emerald-950 text-emerald-300 border border-emerald-800 rounded">
                      CAD Aktif Tipi
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 mt-0.5">{currentType.description}</p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleDuplicateType}
                  className="px-2.5 py-1 text-xs text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 flex items-center gap-1 transition-colors cursor-pointer"
                  title="Bu tipi kopyala"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Klonla</span>
                </button>
                {springTypes.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleDeleteType(currentType.id)}
                    className="px-2.5 py-1 text-xs text-red-400 bg-red-950/60 hover:bg-red-900/60 rounded-lg border border-red-800/70 flex items-center gap-1 transition-colors cursor-pointer"
                    title="Bu tipi sil"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Sil</span>
                  </button>
                )}
              </div>
            </div>

            {/* Navigation Tabs: 1. Genel Parametreler | 2. Silindir & Mil Çapına Göre Özelleştirme */}
            <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
              <button
                type="button"
                onClick={() => setActiveTab('params')}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                  activeTab === 'params'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 bg-slate-900'
                }`}
              >
                1. Genel Özellikler & Hesaplama Parametreleri
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('diameterRules')}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'diameterRules'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 bg-slate-900'
                }`}
              >
                <Layers className="w-3.5 h-3.5 text-cyan-400" />
                <span>2. Silindir & Mil Çapı Özelleştirme Matrisi</span>
                <span className="text-[10px] px-1.5 py-0.2 bg-blue-950 border border-blue-800 rounded font-mono text-cyan-300">
                  {currentType.diameterRules?.length || 0}
                </span>
              </button>
            </div>

            {/* TAB 1: General Parameters */}
            {activeTab === 'params' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                {/* Type Name */}
                <div className="flex flex-col gap-1.5 sm:col-span-2">
                  <label className="text-slate-300 font-medium">Tip Adı</label>
                  <input
                    type="text"
                    value={currentType.name}
                    onChange={(e) => handleFieldChange('name', e.target.value)}
                    className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white font-medium focus:outline-none focus:border-blue-500"
                  />
                </div>

                {/* Formula Type */}
                <div className="flex flex-col gap-1.5 sm:col-span-2">
                  <label className="text-slate-300 font-medium">Çalışma Formülü & Kinematik Davranış</label>
                  <select
                    value={currentType.formulaType}
                    onChange={(e) => handleFieldChange('formulaType', e.target.value as SpringFormulaType)}
                    className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white font-medium focus:outline-none focus:border-blue-500"
                  >
                    {FORMULA_TYPES.map((ft) => (
                      <option key={ft.id} value={ft.id}>
                        {ft.label} - {ft.desc}
                      </option>
                    ))}
                  </select>
                </div>

                {/* K-Factor */}
                <div className="flex flex-col gap-1.5 bg-slate-900/70 p-3 rounded-lg border border-slate-800">
                  <div className="flex justify-between items-center">
                    <label className="text-slate-300 font-medium">İlerleyiş Faktörü (K = F2/F1)</label>
                    <span className="font-mono text-cyan-300 font-semibold">{currentType.kFactor.toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min={1.05}
                    max={1.60}
                    step={0.01}
                    value={currentType.kFactor}
                    onChange={(e) => handleFieldChange('kFactor', parseFloat(e.target.value))}
                    className="accent-blue-500 cursor-pointer h-1.5 bg-slate-700 rounded-lg"
                  />
                  <span className="text-[10px] text-slate-500">
                    Tam sıkışma anında F2 kuvvetinin nominal F1 kuvvetine oranı (varsayılan: 1.35)
                  </span>
                </div>

                {/* Dead length */}
                <div className="flex flex-col gap-1.5 bg-slate-900/70 p-3 rounded-lg border border-slate-800">
                  <div className="flex justify-between items-center">
                    <label className="text-slate-300 font-medium">Sızdırmazlık Ölü Boyu (mm)</label>
                    <span className="font-mono text-cyan-300 font-semibold">{currentType.deadLengthMm} mm</span>
                  </div>
                  <input
                    type="number"
                    min={20}
                    max={120}
                    value={currentType.deadLengthMm}
                    onChange={(e) => handleFieldChange('deadLengthMm', Number(e.target.value) || 40)}
                    className="bg-slate-950 border border-slate-700 rounded px-2.5 py-1 text-white font-mono focus:outline-none focus:border-blue-500"
                  />
                  <span className="text-[10px] text-slate-500">
                    Keçe paketi, kılavuz burç ve dip tapa için ayrılan boy payı
                  </span>
                </div>

                {/* Max allowable pressure */}
                <div className="flex flex-col gap-1.5 bg-slate-900/70 p-3 rounded-lg border border-slate-800">
                  <div className="flex justify-between items-center">
                    <label className="text-slate-300 font-medium">Azami Müsaade Edilen Basınç</label>
                    <span className="font-mono text-amber-300 font-semibold">{currentType.maxPressureBar} Bar</span>
                  </div>
                  <input
                    type="number"
                    min={40}
                    max={300}
                    step={5}
                    value={currentType.maxPressureBar}
                    onChange={(e) => handleFieldChange('maxPressureBar', Number(e.target.value) || 180)}
                    className="bg-slate-950 border border-slate-700 rounded px-2.5 py-1 text-white font-mono focus:outline-none focus:border-blue-500"
                  />
                  <span className="text-[10px] text-slate-500">
                    Keçe ve silindir gövdesinin patlama emniyeti tavan değeri
                  </span>
                </div>

                {/* Oil damping ratio */}
                <div className="flex flex-col gap-1.5 bg-slate-900/70 p-3 rounded-lg border border-slate-800">
                  <div className="flex justify-between items-center">
                    <label className="text-slate-300 font-medium">Hidrolik Yağ Oranı (%)</label>
                    <span className="font-mono text-emerald-300 font-semibold">
                      {Math.round(currentType.oilDampingRatio * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0.05}
                    max={0.90}
                    step={0.05}
                    value={currentType.oilDampingRatio}
                    onChange={(e) => handleFieldChange('oilDampingRatio', parseFloat(e.target.value))}
                    className="accent-emerald-500 cursor-pointer h-1.5 bg-slate-700 rounded-lg"
                  />
                  <span className="text-[10px] text-slate-500">
                    Son konum hidrolik frenleme ve keçe yağlama payı
                  </span>
                </div>

                {/* Temperature limits */}
                <div className="flex flex-col gap-1.5 bg-slate-900/70 p-3 rounded-lg border border-slate-800 sm:col-span-2">
                  <label className="text-slate-300 font-medium">Çalışma Sıcaklığı Aralığı (°C)</label>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400 text-xs">Min:</span>
                      <input
                        type="number"
                        value={currentType.tempMinC}
                        onChange={(e) => handleFieldChange('tempMinC', Number(e.target.value))}
                        className="bg-slate-950 border border-slate-700 rounded px-2 py-1 text-white font-mono w-full"
                      />
                      <span className="text-slate-400">°C</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400 text-xs">Max:</span>
                      <input
                        type="number"
                        value={currentType.tempMaxC}
                        onChange={(e) => handleFieldChange('tempMaxC', Number(e.target.value))}
                        className="bg-slate-950 border border-slate-700 rounded px-2 py-1 text-white font-mono w-full"
                      />
                      <span className="text-slate-400">°C</span>
                    </div>
                  </div>
                </div>

                {/* Material specification */}
                <div className="flex flex-col gap-1 sm:col-span-2">
                  <label className="text-slate-300 font-medium">Malzeme ve İmalat Standardı</label>
                  <input
                    type="text"
                    value={currentType.materialGrade}
                    onChange={(e) => handleFieldChange('materialGrade', e.target.value)}
                    className="bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-white"
                  />
                </div>
              </div>
            )}

            {/* TAB 2: Diameter Pairing Rules */}
            {activeTab === 'diameterRules' && (
              <div className="flex flex-col gap-3 text-xs">
                <div className="flex items-center justify-between bg-slate-900/90 p-3 rounded-lg border border-slate-800">
                  <div className="flex items-center gap-2">
                    <Info className="w-4 h-4 text-cyan-400 shrink-0" />
                    <span className="text-slate-300">
                      Silindir ve mil çapı seçildiğinde, buradaki özel K-faktörü, ölü boy, azami basınç ve emniyet kuvveti otomatik olarak genel değerlerin üzerine yazılır.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowAddRuleForm(!showAddRuleForm)}
                    className="px-2.5 py-1 text-xs font-semibold text-cyan-300 bg-cyan-950 hover:bg-cyan-900 border border-cyan-800 rounded-lg flex items-center gap-1 transition-colors shrink-0 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Yeni Çap Kuralı</span>
                  </button>
                </div>

                {/* Add Rule Inline Form */}
                {showAddRuleForm && (
                  <div className="bg-slate-900 border border-cyan-800/80 rounded-xl p-4 flex flex-col gap-3 shadow-lg">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                      <strong className="text-cyan-300 flex items-center gap-1.5">
                        <Plus className="w-4 h-4" /> Yeni Silindir & Mil Çapı Kuralı Ekle
                      </strong>
                      <button
                        type="button"
                        onClick={() => setShowAddRuleForm(false)}
                        className="text-slate-400 hover:text-white"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div>
                        <label className="text-slate-400 text-[11px] block mb-1">Silindir Çapı - D (mm)</label>
                        <input
                          type="number"
                          value={newRuleTubeOd}
                          onChange={(e) => setNewRuleTubeOd(Number(e.target.value) || 18)}
                          className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-white font-mono"
                        />
                      </div>
                      <div>
                        <label className="text-slate-400 text-[11px] block mb-1">Mil Çapı - d (mm)</label>
                        <input
                          type="number"
                          value={newRuleRodOd}
                          onChange={(e) => setNewRuleRodOd(Number(e.target.value) || 8)}
                          className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-white font-mono"
                        />
                      </div>
                      <div>
                        <label className="text-slate-400 text-[11px] block mb-1">Özel K-Faktörü</label>
                        <input
                          type="number"
                          step={0.01}
                          value={newRuleK}
                          onChange={(e) => setNewRuleK(parseFloat(e.target.value) || 1.35)}
                          className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-white font-mono"
                        />
                      </div>
                      <div>
                        <label className="text-slate-400 text-[11px] block mb-1">Ölü Boy Payı (mm)</label>
                        <input
                          type="number"
                          value={newRuleDeadLen}
                          onChange={(e) => setNewRuleDeadLen(Number(e.target.value) || 40)}
                          className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-white font-mono"
                        />
                      </div>
                      <div>
                        <label className="text-slate-400 text-[11px] block mb-1">Azami Basınç (Bar)</label>
                        <input
                          type="number"
                          value={newRuleMaxPress}
                          onChange={(e) => setNewRuleMaxPress(Number(e.target.value) || 180)}
                          className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-white font-mono"
                        />
                      </div>
                      <div>
                        <label className="text-slate-400 text-[11px] block mb-1">Azami Kuvvet (N)</label>
                        <input
                          type="number"
                          value={newRuleMaxForce}
                          onChange={(e) => setNewRuleMaxForce(Number(e.target.value) || 800)}
                          className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-white font-mono"
                        />
                      </div>
                      <div>
                        <label className="text-slate-400 text-[11px] block mb-1">Et Kalınlığı (mm)</label>
                        <input
                          type="number"
                          step={0.1}
                          value={newRuleTubeWall}
                          onChange={(e) => setNewRuleTubeWall(parseFloat(e.target.value) || 1.5)}
                          className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-white font-mono"
                        />
                      </div>
                      <div>
                        <label className="text-slate-400 text-[11px] block mb-1">Kural Notu / Açıklama</label>
                        <input
                          type="text"
                          placeholder="örn. Mobilya Serisi"
                          value={newRuleNote}
                          onChange={(e) => setNewRuleNote(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-white"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setShowAddRuleForm(false)}
                        className="px-3 py-1 rounded bg-slate-800 text-slate-300 hover:bg-slate-700 cursor-pointer"
                      >
                        İptal
                      </button>
                      <button
                        type="button"
                        onClick={handleAddDiameterRule}
                        className="px-3 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white font-semibold cursor-pointer"
                      >
                        Kuralı Kaydet
                      </button>
                    </div>
                  </div>
                )}

                {/* Rules List / Table */}
                {(!currentType.diameterRules || currentType.diameterRules.length === 0) ? (
                  <div className="p-8 text-center border border-dashed border-slate-800 rounded-xl text-slate-500">
                    Bu amortisör tipi için henüz özel silindir/mil çapı kuralı tanımlanmamış. Yukarıdaki butona tıklayarak ekleyebilirsiniz.
                  </div>
                ) : (
                  <div className="flex flex-col gap-2 overflow-y-auto max-h-[380px]">
                    {currentType.diameterRules.map((rule) => (
                      <div
                        key={rule.id}
                        className="bg-slate-900/80 border border-slate-800 p-3 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-slate-700 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-blue-950/60 border border-blue-800/60 text-blue-300 rounded-lg font-mono font-bold text-xs shrink-0">
                            Ø{rule.tubeOd} / Ø{rule.rodOd}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-white">
                                Silindir Ø{rule.tubeOd}mm · Mil Ø{rule.rodOd}mm
                              </span>
                              {rule.note && (
                                <span className="text-[10px] text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded">
                                  {rule.note}
                                </span>
                              )}
                            </div>
                            <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400 font-mono mt-1">
                              <span>K: <strong className="text-cyan-300">{rule.kFactor}</strong></span>
                              <span>·</span>
                              <span>Ölü Boy: <strong className="text-cyan-300">{rule.deadLengthMm} mm</strong></span>
                              <span>·</span>
                              <span>Max: <strong className="text-amber-300">{rule.maxPressureBar} Bar</strong></span>
                              {rule.maxForceN && (
                                <>
                                  <span>·</span>
                                  <span>Max F: <strong className="text-emerald-300">{rule.maxForceN} N</strong></span>
                                </>
                              )}
                              {rule.tubeWallMm && (
                                <>
                                  <span>·</span>
                                  <span>Et: <strong className="text-slate-300">{rule.tubeWallMm} mm</strong></span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Inline Edit Quick Inputs */}
                        <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                          <button
                            type="button"
                            onClick={() => handleDeleteDiameterRule(rule.id)}
                            className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded transition-colors cursor-pointer"
                            title="Bu çap kuralını sil"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="mt-auto pt-3 border-t border-slate-800 flex justify-end">
              <button
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-md"
              >
                <Check className="w-4 h-4" />
                <span>Parametreleri Onayla & Kapat</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* New Spring Type Modal Overlay */}
      {showAddTypeModal && (
        <div className="fixed inset-0 z-60 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-5 max-w-md w-full shadow-2xl flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
              <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-cyan-400" />
                <span>Yeni Amortisör Tipi Ekle</span>
              </h4>
              <button
                onClick={() => setShowAddTypeModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex flex-col gap-3 text-xs">
              <div>
                <label className="text-slate-300 font-medium block mb-1">Amortisör Tip Adı</label>
                <input
                  type="text"
                  placeholder="örn. Ağır Hizmet Çift Tüp Amortisör"
                  value={newTypeName}
                  onChange={(e) => setNewTypeName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-slate-300 font-medium block mb-1">Çalışma Karakteristiği</label>
                <select
                  value={newTypeFormula}
                  onChange={(e) => setNewTypeFormula(e.target.value as SpringFormulaType)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-white focus:outline-none focus:border-blue-500"
                >
                  {FORMULA_TYPES.map((ft) => (
                    <option key={ft.id} value={ft.id}>
                      {ft.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-slate-300 font-medium block mb-1">Açıklama</label>
                <textarea
                  rows={2}
                  placeholder="Kullanım alanı ve teknik özellikleri..."
                  value={newTypeDesc}
                  onChange={(e) => setNewTypeDesc(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-slate-400 text-[11px] block mb-1">K-Faktörü</label>
                  <input
                    type="number"
                    step={0.01}
                    value={newTypeK}
                    onChange={(e) => setNewTypeK(parseFloat(e.target.value) || 1.35)}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-400 text-[11px] block mb-1">Ölü Boy (mm)</label>
                  <input
                    type="number"
                    value={newTypeDeadLen}
                    onChange={(e) => setNewTypeDeadLen(Number(e.target.value) || 40)}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-400 text-[11px] block mb-1">Max Bar</label>
                  <input
                    type="number"
                    value={newTypeMaxPress}
                    onChange={(e) => setNewTypeMaxPress(Number(e.target.value) || 180)}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-white font-mono"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowAddTypeModal(false)}
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-white rounded"
              >
                İptal
              </button>
              <button
                type="button"
                onClick={handleCreateNewType}
                disabled={!newTypeName.trim()}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg disabled:opacity-50 cursor-pointer shadow-md"
              >
                Tipi Oluştur & Seç
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
