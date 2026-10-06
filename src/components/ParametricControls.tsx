import React from 'react';
import {
  GasSpringParams,
  CalculationResult,
  EndFittingItem,
  GasSpringTypeDefinition,
} from '../types/cad';
import {
  Sparkles,
  RotateCcw,
  AlertTriangle,
  Info,
  Wrench,
  Sliders,
  Layers,
  Database,
  Plus,
  ArrowRight,
  FolderGit2,
  CheckCircle,
  Save,
  GitCommit,
} from 'lucide-react';

interface ParametricControlsProps {
  params: GasSpringParams;
  calc: CalculationResult;
  onChange: (updated: Partial<GasSpringParams>) => void;
  onGenerate: () => void;
  onReset: () => void;
  availableFittings: EndFittingItem[];
  availableTypes: GasSpringTypeDefinition[];
  onOpenFittingManager: () => void;
  onOpenSpringTypeConfig: () => void;
  onOpenBatchAutomation: () => void;
  onOpenErpModal: () => void;
  onOpenDesignVault?: (mode?: 'browse' | 'saveNew' | 'bumpRev') => void;
  activeDesignName?: string;
  activeRevCode?: string;
}

const TUBE_OD_OPTIONS = [15, 18, 22, 28, 40];
const ROD_OD_OPTIONS = [6, 8, 10, 14, 20];

