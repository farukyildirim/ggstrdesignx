import React, { useState } from 'react';
import {
  BatchDesignRow,
  EndFittingItem,
  GasSpringTypeDefinition,
  GasSpringParams,
  CalculationResult,
  ErpMssqlConfig,
} from '../types/cad';
import { calculateGasSpringParams, generateErpBomLines } from '../utils/gasSpringMath';
import { generateStepFile } from '../utils/stepExporter';
import {
  X,
  Layers,
  Plus,
  Trash2,
  Download,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  Play,
  ArrowRight,
  Sparkles,
  Database,
  Copy,
  Check,
} from 'lucide-react';

interface BatchDesignAutomationModalProps {
  isOpen: boolean;
  onClose: () => void;
  availableFittings: EndFittingItem[];
  availableTypes: GasSpringTypeDefinition[];
  onLoadToWorkbench: (params: GasSpringParams) => void;
  erpConfig: ErpMssqlConfig;
}

export const BatchDesignAutomationModal: React.FC<BatchDesignAutomationModalProps> = ({
  isOpen,
  onClose,
  availableFittings,
  availableTypes,
  onLoadToWorkbench,
  erpConfig,
}) => {
  // Batch table state
  const [rows, setRows] = useState<BatchDesignRow[]>([
    {
      id: 'batch_01',
      name: 'Bagaj Amortisörü Standart',
      tubeOd: 18,
      rodOd: 8,
      stroke: 150,
      extLength: 350,
      forceN: 400,
      rodFittingId: availableFittings[0]?.id || 'fitting_eyelet_8',
      tubeFittingId: availableFittings[0]?.id || 'fitting_eyelet_8',
      springTypeId: availableTypes[0]?.id || 'type_standard_push',
      selected: true,
    },
    {
      id: 'batch_02',
      name: 'Kaput Amortisörü Uzun Strok',
      tubeOd: 18,
      rodOd: 8,
      stroke: 200,
      extLength: 460,
      forceN: 450,
      rodFittingId: availableFittings[1]?.id || 'fitting_ball_joint_m8',
      tubeFittingId: availableFittings[1]?.id || 'fitting_ball_joint_m8',
      springTypeId: availableTypes[0]?.id || 'type_standard_push',
      selected: true,
    },
    {
      id: 'batch_03',
      name: 'Ağır Makine Kapağı',
      tubeOd: 28,
      rodOd: 14,
      stroke: 300,
      extLength: 680,
      forceN: 1200,
      rodFittingId: availableFittings[1]?.id || 'fitting_ball_joint_m8',
      tubeFittingId: availableFittings[0]?.id || 'fitting_eyelet_8',
      springTypeId: availableTypes[0]?.id || 'type_standard_push',
      selected: true,
    },
    {
      id: 'batch_04',
      name: 'Yat / Marin Kapak Paslanmaz',
      tubeOd: 22,
      rodOd: 10,
      stroke: 180,
      extLength: 420,
      forceN: 600,
      rodFittingId: availableFittings[0]?.id || 'fitting_eyelet_8',
      tubeFittingId: availableFittings[0]?.id || 'fitting_eyelet_8',
      springTypeId: availableTypes[3]?.id || 'type_stainless_316',
      selected: true,
    },
  ]);

  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Matrix Generator Controls
  const [matrixTubeOd, setMatrixTubeOd] = useState<number>(18);
  const [matrixRodOd, setMatrixRodOd] = useState<number>(8);
  const [matrixStrokes, setMatrixStrokes] = useState<string>('100, 150, 200, 250');
  const [matrixForces, setMatrixForces] = useState<string>('300, 500, 700');
  const [isMatrixOpen, setIsMatrixOpen] = useState(false);

  if (!isOpen) return null;

  // Compute live calculations for all rows
  const computedRows = rows.map((r) => {
    const p: GasSpringParams = {
      tubeOd: r.tubeOd,
      rodOd: r.rodOd,
      stroke: r.stroke,
      extLength: r.extLength,
      forceN: r.forceN,
      rodFittingId: r.rodFittingId,
      tubeFittingId: r.tubeFittingId,
      springTypeId: r.springTypeId,
    };
    const res = calculateGasSpringParams(p, availableFittings, availableTypes);
    return {
      ...r,
      calcResult: res,
    };
  });

  const handleToggleSelectAll = (checked: boolean) => {
    setRows(rows.map((r) => ({ ...r, selected: checked })));
  };

  const handleToggleRow = (id: string) => {
    setRows(rows.map((r) => (r.id === id ? { ...r, selected: !r.selected } : r)));
  };

  const handleDeleteRow = (id: string) => {
    setRows(rows.filter((r) => r.id !== id));
  };

  const handleAddBlankRow = () => {
    const newRow: BatchDesignRow = {
      id: `batch_${Date.now()}`,
      name: `Yeni Tasarım ${rows.length + 1}`,
      tubeOd: 18,
      rodOd: 8,
      stroke: 150,
      extLength: 350,
      forceN: 400,
      rodFittingId: availableFittings[0]?.id || 'fitting_eyelet_8',
      tubeFittingId: availableFittings[0]?.id || 'fitting_eyelet_8',
      springTypeId: availableTypes[0]?.id || 'type_standard_push',
      selected: true,
    };
    setRows([...rows, newRow]);
  };

  const handleUpdateRowField = (id: string, field: keyof BatchDesignRow, val: any) => {
    setRows(
      rows.map((r) => {
        if (r.id !== id) return r;
        const updated = { ...r, [field]: val };
        // If stroke changed and extLength became impossible, auto-adjust
        if (field === 'stroke' && updated.extLength < Number(val) * 2 + 40) {
          updated.extLength = Number(val) * 2 + 40;
        }
        return updated;
      })
    );
  };

  // Generate Matrix
  const handleGenerateMatrix = () => {
    const strokes = matrixStrokes
      .split(',')
      .map((s) => Number(s.trim()))
      .filter((s) => !isNaN(s) && s > 0);
    const forces = matrixForces
      .split(',')
      .map((f) => Number(f.trim()))
      .filter((f) => !isNaN(f) && f > 0);

    const newGenerated: BatchDesignRow[] = [];
    strokes.forEach((st) => {
      forces.forEach((fc) => {
        const minL = st * 2 + 50;
        newGenerated.push({
          id: `matrix_${Date.now()}_${st}_${fc}`,
          name: `Ø${matrixTubeOd}/Ø${matrixRodOd} S${st} ${fc}N`,
          tubeOd: matrixTubeOd,
          rodOd: matrixRodOd,
          stroke: st,
          extLength: minL,
          forceN: fc,
          rodFittingId: availableFittings[0]?.id || 'fitting_eyelet_8',
          tubeFittingId: availableFittings[0]?.id || 'fitting_eyelet_8',
          springTypeId: availableTypes[0]?.id || 'type_standard_push',
          selected: true,
        });
      });
    });

    setRows([...rows, ...newGenerated]);
    setIsMatrixOpen(false);
    setToastMsg(`${newGenerated.length} adet parametrik kombinasyon başarıyla eklendi!`);
    setTimeout(() => setToastMsg(null), 4000);
  };

  // Batch Export CSV
  const handleExportBatchCsv = () => {
    const selected = computedRows.filter((r) => r.selected);
    if (selected.length === 0) return;

    const headers = [
      'Model Adı',
      'Parça Kodu',
      'Tüp Çapı (mm)',
      'Mil Çapı (mm)',
      'Strok S (mm)',
      'Açık Boy L (mm)',
      'Kapalı Boy (mm)',
      'Nominal Kuvvet F1 (N)',
      'Tam Sıkışmış F2 (N)',
      'Gaz Basıncı (Bar)',
      'Tahmini Ağırlık (g)',
      'Geçerlilik Durumu',
    ];

    const dataRows = selected.map((r) => [
      `"${r.name}"`,
      r.calcResult?.partNumber || '',
      r.tubeOd,
      r.rodOd,
      r.stroke,
      r.extLength,
      r.calcResult?.closedLength || '',
      r.forceN,
      r.calcResult?.f2Force.toFixed(0) || '',
      r.calcResult?.requiredPressureBar.toFixed(1) || '',
      r.calcResult?.weightGramsEstimate || '',
      r.calcResult?.isValid ? 'GEÇERLİ' : 'HATALI',
    ]);

    const csvContent = '\uFEFF' + [headers.join(';'), ...dataRows.map((dr) => dr.join(';'))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Toplu_Gazli_Amortisor_Dizayn_Listesi_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Batch Export STEP Files
  const handleExportSelectedSteps = () => {
    const selected = computedRows.filter((r) => r.selected && r.calcResult?.isValid);
    if (selected.length === 0) return;

    selected.forEach((r, idx) => {
      setTimeout(() => {
        const p: GasSpringParams = {
          tubeOd: r.tubeOd,
          rodOd: r.rodOd,
          stroke: r.stroke,
          extLength: r.extLength,
          forceN: r.forceN,
          rodFittingId: r.rodFittingId,
          tubeFittingId: r.tubeFittingId,
          springTypeId: r.springTypeId,
        };
        const stepData = generateStepFile(p, r.calcResult!, availableFittings);
        const blob = new Blob([stepData], { type: 'application/step' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Assembly_${r.calcResult!.partNumber}.step`;
        a.click();
        URL.revokeObjectURL(url);
      }, idx * 300);
    });

    setToastMsg(`${selected.length} adet .STEP CAD montaj dosyası sırayla indiriliyor.`);
    setTimeout(() => setToastMsg(null), 5000);
  };

  // Batch ERP Transfer SQL
  const handleExportBatchErpSql = () => {
    const selected = computedRows.filter((r) => r.selected && r.calcResult?.isValid);
    if (selected.length === 0) return;

    let fullSql = `-- ===============================================================\n-- TOPLU ERP MSSQL BOM AKTARIM PAKETİ (${selected.length} Model)\n-- Sunucu: ${erpConfig.host} / DB: ${erpConfig.database}\n-- ===============================================================\n\nBEGIN TRANSACTION;\nBEGIN TRY\n`;

    selected.forEach((r) => {
      const p: GasSpringParams = {
        tubeOd: r.tubeOd,
        rodOd: r.rodOd,
        stroke: r.stroke,
        extLength: r.extLength,
        forceN: r.forceN,
        rodFittingId: r.rodFittingId,
        tubeFittingId: r.tubeFittingId,
        springTypeId: r.springTypeId,
      };
      const boms = generateErpBomLines(p, r.calcResult!, availableFittings);

      fullSql += `\n  -- Model: ${r.calcResult!.partNumber}\n`;
      fullSql += `  INSERT INTO ${erpConfig.itemMasterTable} (ItemCode, ItemName, ItemType, Unit, ForceN, StrokeMm, LengthMm, PressureBar)\n`;
      fullSql += `  VALUES ('${r.calcResult!.partNumber}', '${r.name}', 'FINISHED_GOOD', 'ADET', ${r.forceN}, ${r.stroke}, ${r.extLength}, ${r.calcResult!.requiredPressureBar.toFixed(1)});\n`;

      boms.forEach((b, bi) => {
        fullSql += `  INSERT INTO ${erpConfig.bomTable} (ParentPartNo, LineNo, ItemCode, Description, Quantity, Unit, Material)\n`;
        fullSql += `  VALUES ('${r.calcResult!.partNumber}', ${bi + 1}, '${b.itemCode}', '${b.description.replace(/'/g, "''")}', ${b.quantity}, '${b.unit}', '${b.material.replace(/'/g, "''")}');\n`;
      });
    });

    fullSql += `\n  COMMIT TRANSACTION;\n  PRINT 'Toplu ${selected.length} model ERP veritabanına aktarıldı.';\nEND TRY\nBEGIN CATCH\n  ROLLBACK TRANSACTION;\n  THROW;\nEND CATCH;\n`;

    const blob = new Blob([fullSql], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Batch_ERP_BOM_MSSQL_${new Date().toISOString().slice(0, 10)}.sql`;
    a.click();
    URL.revokeObjectURL(url);

    setToastMsg(`Toplu ERP MSSQL T-SQL aktarım scripti oluşturuldu ve indirildi!`);
    setTimeout(() => setToastMsg(null), 5000);
  };

  const selectedCount = computedRows.filter((r) => r.selected).length;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-6xl w-full max-h-[94vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/80">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-cyan-600/20 text-cyan-400 border border-cyan-500/30">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white flex items-center gap-2">
                <span>Toplu Dizayn & Parametrik Varyasyon Otomasyonu</span>
                <span className="text-xs px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-cyan-300 font-mono">
                  {rows.length} Tasarım
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Onlarca gazlı amortisör kombinasyonunu tek ekrandan tasarlayın, hesaplayın, toplu STEP/STL ve ERP BOM aktarımı yapın
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

        {/* Top Controls Toolbar */}
        <div className="px-6 py-3 bg-slate-950/60 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <button
              onClick={handleAddBlankRow}
              className="px-3 py-1.5 font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 transition-colors flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5 text-cyan-400" />
              <span>Satır Ekle</span>
            </button>

            <button
              onClick={() => setIsMatrixOpen(!isMatrixOpen)}
              className="px-3 py-1.5 font-medium rounded-lg bg-indigo-600/30 hover:bg-indigo-600/40 text-indigo-300 border border-indigo-500/40 transition-colors flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Kombinasyon Matrisi Oluştur</span>
            </button>

            <span className="text-slate-500">|</span>

            <span className="text-slate-400">
              Seçili: <strong className="text-white font-mono">{selectedCount}</strong> / {rows.length}
            </span>
          </div>

          {/* Batch Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportBatchCsv}
              disabled={selectedCount === 0}
              className="px-3 py-1.5 font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors flex items-center gap-1.5 disabled:opacity-40"
              title="Seçili tasarımları CSV/Excel olarak indir"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
              <span>Toplu CSV</span>
            </button>

            <button
              onClick={handleExportSelectedSteps}
              disabled={selectedCount === 0}
              className="px-3 py-1.5 font-medium rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-colors flex items-center gap-1.5 shadow-md shadow-blue-900/30 disabled:opacity-40"
              title="Seçili modellerin .STEP montajlarını sırayla indir"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Toplu .STEP İndir</span>
            </button>

            <button
              onClick={handleExportBatchErpSql}
              disabled={selectedCount === 0}
              className="px-3 py-1.5 font-medium rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-colors flex items-center gap-1.5 shadow-md shadow-emerald-900/30 disabled:opacity-40"
              title="Seçili modeller için toplu MSSQL ERP aktarım scripti"
            >
              <Database className="w-3.5 h-3.5" />
              <span>Toplu ERP SQL</span>
            </button>
          </div>
        </div>

        {/* Matrix Generator Expandable Drawer */}
        {isMatrixOpen && (
          <div className="px-6 py-4 bg-slate-950 border-b border-indigo-900/50 flex flex-col gap-3 animate-in fade-in">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-indigo-300 uppercase tracking-wider font-mono">
                ⚡ Otomatik Parametrik Seri Üretici (Matrix Generator)
              </span>
              <button onClick={() => setIsMatrixOpen(false)} className="text-xs text-slate-400 hover:text-white">
                Kapat
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
              <div className="flex flex-col gap-1">
                <label className="text-slate-300">Tüp Çapı (mm)</label>
                <select
                  value={matrixTubeOd}
                  onChange={(e) => {
                    const tod = Number(e.target.value);
                    setMatrixTubeOd(tod);
                    setMatrixRodOd(Math.round(tod * 0.45));
                  }}
                  className="bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-white"
                >
                  <option value={15}>Ø15 mm</option>
                  <option value={18}>Ø18 mm</option>
                  <option value={22}>Ø22 mm</option>
                  <option value={28}>Ø28 mm</option>
                  <option value={40}>Ø40 mm</option>
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-slate-300">Mil Çapı (mm)</label>
                <input
                  type="number"
                  value={matrixRodOd}
                  onChange={(e) => setMatrixRodOd(Number(e.target.value))}
                  className="bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-white font-mono"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-slate-300">Strok Değerleri (Virgülle)</label>
                <input
                  type="text"
                  value={matrixStrokes}
                  onChange={(e) => setMatrixStrokes(e.target.value)}
                  placeholder="100, 150, 200, 250"
                  className="bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-white font-mono"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-slate-300">Kuvvetler F1 (N, Virgülle)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={matrixForces}
                    onChange={(e) => setMatrixForces(e.target.value)}
                    placeholder="300, 500, 700"
                    className="bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-white font-mono flex-1"
                  />
                  <button
                    onClick={handleGenerateMatrix}
                    className="px-3 py-1.5 font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded transition-colors whitespace-nowrap"
                  >
                    Üret
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Toast */}
        {toastMsg && (
          <div className="bg-emerald-950/90 border-b border-emerald-500/70 text-emerald-200 px-6 py-2 text-xs flex items-center justify-between">
            <span>{toastMsg}</span>
            <button onClick={() => setToastMsg(null)}>✕</button>
          </div>
        )}

        {/* Batch Spreadsheet Table */}
        <div className="p-6 overflow-auto flex-1">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-950 border-b border-slate-800 text-slate-400 uppercase text-[10px] tracking-wider">
                <th className="py-2.5 px-3 w-8">
                  <input
                    type="checkbox"
                    checked={rows.length > 0 && rows.every((r) => r.selected)}
                    onChange={(e) => handleToggleSelectAll(e.target.checked)}
                    className="accent-blue-500"
                  />
                </th>
                <th className="py-2.5 px-3">Tasarım Adı</th>
                <th className="py-2.5 px-3">Parça Kodu (BOM ID)</th>
                <th className="py-2.5 px-2">D (mm)</th>
                <th className="py-2.5 px-2">d (mm)</th>
                <th className="py-2.5 px-2">Strok (S)</th>
                <th className="py-2.5 px-2">Açık (L)</th>
                <th className="py-2.5 px-2">F1 (N)</th>
                <th className="py-2.5 px-3">İç Basınç</th>
                <th className="py-2.5 px-3">Durum</th>
                <th className="py-2.5 px-3 text-right">Eylem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-sans text-slate-300">
              {computedRows.map((row) => {
                const res = row.calcResult;
                const isValid = res?.isValid;
                return (
                  <tr key={row.id} className="hover:bg-slate-800/30 transition-colors">
                    {/* Checkbox */}
                    <td className="py-2 px-3">
                      <input
                        type="checkbox"
                        checked={row.selected}
                        onChange={() => handleToggleRow(row.id)}
                        className="accent-blue-500"
                      />
                    </td>

                    {/* Name */}
                    <td className="py-2 px-3">
                      <input
                        type="text"
                        value={row.name}
                        onChange={(e) => handleUpdateRowField(row.id, 'name', e.target.value)}
                        className="bg-transparent hover:bg-slate-900 border border-transparent hover:border-slate-700 rounded px-1.5 py-0.5 text-white font-medium focus:bg-slate-900 focus:border-blue-500 w-44"
                      />
                    </td>

                    {/* Part Number */}
                    <td className="py-2 px-3 font-mono text-cyan-300 truncate max-w-[170px]" title={res?.partNumber}>
                      {res?.partNumber}
                    </td>

                    {/* Tube OD */}
                    <td className="py-2 px-2">
                      <select
                        value={row.tubeOd}
                        onChange={(e) => handleUpdateRowField(row.id, 'tubeOd', Number(e.target.value))}
                        className="bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-white font-mono text-xs"
                      >
                        <option value={15}>15</option>
                        <option value={18}>18</option>
                        <option value={22}>22</option>
                        <option value={28}>28</option>
                        <option value={40}>40</option>
                      </select>
                    </td>

                    {/* Rod OD */}
                    <td className="py-2 px-2">
                      <select
                        value={row.rodOd}
                        onChange={(e) => handleUpdateRowField(row.id, 'rodOd', Number(e.target.value))}
                        className="bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-white font-mono text-xs"
                      >
                        <option value={6}>6</option>
                        <option value={8}>8</option>
                        <option value={10}>10</option>
                        <option value={14}>14</option>
                        <option value={20}>20</option>
                      </select>
                    </td>

                    {/* Stroke */}
                    <td className="py-2 px-2">
                      <input
                        type="number"
                        min={20}
                        max={500}
                        step={5}
                        value={row.stroke}
                        onChange={(e) => handleUpdateRowField(row.id, 'stroke', Number(e.target.value))}
                        className="bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-white font-mono text-xs w-16"
                      />
                    </td>

                    {/* Extended Length */}
                    <td className="py-2 px-2">
                      <input
                        type="number"
                        min={100}
                        max={1200}
                        step={5}
                        value={row.extLength}
                        onChange={(e) => handleUpdateRowField(row.id, 'extLength', Number(e.target.value))}
                        className="bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-white font-mono text-xs w-16"
                      />
                    </td>

                    {/* Force */}
                    <td className="py-2 px-2">
                      <input
                        type="number"
                        min={50}
                        max={2500}
                        step={10}
                        value={row.forceN}
                        onChange={(e) => handleUpdateRowField(row.id, 'forceN', Number(e.target.value))}
                        className="bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-cyan-400 font-mono text-xs w-16 font-semibold"
                      />
                    </td>

                    {/* Pressure Bar */}
                    <td className="py-2 px-3 font-mono tabular-nums">
                      {res ? (
                        <span className={res.requiredPressureBar > 180 ? 'text-amber-400 font-semibold' : 'text-slate-300'}>
                          ~{res.requiredPressureBar.toFixed(1)} Bar
                        </span>
                      ) : (
                        '-'
                      )}
                    </td>

                    {/* Status */}
                    <td className="py-2 px-3">
                      {isValid ? (
                        <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 flex items-center gap-1 w-fit font-medium">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Uygun</span>
                        </span>
                      ) : (
                        <span className="text-[10px] px-2 py-0.5 rounded bg-red-950 text-red-300 border border-red-800 flex items-center gap-1 w-fit font-medium">
                          <AlertTriangle className="w-3 h-3" />
                          <span>İmkansız</span>
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-2 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => {
                            const p: GasSpringParams = {
                              tubeOd: row.tubeOd,
                              rodOd: row.rodOd,
                              stroke: row.stroke,
                              extLength: row.extLength,
                              forceN: row.forceN,
                              rodFittingId: row.rodFittingId,
                              tubeFittingId: row.tubeFittingId,
                              springTypeId: row.springTypeId,
                            };
                            onLoadToWorkbench(p);
                            onClose();
                          }}
                          className="px-2 py-1 rounded bg-slate-800 hover:bg-blue-600 text-slate-300 hover:text-white transition-colors flex items-center gap-1 text-[11px]"
                          title="Bu modeli ana 3D CAD çalışma alanına yükle"
                        >
                          <Play className="w-3 h-3 text-emerald-400" />
                          <span>3D Yükle</span>
                        </button>

                        <button
                          onClick={() => handleDeleteRow(row.id)}
                          className="p-1 rounded text-slate-500 hover:text-red-400 hover:bg-slate-800 transition-colors"
                          title="Sil"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
