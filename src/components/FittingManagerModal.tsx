import React, { useState } from 'react';
import { EndFittingItem, EndFittingShapeType } from '../types/cad';
import { X, Plus, Trash2, Edit2, Check, Shield, Wrench, Sparkles } from 'lucide-react';

interface FittingManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  fittings: EndFittingItem[];
  onAddFitting: (item: EndFittingItem) => void;
  onDeleteFitting: (id: string) => void;
  onUpdateFitting: (item: EndFittingItem) => void;
}

export const FittingManagerModal: React.FC<FittingManagerModalProps> = ({
  isOpen,
  onClose,
  fittings,
  onAddFitting,
  onDeleteFitting,
  onUpdateFitting,
}) => {
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form State
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState<'Mafsal' | 'Dişli' | 'Çatal' | 'Flanş' | 'Özel'>('Mafsal');
  const [formShapeType, setFormShapeType] = useState<EndFittingShapeType>('eyelet');
  const [formOffset, setFormOffset] = useState<number>(20);
  const [formHoleDia, setFormHoleDia] = useState<number>(8);
  const [formThread, setFormThread] = useState<string>('M8');
  const [formMaterial, setFormMaterial] = useState<string>('Alüminyum 6082-T6');
  const [formColor, setFormColor] = useState<string>('#1d4ed8');

  if (!isOpen) return null;

  const handleStartCreate = () => {
    setIsCreating(true);
    setEditingId(null);
    setFormName('');
    setFormCategory('Mafsal');
    setFormShapeType('eyelet');
    setFormOffset(20);
    setFormHoleDia(8);
    setFormThread('M8');
    setFormMaterial('Alüminyum 6082-T6');
    setFormColor('#1d4ed8');
  };

  const handleStartEdit = (f: EndFittingItem) => {
    setEditingId(f.id);
    setIsCreating(false);
    setFormName(f.name);
    setFormCategory(f.category);
    setFormShapeType(f.shapeType);
    setFormOffset(f.offsetLenMm);
    setFormHoleDia(f.holeDiaMm || 8);
    setFormThread(f.threadSize || 'M8');
    setFormMaterial(f.material);
    setFormColor(f.color);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;

    if (editingId) {
      const updated: EndFittingItem = {
        id: editingId,
        name: formName.trim(),
        category: formCategory,
        shapeType: formShapeType,
        offsetLenMm: Number(formOffset) || 20,
        holeDiaMm: formShapeType !== 'threaded' ? Number(formHoleDia) : undefined,
        threadSize: formShapeType === 'threaded' || formShapeType === 'ball' ? formThread : undefined,
        material: formMaterial.trim() || 'Çelik',
        color: formColor,
        isCustom: true,
      };
      onUpdateFitting(updated);
      setEditingId(null);
    } else {
      const newItem: EndFittingItem = {
        id: `custom_${Date.now()}`,
        name: formName.trim(),
        category: formCategory,
        shapeType: formShapeType,
        offsetLenMm: Number(formOffset) || 20,
        holeDiaMm: formShapeType !== 'threaded' ? Number(formHoleDia) : undefined,
        threadSize: formShapeType === 'threaded' || formShapeType === 'ball' ? formThread : undefined,
        material: formMaterial.trim() || 'Çelik',
        color: formColor,
        isCustom: true,
      };
      onAddFitting(newItem);
      setIsCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/80">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-blue-600/20 text-blue-400 border border-blue-500/30">
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">
                Uç Bağlantı Elemanları Kütüphanesi & Yönetimi
              </h3>
              <p className="text-xs text-slate-400">
                Mil ve gövde uçları için standart ve özel mafsalları tanımlayın, boy paylarını özelleştirin
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

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 flex flex-col gap-6">
          {/* Top Bar Actions */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">
              Toplam <strong className="text-white">{fittings.length}</strong> adet bağlantı elemanı kayıtlı
            </span>
            {!isCreating && !editingId && (
              <button
                onClick={handleStartCreate}
                className="px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-all flex items-center gap-1.5 shadow-md shadow-blue-900/30 active:scale-95 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Yeni Mafsal / Bağlantı Ekle</span>
              </button>
            )}
          </div>

          {/* Form for Creating or Editing */}
          {(isCreating || editingId) && (
            <form onSubmit={handleSave} className="bg-slate-950 p-4 rounded-xl border border-blue-900/60 flex flex-col gap-4 animate-in fade-in">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-xs font-semibold text-blue-400 uppercase tracking-wider font-mono">
                  {editingId ? 'Bağlantı Elemanını Düzenle' : 'Yeni Özel Bağlantı Tanımla'}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setIsCreating(false);
                    setEditingId(null);
                  }}
                  className="text-xs text-slate-400 hover:text-white"
                >
                  İptal
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                {/* Name */}
                <div className="flex flex-col gap-1 sm:col-span-2">
                  <label className="text-slate-300 font-medium">Bağlantı Adı & Tanımı</label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="Örn: Özel M10 Açısal Çatal Mafsal"
                    className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                {/* Category */}
                <div className="flex flex-col gap-1">
                  <label className="text-slate-300 font-medium">Kategori</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value as any)}
                    className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="Mafsal">Gözlü / Bilyalı Mafsal</option>
                    <option value="Çatal">Çatal Mafsal (Clevis)</option>
                    <option value="Dişli">Düz Dişli Saplama</option>
                    <option value="Flanş">Flanşlı Montaj</option>
                    <option value="Özel">Özel Tasarım</option>
                  </select>
                </div>

                {/* 3D Shape Model */}
                <div className="flex flex-col gap-1">
                  <label className="text-slate-300 font-medium">3D Model Şekli</label>
                  <select
                    value={formShapeType}
                    onChange={(e) => setFormShapeType(e.target.value as any)}
                    className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="eyelet">Gözlü Delikli Mafsal (Eyelet)</option>
                    <option value="ball">Bilyalı / Küresel Mafsal (Ball)</option>
                    <option value="clevis">Çatal Uç (Clevis Fork)</option>
                    <option value="threaded">Düz Dişli Mil (Threaded)</option>
                    <option value="flange">Flanş Plakası (Flange)</option>
                  </select>
                </div>

                {/* Offset length (L_pay) */}
                <div className="flex flex-col gap-1">
                  <label className="text-slate-300 font-medium">Boy Payı / Katkısı (mm)</label>
                  <input
                    type="number"
                    min={5}
                    max={120}
                    value={formOffset}
                    onChange={(e) => setFormOffset(Number(e.target.value) || 20)}
                    className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>

                {/* Hole Dia / Thread */}
                {formShapeType !== 'threaded' ? (
                  <div className="flex flex-col gap-1">
                    <label className="text-slate-300 font-medium">Delik / Pim Çapı (mm)</label>
                    <input
                      type="number"
                      min={3}
                      max={30}
                      value={formHoleDia}
                      onChange={(e) => setFormHoleDia(Number(e.target.value) || 8)}
                      className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white font-mono focus:outline-none focus:border-blue-500"
                    />
                  </div>
                ) : (
                  <div className="flex flex-col gap-1">
                    <label className="text-slate-300 font-medium">Diş Ölçüsü</label>
                    <input
                      type="text"
                      value={formThread}
                      onChange={(e) => setFormThread(e.target.value)}
                      placeholder="M8x1.25, M10, 5/16 UNF"
                      className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white font-mono focus:outline-none focus:border-blue-500"
                    />
                  </div>
                )}

                {/* Material */}
                <div className="flex flex-col gap-1 sm:col-span-2">
                  <label className="text-slate-300 font-medium">İmalat Malzemesi</label>
                  <input
                    type="text"
                    value={formMaterial}
                    onChange={(e) => setFormMaterial(e.target.value)}
                    placeholder="Alüminyum 6082-T6, C45 İslah, AISI 316 Paslanmaz"
                    className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                {/* Color */}
                <div className="flex flex-col gap-1">
                  <label className="text-slate-300 font-medium">CAD Rengi</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={formColor}
                      onChange={(e) => setFormColor(e.target.value)}
                      className="w-8 h-8 rounded border border-slate-700 bg-transparent cursor-pointer"
                    />
                    <span className="font-mono text-xs text-slate-300">{formColor}</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setIsCreating(false);
                    setEditingId(null);
                  }}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{editingId ? 'Güncelle' : 'Kütüphaneye Kaydet'}</span>
                </button>
              </div>
            </form>
          )}

          {/* Fittings Table */}
          <div className="overflow-x-auto border border-slate-800 rounded-xl">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-950 border-b border-slate-800 text-slate-400 uppercase text-[10px] tracking-wider">
                  <th className="py-2.5 px-3">Bağlantı Adı</th>
                  <th className="py-2.5 px-3">Tip / Kategori</th>
                  <th className="py-2.5 px-3">Boy Payı (mm)</th>
                  <th className="py-2.5 px-3">Ölçü (Delik / Diş)</th>
                  <th className="py-2.5 px-3">Malzeme</th>
                  <th className="py-2.5 px-3 text-right">İşlemler</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-sans text-slate-300">
                {fittings.map((f) => (
                  <tr key={f.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-2.5 px-3 font-medium text-white flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0 border border-white/20"
                        style={{ backgroundColor: f.color }}
                      />
                      <span>{f.name}</span>
                      {f.isCustom && (
                        <span className="text-[10px] px-1.5 py-0.2 bg-blue-950 text-blue-300 border border-blue-800 rounded">
                          Özel
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-slate-400 capitalize">
                      {f.shapeType} ({f.category})
                    </td>
                    <td className="py-2.5 px-3 font-mono text-cyan-300">+{f.offsetLenMm} mm</td>
                    <td className="py-2.5 px-3 font-mono text-slate-300">
                      {f.holeDiaMm ? `Ø${f.holeDiaMm} mm delik` : f.threadSize || 'Standart'}
                    </td>
                    <td className="py-2.5 px-3 text-slate-400 truncate max-w-[160px]">{f.material}</td>
                    <td className="py-2.5 px-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleStartEdit(f)}
                          className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800"
                          title="Düzenle"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        {f.isCustom && (
                          <button
                            onClick={() => onDeleteFitting(f.id)}
                            className="p-1 text-red-400 hover:text-red-300 rounded hover:bg-slate-800"
                            title="Sil"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