export const ParametricControls: React.FC<ParametricControlsProps> = ({
  params,
  calc,
  onChange,
  onGenerate,
  onReset,
  availableFittings,
  availableTypes,
  onOpenFittingManager,
  onOpenSpringTypeConfig,
  onOpenBatchAutomation,
  onOpenErpModal,
  onOpenDesignVault,
  activeDesignName,
  activeRevCode,
}) => {
  const { tubeOd, rodOd, stroke, extLength, forceN, rodFittingId, tubeFittingId, springTypeId } = params;

  // Selected entities
  const currentType = availableTypes.find((t) => t.id === springTypeId) || availableTypes[0];
  const rodFitting = availableFittings.find((f) => f.id === rodFittingId) || availableFittings[0];
  const tubeFitting = availableFittings.find((f) => f.id === tubeFittingId) || availableFittings[0];

  const fixConflict = () => {
    const deadL = params.customDeadLength !== undefined ? params.customDeadLength : currentType.deadLengthMm;
    const minExt = stroke + stroke + deadL;
    onChange({ extLength: minExt });
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl flex flex-col gap-5">
      {/* Top Header & Fast Navigation Tools */}
      <div className="flex flex-col gap-3 pb-3 border-b border-slate-800">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-100 flex items-center gap-2">
            <span>⚙️</span> Parametrik CAD Motoru
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={onReset}
              className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors px-2 py-1 rounded hover:bg-slate-800 cursor-pointer"
              title="Varsayılan değerlere dön"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Sıfırla</span>
            </button>
          </div>
        </div>

        {/* Design Library & Revision Vault Banner & Quick Save Buttons */}
        {onOpenDesignVault && (
          <div className="flex flex-col gap-2">
            <div
              className="w-full p-2.5 rounded-xl bg-gradient-to-r from-blue-950/80 via-indigo-950/70 to-slate-950 border border-indigo-700/60 flex items-center justify-between shadow-sm"
            >
              <button
                type="button"
                onClick={() => onOpenDesignVault('browse')}
                className="flex items-center gap-2.5 text-left flex-1 min-w-0 cursor-pointer group"
                title="Tasarım arşivini aç"
              >
                <div className="p-1.5 rounded-lg bg-indigo-600/30 text-indigo-400 border border-indigo-500/40 group-hover:scale-105 transition-transform shrink-0">
                  <FolderGit2 className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-white truncate">
                      {activeDesignName || 'Dizayn Kütüphanesi & Arşiv'}
                    </span>
                    {activeRevCode && (
                      <span className="text-[10px] font-mono px-1.5 py-0.2 bg-indigo-950 text-indigo-300 border border-indigo-800 rounded font-bold shrink-0">
                        {activeRevCode}
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-slate-400 block truncate">
                    Arşivden çağır, karşılaştır veya revizyon takip et
                  </span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => onOpenDesignVault('browse')}
                className="p-1.5 text-indigo-400 hover:text-white rounded-lg hover:bg-indigo-900/50 transition-colors cursor-pointer shrink-0 ml-1"
                title="Dizayn Arşivini Aç"
              >
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            {/* Direct Quick Save & Revision Buttons */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => onOpenDesignVault('saveNew')}
                className="px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-emerald-950/70 hover:bg-emerald-900/80 text-emerald-300 border border-emerald-700/70 hover:border-emerald-500 flex items-center justify-center gap-1.5 transition-all shadow-sm active:scale-95 cursor-pointer"
                title="Mevcut ölçü ve parametreleri yeni bir dizayn olarak kaydet"
              >
                <Save className="w-3.5 h-3.5 text-emerald-400" />
                <span>💾 Yeni Tasarım Kaydet</span>
              </button>

              <button
                type="button"
                onClick={() => onOpenDesignVault('bumpRev')}
                className="px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-indigo-950/70 hover:bg-indigo-900/80 text-indigo-300 border border-indigo-700/70 hover:border-indigo-500 flex items-center justify-center gap-1.5 transition-all shadow-sm active:scale-95 cursor-pointer"
                title="Mevcut tasarıma yeni revizyon numarası ekle (örn. REV-02, REV-03)"
              >
                <GitCommit className="w-3.5 h-3.5 text-indigo-400" />
                <span>⚡ Revizyon Yükselt</span>
              </button>
            </div>
          </div>
        )}

        {/* Automation & ERP Quick Action Hub */}
        <div className="grid grid-cols-2 gap-2 pt-0.5">
          <button
            type="button"
            onClick={onOpenBatchAutomation}
            className="px-3 py-2 text-xs font-semibold rounded-lg bg-gradient-to-r from-cyan-950 to-blue-950 hover:from-cyan-900 hover:to-blue-900 text-cyan-300 border border-cyan-800/60 flex items-center justify-between transition-all shadow-sm active:scale-95 cursor-pointer"
          >
            <span className="flex items-center gap-1.5 truncate">
              <Layers className="w-4 h-4 text-cyan-400 shrink-0" />
              <span className="truncate">Toplu Dizayn</span>
            </span>
            <ArrowRight className="w-3.5 h-3.5 shrink-0" />
          </button>

          <button
            type="button"
            onClick={onOpenErpModal}
            className="px-3 py-2 text-xs font-semibold rounded-lg bg-gradient-to-r from-emerald-950 to-slate-900 hover:from-emerald-900 hover:to-slate-800 text-emerald-300 border border-emerald-800/60 flex items-center justify-between transition-all shadow-sm active:scale-95 cursor-pointer"
          >
            <span className="flex items-center gap-1.5 truncate">
              <Database className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="truncate">ERP & BOM</span>
            </span>
            <ArrowRight className="w-3.5 h-3.5 shrink-0" />
          </button>
        </div>
      </div>

      {/* 1. AMORTİSÖR TİPİ & HESAPLAMA MOTORU YÖNETİMİ */}
      <div className="flex flex-col gap-2.5 p-3.5 bg-slate-950/80 rounded-xl border border-slate-800">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-sky-400 uppercase tracking-wider font-mono flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5" />
            <span>Amortisör Tipi & Parametreleri</span>
          </span>
          <button
            type="button"
            onClick={onOpenSpringTypeConfig}
            className="text-[11px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1 hover:underline cursor-pointer"
          >
            <span>Tipleri & Çapları Yönet ⚙️</span>
          </button>
        </div>

        <select
          value={springTypeId}
          onChange={(e) => onChange({ springTypeId: e.target.value })}
          className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-medium focus:outline-none focus:border-blue-500 cursor-pointer"
        >
          {availableTypes.map((type) => (
            <option key={type.id} value={type.id}>
              {type.name} (K={type.kFactor.toFixed(2)}, Ölü Boy={type.deadLengthMm}mm)
            </option>
          ))}
        </select>

        {/* Active Diameter Rule Indicator if matched */}
        {calc.activeDiameterRule ? (
          <div className="bg-cyan-950/40 border border-cyan-800/60 rounded-lg p-2.5 text-[11px] text-cyan-200 flex flex-col gap-1">
            <div className="flex items-center justify-between font-medium">
              <span className="flex items-center gap-1 text-cyan-300">
                <CheckCircle className="w-3.5 h-3.5 text-cyan-400" />
                <span>Ø{tubeOd}/Ø{rodOd} Çap Kuralı Aktif</span>
              </span>
              {calc.activeDiameterRule.note && (
                <span className="text-[10px] text-slate-400 font-sans">
                  {calc.activeDiameterRule.note}
                </span>
              )}
            </div>
            <div className="flex items-center justify-between text-[10px] font-mono text-cyan-400">
              <span>Özel K: <strong>{calc.kFactor.toFixed(2)}</strong></span>
              <span>·</span>
              <span>Ölü Boy: <strong>{calc.activeDiameterRule.deadLengthMm} mm</strong></span>
              <span>·</span>
              <span>Max P: <strong>{calc.activeDiameterRule.maxPressureBar} Bar</strong></span>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between text-[11px] text-slate-400 pt-0.5">
            <span>K-Faktörü: <strong className="text-cyan-300 font-mono">{currentType.kFactor.toFixed(2)}</strong></span>
            <span>·</span>
            <span>Ölü Boy Payı: <strong className="text-cyan-300 font-mono">{currentType.deadLengthMm} mm</strong></span>
            <span>·</span>
            <span>Max Basınç: <strong className="text-amber-300 font-mono">{currentType.maxPressureBar} Bar</strong></span>
          </div>
        )}
      </div>

      {/* 2. GEOMETRİK ÖLÇÜLER */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold text-sky-400 uppercase tracking-wider font-mono">
            2. Geometrik Ölçüler (mm)
          </h3>
          <span className="text-[11px] text-slate-400">Milimetre cinsinden</span>
        </div>

        {/* Tube OD (D) */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-xs">
            <label className="text-slate-200 font-medium">Boru/Tüp Dış Çapı - D (mm)</label>
            <span className="font-mono text-cyan-300 font-semibold">{tubeOd} mm</span>
          </div>
          <div className="grid grid-cols-5 gap-1.5">
            {TUBE_OD_OPTIONS.map((val) => (
              <button
                key={val}
                type="button"
                onClick={() => {
                  const recRod = Math.round(val * 0.45);
                  const bestRod = ROD_OD_OPTIONS.reduce((prev, curr) =>
                    Math.abs(curr - recRod) < Math.abs(prev - recRod) ? curr : prev
                  );
                  onChange({ tubeOd: val, rodOd: bestRod });
                }}
                className={`py-1.5 text-xs font-medium rounded transition-all ${
                  tubeOd === val
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-900/40 border border-blue-500'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700/60'
                }`}
              >
                Ø{val}
              </button>
            ))}
          </div>
        </div>

        {/* Rod OD (d) */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-xs">
            <label className="text-slate-200 font-medium">Mil/Rod Çapı - d (mm)</label>
            <span className="font-mono text-cyan-300 font-semibold">
              Ø{rodOd} mm{' '}
              {calc.recommendedRod === rodOd && (
                <span className="text-[10px] text-emerald-400 font-sans font-normal">(İdeal)</span>
              )}
            </span>
          </div>
          <div className="grid grid-cols-5 gap-1.5">
            {ROD_OD_OPTIONS.map((val) => (
              <button
                key={val}
                type="button"
                onClick={() => onChange({ rodOd: val })}
                className={`py-1.5 text-xs font-medium rounded transition-all ${
                  rodOd === val
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-900/40 border border-blue-500'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700/60'
                }`}
              >
                Ø{val}
              </button>
            ))}
          </div>
        </div>

        {/* Stroke S */}
        <div className="flex flex-col gap-1.5 pt-1">
          <div className="flex items-center justify-between text-xs">
            <label className="text-slate-200 font-medium">Strok - S (mm)</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={20}
                max={500}
                step={5}
                value={stroke}
                onChange={(e) => onChange({ stroke: Number(e.target.value) || 20 })}
                className="w-16 bg-slate-800 border border-slate-700 rounded px-2 py-0.5 text-right font-mono text-cyan-300 text-xs focus:outline-none focus:border-cyan-500"
              />
              <span className="text-slate-400 text-xs">mm</span>
            </div>
          </div>
          <input
            type="range"
            min={20}
            max={500}
            step={5}
            value={stroke}
            onChange={(e) => onChange({ stroke: Number(e.target.value) })}
            className="w-full accent-blue-500 cursor-pointer h-1.5 bg-slate-700 rounded-lg"
          />
          <div className="flex justify-between text-[10px] text-slate-400 font-mono">
            <span>20 mm</span>
            <span>250 mm</span>
            <span>500 mm</span>
          </div>
        </div>

        {/* Extended Length L */}
        <div className="flex flex-col gap-1.5 pt-1">
          <div className="flex items-center justify-between text-xs">
            <label className="text-slate-200 font-medium">Açık Boy - L (mm)</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={100}
                max={1200}
                step={5}
                value={extLength}
                onChange={(e) => onChange({ extLength: Number(e.target.value) || 100 })}
                className="w-20 bg-slate-800 border border-slate-700 rounded px-2 py-0.5 text-right font-mono text-cyan-300 text-xs focus:outline-none focus:border-cyan-500"
              />
              <span className="text-slate-400 text-xs">mm</span>
            </div>
          </div>
          <input
            type="range"
            min={100}
            max={1200}
            step={5}
            value={extLength}
            onChange={(e) => onChange({ extLength: Number(e.target.value) })}
            className="w-full accent-blue-500 cursor-pointer h-1.5 bg-slate-700 rounded-lg"
          />

          {!calc.isValid && (
            <div className="bg-red-950/60 border border-red-800/80 rounded-lg p-2.5 mt-1 flex flex-col gap-2">
              <div className="flex items-start gap-2 text-xs text-red-300">
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <span>
                  Açık boy ({extLength}mm) bu strok ({stroke}mm) için yetersiz! Min açık boy:{' '}
                  <strong className="text-white">
                    {stroke + stroke + (params.customDeadLength || currentType.deadLengthMm)} mm
                  </strong> olmalıdır.
                </span>
              </div>
              <button
                type="button"
                onClick={fixConflict}
                className="self-end px-2.5 py-1 text-xs bg-red-600 hover:bg-red-500 text-white rounded font-medium transition-colors"
              >
                Otomatik Düzelt
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 3. KUVVET & BAĞLANTI ELEMANLARI YÖNETİMİ */}
      <div className="flex flex-col gap-4 pt-2 border-t border-slate-800">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold text-sky-400 uppercase tracking-wider font-mono">
            3. Kuvvet & Uç Bağlantıları
          </h3>
          <button
            type="button"
            onClick={onOpenFittingManager}
            className="text-[11px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1 hover:underline"
          >
            <Plus className="w-3 h-3" />
            <span>Yeni Mafsal Ekle / Yönet</span>
          </button>
        </div>

        {/* Force F1 */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-xs">
            <label className="text-slate-200 font-medium">Nominal Kuvvet - F1 (Newton)</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={50}
                max={2500}
                step={10}
                value={forceN}
                onChange={(e) => onChange({ forceN: Number(e.target.value) || 50 })}
                className="w-20 bg-slate-800 border border-slate-700 rounded px-2 py-0.5 text-right font-mono text-cyan-300 text-xs focus:outline-none focus:border-cyan-500"
              />
              <span className="text-slate-400 text-xs">N (~{(forceN / 9.81).toFixed(0)} kgf)</span>
            </div>
          </div>
          <input
            type="range"
            min={50}
            max={2500}
            step={10}
            value={forceN}
            onChange={(e) => onChange({ forceN: Number(e.target.value) })}
            className="w-full accent-blue-500 cursor-pointer h-1.5 bg-slate-700 rounded-lg"
          />
        </div>

        {/* Rod Fitting Selector */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-xs">
            <label className="text-slate-200 font-medium">Mil Ucu Bağlantısı (Rod End)</label>
            <span className="text-[11px] text-cyan-400 font-mono">+{rodFitting.offsetLenMm} mm</span>
          </div>
          <select
            value={rodFittingId}
            onChange={(e) => onChange({ rodFittingId: e.target.value })}
            className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
          >
            {availableFittings.map((fit) => (
              <option key={fit.id} value={fit.id}>
                {fit.name} (+{fit.offsetLenMm}mm pay)
              </option>
            ))}
          </select>
        </div>

        {/* Tube Fitting Selector */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-xs">
            <label className="text-slate-200 font-medium">Gövde Ucu Bağlantısı (Tube End)</label>
            <span className="text-[11px] text-cyan-400 font-mono">+{tubeFitting.offsetLenMm} mm</span>
          </div>
          <select
            value={tubeFittingId}
            onChange={(e) => onChange({ tubeFittingId: e.target.value })}
            className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
          >
            {availableFittings.map((fit) => (
              <option key={fit.id} value={fit.id}>
                {fit.name} (+{fit.offsetLenMm}mm pay)
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Action Buttons */}
      <div className="pt-2 flex flex-col gap-2">
        <button
          type="button"
          onClick={onGenerate}
          disabled={!calc.isValid}
          className={`w-full py-3.5 px-4 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 shadow-lg ${
            calc.isValid
              ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-blue-900/40 cursor-pointer active:scale-[0.99]'
              : 'bg-slate-800 text-slate-400 cursor-not-allowed border border-slate-700'
          }`}
        >
          <span>Renkli .STEP Montajı Oluştur ⚙️</span>
        </button>

        {onOpenDesignVault && (
          <button
            type="button"
            onClick={() => onOpenDesignVault('saveNew')}
            className="w-full py-2.5 px-3 rounded-lg font-medium text-xs bg-slate-800 hover:bg-slate-750 text-emerald-300 border border-slate-700 hover:border-emerald-600/70 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm active:scale-98"
            title="Şu anki ölçüleri ve bağlantıları yeni bir dizayn olarak kütüphaneye kaydet"
          >
            <Save className="w-3.5 h-3.5 text-emerald-400" />
            <span>💾 Bu Dizaynı Kütüphaneye Kaydet</span>
          </button>
        )}
      </div>
    </div>
  );
};
