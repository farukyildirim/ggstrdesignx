import React, { useState, useMemo } from 'react';
import { SavedDesign, DesignRevision, GasSpringParams, CalculationResult } from '../types/cad';
import { GitCommit, X, Check, ArrowRight, AlertTriangle, User, FileText, Calendar } from 'lucide-react';

interface QuickRevisionModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentDesign: SavedDesign;
  currentRev: DesignRevision;
  currentParams: GasSpringParams;
  currentCalc: CalculationResult;
  onSaveRevision: (nextRevId: string, notes: string, author: string) => void;
}

export const QuickRevisionModal: React.FC<QuickRevisionModalProps> = ({
  isOpen,
  onClose,
  currentDesign,
  currentRev,
  currentParams,
  currentCalc,
  onSaveRevision,
}) => {
  // Suggest next revision number (e.g. REV-01 -> REV-02, REV-02 -> REV-03)
  const defaultNextRevId = useMemo(() => {
    const revNum = currentDesign.revisions.length + 1;
    return `REV-${revNum.toString().padStart(2, '0')}`;
  }, [currentDesign]);

  const [revIdInput, setRevIdInput] = useState<string>(defaultNextRevId);
  const [authorInput, setAuthorInput] = useState<string>(currentRev.author || 'CAD Tasarım Mühendisi');
  const [notesInput, setNotesInput] = useState<string>('');

  // Calculate detected differences
  const diffs = useMemo(() => {
    const list: { label: string; oldVal: string; newVal: string; isChanged: boolean }[] = [];

    list.push({
      label: 'Strok (S)',
      oldVal: `${currentRev.params.stroke} mm`,
      newVal: `${currentParams.stroke} mm`,
      isChanged: currentRev.params.stroke !== currentParams.stroke,
    });

    list.push({
      label: 'Açık Boy (L)',
      oldVal: `${currentRev.params.extLength} mm`,
      newVal: `${currentParams.extLength} mm`,
      isChanged: currentRev.params.extLength !== currentParams.extLength,
    });

    list.push({
      label: 'Nominal İtme Kuvveti (F1)',
      oldVal: `${currentRev.params.forceN} N`,
      newVal: `${currentParams.forceN} N`,
      isChanged: currentRev.params.forceN !== currentParams.forceN,
    });

    list.push({
      label: 'Silindir / Mil Çapı',
      oldVal: `Ø${currentRev.params.tubeOd} / Ø${currentRev.params.rodOd} mm`,
      newVal: `Ø${currentParams.tubeOd} / Ø${currentParams.rodOd} mm`,
      isChanged:
        currentRev.params.tubeOd !== currentParams.tubeOd ||
        currentRev.params.rodOd !== currentParams.rodOd,
    });

    list.push({
      label: 'Gerekli İç Gaz Basıncı (N2)',
      oldVal: `${currentRev.calcSnapshot?.requiredPressureBar?.toFixed(1) || '-'} Bar`,
      newVal: `${currentCalc.requiredPressureBar.toFixed(1)} Bar`,
      isChanged:
        Math.abs((currentRev.calcSnapshot?.requiredPressureBar || 0) - currentCalc.requiredPressureBar) > 0.2,
    });

    list.push({
      label: 'Uç Mafsalları (Mil / Gövde)',
      oldVal: `${currentRev.params.rodFittingId.slice(0, 12)} / ${currentRev.params.tubeFittingId.slice(0, 12)}`,
      newVal: `${currentParams.rodFittingId.slice(0, 12)} / ${currentParams.tubeFittingId.slice(0, 12)}`,
      isChanged:
        currentRev.params.rodFittingId !== currentParams.rodFittingId ||
        currentRev.params.tubeFittingId !== currentParams.tubeFittingId,
    });

    list.push({
      label: 'Amortisör Tipi',
      oldVal: currentRev.calcSnapshot?.springTypeName || currentRev.params.springTypeId,
      newVal: currentCalc.springType.name,
      isChanged: currentRev.params.springTypeId !== currentParams.springTypeId,
    });

    return list;
  }, [currentRev, currentParams, currentCalc]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!revIdInput.trim()) return;
    onSaveRevision(
      revIdInput.trim().toUpperCase(),
      notesInput.trim() || `${revIdInput.trim()} parametre güncellemesi.`,
      authorInput.trim() || 'Mühendis'
    );
    onClose();
  };

  const changedCount = diffs.filter((d) => d.isChanged).length;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/80">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
              <GitCommit className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white flex items-center gap-2">
                <span>Yeni Revizyon No ile Kaydet</span>
                <span className="text-xs px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800 font-mono">
                  {currentDesign.code}
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                {currentDesign.name} · {currentDesign.customerOrProject}
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

        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4 text-xs overflow-y-auto max-h-[80vh]">
          {/* Revision Number Tracking Strip */}
          <div className="grid grid-cols-2 gap-3 bg-slate-950 p-4 rounded-xl border border-slate-800">
            <div className="flex flex-col gap-1">
              <span className="text-slate-400 text-[11px]">Önceki Revizyon No:</span>
              <strong className="font-mono text-base text-slate-300 flex items-center gap-2">
                <span>{currentRev.revId}</span>
                <span className="text-[10px] text-slate-500 font-normal">
                  ({new Date(currentRev.timestamp).toLocaleDateString('tr-TR')})
                </span>
              </strong>
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-indigo-400 font-medium text-[11px]">Yeni Revizyon No:</span>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={revIdInput}
                  onChange={(e) => setRevIdInput(e.target.value)}
                  placeholder="REV-03"
                  className="bg-slate-900 border border-indigo-500 rounded-lg px-3 py-1 text-sm font-mono text-white font-bold focus:outline-none focus:ring-1 focus:ring-indigo-400 uppercase w-32"
                  required
                />
                <span className="text-[11px] text-slate-400">olarak kaydedilecek</span>
              </div>
            </div>
          </div>

          {/* Author and Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-slate-300 font-medium block mb-1">Revizyonu Yapan Mühendis</label>
              <div className="relative">
                <User className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  value={authorInput}
                  onChange={(e) => setAuthorInput(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-8 pr-3 py-1.5 text-white focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>
            </div>
            <div>
              <label className="text-slate-300 font-medium block mb-1">Kayıt Tarihi</label>
              <div className="relative">
                <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  disabled
                  value={new Date().toLocaleString('tr-TR')}
                  className="w-full bg-slate-950/60 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-slate-400 font-mono"
                />
              </div>
            </div>
          </div>

          {/* Revision Change Notes */}
          <div>
            <label className="text-slate-300 font-medium block mb-1">
              Revizyon Gerekçesi & Değişiklik Notu <span className="text-indigo-400">*</span>
            </label>
            <textarea
              rows={3}
              value={notesInput}
              onChange={(e) => setNotesInput(e.target.value)}
              placeholder="örn: Müşteri saha testi sonrası kapak açılma açısını artırmak için strok 150mm'den 180mm'ye çıkarıldı. F1 kuvveti 500N yapıldı."
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-indigo-500"
              required
            />
          </div>

          {/* Detected Parameter Differences Table */}
          <div className="bg-slate-950 rounded-xl border border-slate-800 p-3.5 flex flex-col gap-2">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
              <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-indigo-400" />
                <span>Tespit Edilen Parametre Değişimleri ({changedCount} Değişiklik)</span>
              </span>
              <span className="text-[10px] text-slate-500 font-mono">
                {currentRev.revId} → {revIdInput}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left font-mono text-[11px]">
                <thead>
                  <tr className="text-slate-500 border-b border-slate-800/50">
                    <th className="py-1 px-2 font-sans font-normal">Parametre</th>
                    <th className="py-1 px-2 font-sans font-normal">Eski ({currentRev.revId})</th>
                    <th className="py-1 px-2 font-sans font-normal">Yeni ({revIdInput})</th>
                    <th className="py-1 px-2 font-sans font-normal">Durum</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40">
                  {diffs.map((d, idx) => (
                    <tr key={idx} className={d.isChanged ? 'bg-amber-950/20 text-amber-200' : 'text-slate-400'}>
                      <td className="py-1.5 px-2 font-sans font-medium text-slate-300">{d.label}</td>
                      <td className="py-1.5 px-2">{d.oldVal}</td>
                      <td className="py-1.5 px-2 font-bold text-white">{d.newVal}</td>
                      <td className="py-1.5 px-2">
                        {d.isChanged ? (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-950 text-amber-300 border border-amber-800">
                            Değiştirildi
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-500 font-sans">Aynı</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-800">
            <span className="text-[11px] text-slate-400">
              Bu revizyon dizayn geçmişine kaydedilecek ve aktif CAD versiyonu olacaktır.
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-1.5 text-xs text-slate-400 hover:text-white rounded-lg cursor-pointer"
              >
                İptal
              </button>
              <button
                type="submit"
                disabled={!notesInput.trim()}
                className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer shadow-md disabled:opacity-50"
              >
                <Check className="w-4 h-4" />
                <span>{revIdInput} Olarak Kaydet</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
