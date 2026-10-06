import React, { useState } from 'react';
import { GasSpringTypeDefinition } from '../types/cad';
import { X, Settings, RotateCcw, Check, Plus, Trash2, Sliders, Shield } from 'lucide-react';

interface SpringTypeConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  springTypes: GasSpringTypeDefinition[];
  selectedTypeId: string;
  onSelectType: (id: string) => void;
  onUpdateType: (updated: GasSpringTypeDefinition) => void;
  onResetDefaults: () => void;
}

export const SpringTypeConfigModal: React.FC<SpringTypeConfigModalProps> = ({
  isOpen,
  onClose,
  springTypes,
  selectedTypeId,
  onSelectType,
  onUpdateType,
  onResetDefaults,
}) => {
  const [activeEditingId, setActiveEditingId] = useState<string>(selectedTypeId);

  if (!isOpen) return null;

  const currentType = springTypes.find((t) => t.id === activeEditingId) || springTypes[0];

  const handleFieldChange = (field: keyof GasSpringTypeDefinition, val: any) => {
    onUpdateType({
      ...currentType,
      [field]: val,
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
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
                Amortisör çalışma karakteristiğini, K-faktörünü, sızdırmazlık ölü boyunu ve basınç limitlerini yönetin
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* Left Column: Spring Type Selector List */}
          <div className="md:col-span-5 flex flex-col gap-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider font-mono mb-1">
              Amortisör Tipleri ({springTypes.length})
            </span>
            <div className="flex flex-col gap-1.5">
              {springTypes.map((type) => {
                const isSelected = type.id === selectedTypeId;
                const isEditing = type.id === activeEditingId;
                return (
                  <div
                    key={type.id}
                    onClick={() => {
                      setActiveEditingId(type.id);
                      onSelectType(type.id);
                    }}
                    className={`p-3 rounded-xl border cursor-pointer transition-all flex flex-col gap-1 ${
                      isEditing
                        ? 'bg-blue-950/70 border-blue-500 shadow-md'
                        : 'bg-slate-950/50 border-slate-800 hover:bg-slate-800/40 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <strong className="text-xs font-semibold text-white flex items-center gap-1.5">
                        {type.name}
                      </strong>
                      {isSelected && (
                        <span className="text-[10px] px-1.5 py-0.5 bg-emerald-950 text-emerald-300 border border-emerald-800 rounded font-medium">
                          Aktif
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                      {type.description}
                    </p>
                    <div className="flex items-center gap-3 text-[10px] font-mono text-cyan-300 pt-1">
                      <span>K: {type.kFactor.toFixed(2)}</span>
                      <span>·</span>
                      <span>Ölü Boy: {type.deadLengthMm}mm</span>
                      <span>·</span>
                      <span>Max: {type.maxPressureBar} Bar</span>
                    </div>
                  </div>
                );
              })}
            </div>

            <button
              onClick={onResetDefaults}
              className="mt-3 flex items-center justify-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 bg-slate-800/50 hover:bg-slate-800 p-2 rounded-lg border border-slate-700/60 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Fabrika Standartlarına Sıfırla</span>
            </button>
          </div>

          {/* Right Column: Parameters Editor */}
          <div className="md:col-span-7 bg-slate-950 p-5 rounded-xl border border-slate-800 flex flex-col gap-5">
            <div className="border-b border-slate-800 pb-3">
              <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                <span>🔧</span>
                <span>{currentType.name} Parametreleri</span>
              </h4>
              <p className="text-xs text-slate-400 mt-0.5">{currentType.description}</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
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
                  Tam sıkışma anında F2 kuvvetinin nominal F1 kuvvetine oranı
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
                  Keçe paketi, kılavuz burç ve dip tapa için ayrılan pay
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

            <div className="mt-auto pt-3 border-t border-slate-800 flex justify-end">
              <button
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>Parametreleri Onayla & Kapat</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
