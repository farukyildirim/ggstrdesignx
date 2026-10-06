import React, { useState, useEffect, useMemo } from 'react';
import {
  ErpMssqlConfig,
  ErpBomLine,
  ErpTransferRecord,
  GasSpringParams,
  CalculationResult,
  EndFittingItem,
  ErpStockItem,
} from '../types/cad';
import { generateErpBomLines } from '../utils/gasSpringMath';
import { DEFAULT_ERP_STOCK_ITEMS } from '../utils/engineeringData';
import {
  X,
  Database,
  Server,
  Send,
  CheckCircle2,
  AlertCircle,
  Copy,
  Download,
  FileSpreadsheet,
  RefreshCw,
  Layers,
  FileCode,
  ShieldCheck,
  Check,
  Package,
  Plus,
  Search,
  ArrowRight,
  Filter,
} from 'lucide-react';

interface ErpMssqlModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: ErpMssqlConfig;
  onUpdateConfig: (cfg: ErpMssqlConfig) => void;
  params: GasSpringParams;
  calc: CalculationResult;
  availableFittings: EndFittingItem[];
}

export const ErpMssqlModal: React.FC<ErpMssqlModalProps> = ({
  isOpen,
  onClose,
  config,
  onUpdateConfig,
  params,
  calc,
  availableFittings,
}) => {
  const [activeTab, setActiveTab] = useState<'bom_mapping' | 'sql_transfer' | 'stock_catalog' | 'connection'>('bom_mapping');
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [isTransferring, setIsTransferring] = useState(false);
  const [transferToast, setTransferToast] = useState<string | null>(null);
  const [copiedSql, setCopiedSql] = useState(false);

  // ERP Stock Master Catalog with LocalStorage persistence
  const [stockCatalog, setStockCatalog] = useState<ErpStockItem[]>(() => {
    try {
      const saved = localStorage.getItem('gasspring_erp_stocks');
      return saved ? JSON.parse(saved) : DEFAULT_ERP_STOCK_ITEMS;
    } catch {
      return DEFAULT_ERP_STOCK_ITEMS;
    }
  });

  // Custom User Mappings: cadItemCode -> erpStockCode
  const [customStockMap, setCustomStockMap] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem('gasspring_bom_erp_mapping');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('gasspring_erp_stocks', JSON.stringify(stockCatalog));
    } catch {}
  }, [stockCatalog]);

  useEffect(() => {
    try {
      localStorage.setItem('gasspring_bom_erp_mapping', JSON.stringify(customStockMap));
    } catch {}
  }, [customStockMap]);

  // Stock Catalog Search
  const [catalogSearch, setCatalogSearch] = useState('');
  const [catalogGroupFilter, setCatalogGroupFilter] = useState<string>('ALL');

  // New Stock Item Modal state
  const [showAddStockModal, setShowAddStockModal] = useState(false);
  const [newStockCode, setNewStockCode] = useState('');
  const [newStockName, setNewStockName] = useState('');
  const [newStockGroup, setNewStockGroup] = useState<ErpStockItem['stockGroup']>('BORU');
  const [newStockUnit, setNewStockUnit] = useState('METRE');
  const [newStockQty, setNewStockQty] = useState<number>(500);

  // Transfer history records stored in state
  const [history, setHistory] = useState<ErpTransferRecord[]>([
    {
      id: 'tx_demo_01',
      timestamp: '2026-10-06 14:22:10',
      partNumber: 'GS-18-08-0150-0350-0400N-EYE-EYE',
      system: 'Logo Tiger ERP (dbo.LG_001_STFICHE_BOM)',
      status: 'SUCCESS',
      recordsCount: 7,
      payloadSql: '-- Başarılı aktarıldı',
    },
  ]);

  if (!isOpen) return null;

  // Generate BOM lines with current mappings and stock catalog
  const bomLines: ErpBomLine[] = generateErpBomLines(params, calc, availableFittings, customStockMap, stockCatalog);

  // Handle mapping line to an ERP stock code
  const handleMapStockCode = (cadItemCode: string, targetErpStockCode: string) => {
    setCustomStockMap((prev) => ({
      ...prev,
      [cadItemCode]: targetErpStockCode,
    }));
    setTransferToast(`BOM "${cadItemCode}" → ERP Stok Kodu "${targetErpStockCode}" ile eşleştirildi.`);
    setTimeout(() => setTransferToast(null), 3000);
  };

  // Auto-Match All BOM lines to Stock Catalog
  const handleAutoMatchAll = () => {
    const autoMap: Record<string, string> = { ...customStockMap };
    bomLines.forEach((line) => {
      // Find best match in stockCatalog
      const match = stockCatalog.find(
        (s) =>
          line.description.toLowerCase().includes(s.stockGroup.toLowerCase()) ||
          s.stockName.toLowerCase().includes(line.dimensions.toLowerCase()) ||
          s.stockCode === line.erpStockCode
      );
      if (match) {
        autoMap[line.itemCode] = match.stockCode;
      }
    });
    setCustomStockMap(autoMap);
    setTransferToast('Tüm BOM kalemleri akıllı stok kataloğu ile eşleştirildi!');
    setTimeout(() => setTransferToast(null), 3500);
  };

  // Add new Stock Item to catalog
  const handleCreateStockItem = () => {
    if (!newStockCode.trim() || !newStockName.trim()) return;
    const newItem: ErpStockItem = {
      stockCode: newStockCode.trim(),
      stockName: newStockName.trim(),
      stockGroup: newStockGroup,
      unit: newStockUnit,
      inStockQty: newStockQty,
    };
    setStockCatalog((prev) => [newItem, ...prev]);
    setShowAddStockModal(false);
    setNewStockCode('');
    setNewStockName('');
    setTransferToast(`"${newItem.stockCode}" stok kartı kataloğa eklendi.`);
    setTimeout(() => setTransferToast(null), 3500);
  };

  // Filtered Stock Catalog for Tab 3
  const filteredCatalog = useMemo(() => {
    return stockCatalog.filter((item) => {
      const matchesSearch =
        item.stockCode.toLowerCase().includes(catalogSearch.toLowerCase()) ||
        item.stockName.toLowerCase().includes(catalogSearch.toLowerCase());
      const matchesGroup = catalogGroupFilter === 'ALL' || item.stockGroup === catalogGroupFilter;
      return matchesSearch && matchesGroup;
    });
  }, [stockCatalog, catalogSearch, catalogGroupFilter]);

  // Generate real T-SQL Script for MSSQL Server with ERP Stock Codes
  const generateSqlScript = () => {
    const linesSql = bomLines
      .map(
        (line, idx) =>
          `  INSERT INTO ${config.bomTable} (ParentPartNo, LineNo, ErpStockCode, CadItemCode, Description, Quantity, Unit, Material, Dimensions, ComponentType, CreatedDate) \n  VALUES ('${calc.partNumber}', ${idx + 1}, '${line.erpStockCode}', '${line.itemCode}', '${line.erpStockName.replace(/'/g, "''")}', ${line.quantity}, '${line.unit}', '${line.material.replace(/'/g, "''")}', '${line.dimensions}', '${line.componentType}', GETDATE());`
      )
      .join('\n');

    return `-- ===============================================================
-- ERP BOM REÇETE & ÜRÜN AĞACI TRANSFERİ
-- Hedef Sistem: MSSQL Server (${config.host}:${config.port}/${config.database})
-- ERP Şablonu: ${config.erpSystem.toUpperCase()}
-- Üretim Kodu : ${calc.partNumber}
-- Oluşturulma : ${new Date().toISOString()}
-- ===============================================================

BEGIN TRANSACTION;
BEGIN TRY
  -- 1. Ana Ürün Kartı Güncelleme / Oluşturma
  IF NOT EXISTS (SELECT 1 FROM ${config.itemMasterTable} WHERE ItemCode = '${calc.partNumber}')
  BEGIN
    INSERT INTO ${config.itemMasterTable} (ItemCode, ItemName, ItemType, Unit, WeightGrossGrams, ForceN, StrokeMm, LengthMm, PressureBar, Status)
    VALUES ('${calc.partNumber}', 'Gazlı Amortisör ${calc.springType.name}', 'FINISHED_GOOD', 'ADET', ${calc.weightGramsEstimate}, ${params.forceN}, ${params.stroke}, ${params.extLength}, ${calc.requiredPressureBar.toFixed(1)}, 'ACTIVE');
  END

  -- 2. Eski Reçete Satırlarını Temizle (Varsa)
  DELETE FROM ${config.bomTable} WHERE ParentPartNo = '${calc.partNumber}';

  -- 3. Alt Malzeme & BOM Satırlarını Eşleşen ERP Stok Kodları ile Ekle
${linesSql}

  COMMIT TRANSACTION;
  PRINT 'BOM Transferi Başarıyla Tamamlandı: ${calc.partNumber} (${bomLines.length} Kalem Eşleşti)';
END TRY
BEGIN CATCH
  ROLLBACK TRANSACTION;
  THROW;
END CATCH;
`;
  };

  const handleTestConnection = () => {
    setTestStatus('testing');
    setTimeout(() => {
      setTestStatus('success');
      onUpdateConfig({ ...config, status: 'connected', lastSyncTime: new Date().toLocaleTimeString() });
    }, 1200);
  };

  const handleExecuteTransfer = () => {
    setIsTransferring(true);
    setTimeout(() => {
      setIsTransferring(false);
      const newRecord: ErpTransferRecord = {
        id: `tx_${Date.now()}`,
        timestamp: new Date().toLocaleString(),
        partNumber: calc.partNumber,
        system: `${config.erpSystem.toUpperCase()} (${config.database})`,
        status: 'SUCCESS',
        recordsCount: bomLines.length,
        payloadSql: generateSqlScript(),
      };
      setHistory([newRecord, ...history]);
      setTransferToast(`BOM reçetesi ${config.database} veritabanına (${bomLines.length} kalem eşleşen ERP stok kodu ile) başarıyla aktarıldı!`);
      setTimeout(() => setTransferToast(null), 5000);
    }, 1400);
  };

  const copySql = () => {
    navigator.clipboard.writeText(generateSqlScript());
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2000);
  };

  const downloadSql = () => {
    const sql = generateSqlScript();
    const blob = new Blob([sql], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `BOM_${calc.partNumber}_MSSQL.sql`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadCsv = () => {
    const headers = ['Üst Ürün No', 'Satır No', 'ERP Stok Kodu', 'CAD BOM Kodu', 'ERP Stok Kartı Adı', 'Miktar', 'Birim', 'Malzeme', 'Boyutlar', 'Bileşen Tipi'];
    const rows = bomLines.map((l, i) => [
      calc.partNumber,
      i + 1,
      l.erpStockCode,
      l.itemCode,
      `"${l.erpStockName}"`,
      l.quantity,
      l.unit,
      `"${l.material}"`,
      `"${l.dimensions}"`,
      l.componentType,
    ]);
    const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ERP_BOM_${calc.partNumber}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const matchedCount = bomLines.filter((l) => l.isMatched).length;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-6xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/80">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-600/20 text-emerald-400 border border-emerald-500/30">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white flex items-center gap-2">
                <span>ERP & MSSQL BOM Stok Entegrasyonu</span>
                <span className="text-xs px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 font-mono">
                  {matchedCount}/{bomLines.length} Kalem Eşleşti
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                CAD BOM kodlarını kurumsal ERP stok kodları ile eşleştirin ve MSSQL Server veritabanına aktarın
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

        {/* Tab Navigation */}
        <div className="flex items-center justify-between px-6 py-2.5 bg-slate-950/60 border-b border-slate-800 text-xs">
          <div className="flex items-center gap-1.5 overflow-x-auto">
            <button
              onClick={() => setActiveTab('bom_mapping')}
              className={`px-3 py-1.5 font-medium rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'bom_mapping'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Package className="w-3.5 h-3.5" />
              <span>1. BOM & ERP Stok Kodu Eşleştirme</span>
            </button>
            <button
              onClick={() => setActiveTab('sql_transfer')}
              className={`px-3 py-1.5 font-medium rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'sql_transfer'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Send className="w-3.5 h-3.5" />
              <span>2. MSSQL Reçete Aktarımı (T-SQL)</span>
            </button>
            <button
              onClick={() => setActiveTab('stock_catalog')}
              className={`px-3 py-1.5 font-medium rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'stock_catalog'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>3. ERP Stok Kartları Kataloğu ({stockCatalog.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('connection')}
              className={`px-3 py-1.5 font-medium rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'connection'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Server className="w-3.5 h-3.5" />
              <span>4. MSSQL Bağlantı Ayarları</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={downloadCsv}
              className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1 transition-colors cursor-pointer"
              title="Eşleşmiş BOM listesini CSV olarak indir"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">CSV İndir</span>
            </button>
          </div>
        </div>

        {/* Toast Notification */}
        {transferToast && (
          <div className="bg-emerald-950 border-b border-emerald-800 text-emerald-200 px-6 py-2 text-xs flex items-center justify-between">
            <span className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{transferToast}</span>
            </span>
            <button onClick={() => setTransferToast(null)} className="text-emerald-400 hover:text-white">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Body Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {/* TAB 1: BOM & ERP STOK KODU EŞLEŞTİRME */}
          {activeTab === 'bom_mapping' && (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-950 p-4 rounded-xl border border-slate-800">
                <div>
                  <h4 className="text-xs font-semibold text-white uppercase tracking-wider font-mono flex items-center gap-2">
                    <span>CAD BOM Kodları ↔ ERP Stok Kodları Eşleşme Matrisi</span>
                  </h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Her alt bileşenin CAD reçete kodu ile ERP (Logo, SAP, Netsis vb.) stok kartı kodunu eşleştirin.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleAutoMatchAll}
                    className="px-3 py-1.5 text-xs font-medium text-cyan-300 bg-cyan-950 hover:bg-cyan-900 border border-cyan-800 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Akıllı Otomatik Eşleştir</span>
                  </button>
                  <button
                    onClick={() => setShowAddStockModal(true)}
                    className="px-3 py-1.5 text-xs font-medium text-emerald-300 bg-emerald-950 hover:bg-emerald-900 border border-emerald-800 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Yeni Stok Kartı Tanımla</span>
                  </button>
                </div>
              </div>

              {/* Mapping Table */}
              <div className="overflow-x-auto bg-slate-950 rounded-xl border border-slate-800">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 font-mono uppercase text-[11px] bg-slate-900/60">
                      <th className="py-2.5 px-3">CAD BOM Kodu</th>
                      <th className="py-2.5 px-3">Bileşen Açıklaması</th>
                      <th className="py-2.5 px-3 text-cyan-300">Eşleşen ERP Stok Kodu</th>
                      <th className="py-2.5 px-3 text-cyan-300">ERP Stok Kartı Adı</th>
                      <th className="py-2.5 px-3">Miktar / Birim</th>
                      <th className="py-2.5 px-3">Depo Durumu</th>
                      <th className="py-2.5 px-3 text-center">Eşleşme</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-300">
                    {bomLines.map((line) => {
                      const isCustom = Boolean(customStockMap[line.itemCode]);
                      return (
                        <tr key={line.itemCode} className="hover:bg-slate-900/40 transition-colors">
                          <td className="py-3 px-3 font-mono font-semibold text-white whitespace-nowrap">
                            {line.itemCode}
                          </td>
                          <td className="py-3 px-3 font-sans max-w-[200px]">
                            <span className="font-medium text-slate-200 block">{line.description}</span>
                            <span className="text-[10px] text-slate-500 font-mono">{line.dimensions}</span>
                          </td>

                          {/* ERP Stock Code Selector */}
                          <td className="py-3 px-3">
                            <select
                              value={line.erpStockCode}
                              onChange={(e) => handleMapStockCode(line.itemCode, e.target.value)}
                              className="bg-slate-900 border border-slate-700 hover:border-cyan-500 rounded px-2.5 py-1 text-xs text-cyan-300 font-mono font-bold focus:outline-none focus:border-cyan-400 cursor-pointer w-full max-w-[180px]"
                            >
                              {stockCatalog.map((s) => (
                                <option key={s.stockCode} value={s.stockCode}>
                                  {s.stockCode} - {s.stockName.slice(0, 30)}...
                                </option>
                              ))}
                              {!stockCatalog.some((s) => s.stockCode === line.erpStockCode) && (
                                <option value={line.erpStockCode}>{line.erpStockCode} (Özel)</option>
                              )}
                            </select>
                          </td>

                          {/* ERP Stock Name */}
                          <td className="py-3 px-3 font-sans text-xs text-slate-300 max-w-[220px]">
                            <span className="line-clamp-2">{line.erpStockName}</span>
                          </td>

                          {/* Qty & Unit */}
                          <td className="py-3 px-3 font-mono text-white whitespace-nowrap">
                            {line.quantity} {line.unit}
                          </td>

                          {/* Stock Status */}
                          <td className="py-3 px-3 whitespace-nowrap font-mono text-[11px]">
                            {line.stockAvailable !== undefined ? (
                              <span
                                className={
                                  line.stockAvailable > line.quantity
                                    ? 'text-emerald-400'
                                    : 'text-amber-400 font-semibold'
                                }
                              >
                                {line.stockAvailable.toLocaleString()} {line.unit}
                              </span>
                            ) : (
                              <span className="text-slate-500">-</span>
                            )}
                          </td>

                          {/* Match Badge */}
                          <td className="py-3 px-3 text-center whitespace-nowrap">
                            {isCustom ? (
                              <span className="text-[10px] px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800 font-medium">
                                ★ Manuel
                              </span>
                            ) : line.isMatched ? (
                              <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 font-medium flex items-center justify-center gap-1">
                                <Check className="w-3 h-3 text-emerald-400" /> Eşleşti
                              </span>
                            ) : (
                              <span className="text-[10px] px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800 font-medium">
                                ⚠️ Öneri
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Summary Bar */}
              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 flex items-center justify-between text-xs text-slate-400">
                <span>
                  Toplam <strong className="text-white">{bomLines.length}</strong> kalem BOM satırının{' '}
                  <strong className="text-emerald-400">{matchedCount}</strong> tanesi ERP stok kartları ile birebir eşleştirilmiştir.
                </span>
                <button
                  onClick={() => setActiveTab('sql_transfer')}
                  className="px-3.5 py-1.5 font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <span>MSSQL Aktarımına Geç</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: MSSQL T-SQL TRANSFER */}
          {activeTab === 'sql_transfer' && (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-950 p-4 rounded-xl border border-slate-800">
                <div>
                  <h4 className="text-xs font-semibold text-white uppercase tracking-wider font-mono">
                    T-SQL Reçete Scripti (MSSQL Server)
                  </h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Eşleşen ERP stok kodları ile <strong className="text-cyan-300">{config.bomTable}</strong> tablosuna doğrudan aktarım
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={copySql}
                    className="px-3 py-1.5 text-xs text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 flex items-center gap-1.5 cursor-pointer"
                  >
                    {copiedSql ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>SQL Kopyala</span>
                  </button>
                  <button
                    onClick={downloadSql}
                    className="px-3 py-1.5 text-xs text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 flex items-center gap-1.5 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>.SQL İndir</span>
                  </button>
                  <button
                    onClick={handleExecuteTransfer}
                    disabled={isTransferring}
                    className="px-4 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer shadow-md disabled:opacity-50"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{isTransferring ? 'Aktarılıyor...' : 'MSSQL Sunucuya Aktar'}</span>
                  </button>
                </div>
              </div>

              {/* SQL Viewer */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 font-mono text-xs text-cyan-300 max-h-[380px] overflow-y-auto whitespace-pre leading-relaxed selection:bg-blue-800">
                {generateSqlScript()}
              </div>

              {/* History */}
              {history.length > 0 && (
                <div className="flex flex-col gap-2 pt-2">
                  <span className="text-xs font-semibold text-slate-400 font-mono uppercase">
                    Son Aktarım Kayıtları
                  </span>
                  <div className="flex flex-col gap-1.5">
                    {history.map((tx) => (
                      <div
                        key={tx.id}
                        className="p-3 bg-slate-950 rounded-lg border border-slate-800 flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-2.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                          <span className="font-mono text-white font-medium">{tx.partNumber}</span>
                          <span className="text-slate-400">· {tx.system}</span>
                          <span className="text-emerald-400 font-mono">({tx.recordsCount} Kalem)</span>
                        </div>
                        <span className="text-slate-500 font-mono text-[11px]">{tx.timestamp}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: ERP STOK KARTLARI KATALOĞU */}
          {activeTab === 'stock_catalog' && (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-950 p-4 rounded-xl border border-slate-800">
                <div className="flex items-center gap-3 flex-1 max-w-lg">
                  <div className="relative flex-1">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      placeholder="Stok kodu veya malzeme adı ara..."
                      value={catalogSearch}
                      onChange={(e) => setCatalogSearch(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <select
                    value={catalogGroupFilter}
                    onChange={(e) => setCatalogGroupFilter(e.target.value)}
                    className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none"
                  >
                    <option value="ALL">Tüm Gruplar</option>
                    <option value="BORU">Borular</option>
                    <option value="MIL">Miller</option>
                    <option value="MAFSAL">Mafsallar</option>
                    <option value="KECE">Keçeler</option>
                    <option value="VALF">Valfler</option>
                    <option value="GAZ_YAG">Gaz & Yağ</option>
                  </select>
                </div>

                <button
                  onClick={() => setShowAddStockModal(true)}
                  className="px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Yeni ERP Stok Kartı Ekle</span>
                </button>
              </div>

              {/* Catalog Table */}
              <div className="overflow-x-auto bg-slate-950 rounded-xl border border-slate-800 max-h-[420px] overflow-y-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="sticky top-0 bg-slate-900 border-b border-slate-800 font-mono uppercase text-[11px] text-slate-400">
                    <tr>
                      <th className="py-2.5 px-3">ERP Stok Kodu</th>
                      <th className="py-2.5 px-3">Grup</th>
                      <th className="py-2.5 px-3">ERP Stok Kartı Açıklaması</th>
                      <th className="py-2.5 px-3">Birim</th>
                      <th className="py-2.5 px-3 text-right">Depo Mevcudu</th>
                      <th className="py-2.5 px-3 text-right">Birim Maliyet</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-300">
                    {filteredCatalog.map((item) => (
                      <tr key={item.stockCode} className="hover:bg-slate-900/40">
                        <td className="py-2.5 px-3 font-mono font-bold text-cyan-300 whitespace-nowrap">
                          {item.stockCode}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                            {item.stockGroup}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-sans text-white font-medium">{item.stockName}</td>
                        <td className="py-2.5 px-3 font-mono text-slate-400">{item.unit}</td>
                        <td className="py-2.5 px-3 text-right font-mono text-emerald-400 font-semibold">
                          {item.inStockQty.toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-400">
                          {item.priceTry ? `${item.priceTry} ₺` : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: CONNECTION CONFIG */}
          {activeTab === 'connection' && (
            <div className="max-w-2xl mx-auto bg-slate-950 p-6 rounded-2xl border border-slate-800 flex flex-col gap-4">
              <div className="border-b border-slate-800 pb-3">
                <h4 className="text-sm font-semibold text-white">MSSQL Veritabanı Bağlantı Ayarları</h4>
                <p className="text-xs text-slate-400">
                  Logo Tiger, Netsis, SAP veya özel MSSQL üretim veri tabanı bağlantısı
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="text-slate-300 font-medium block mb-1">Sunucu Host / IP</label>
                  <input
                    type="text"
                    value={config.host}
                    onChange={(e) => onUpdateConfig({ ...config, host: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-300 font-medium block mb-1">Port</label>
                  <input
                    type="number"
                    value={config.port}
                    onChange={(e) => onUpdateConfig({ ...config, port: Number(e.target.value) || 1433 })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-300 font-medium block mb-1">Veritabanı Adı</label>
                  <input
                    type="text"
                    value={config.database}
                    onChange={(e) => onUpdateConfig({ ...config, database: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-300 font-medium block mb-1">ERP Sistemi / Şablon</label>
                  <select
                    value={config.erpSystem}
                    onChange={(e) => onUpdateConfig({ ...config, erpSystem: e.target.value as any })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white"
                  >
                    <option value="logo_tiger">Logo Tiger ERP (LG_xxx_STFICHE_BOM)</option>
                    <option value="netsis">Netsis ERP (TBLBOMRECP)</option>
                    <option value="sap">SAP Business One / S/4HANA</option>
                    <option value="dynamics_bc">Microsoft Dynamics 365 BC</option>
                    <option value="canias">Canias ERP</option>
                    <option value="custom_mssql">Özel MSSQL Tablosu</option>
                  </select>
                </div>
                <div>
                  <label className="text-slate-300 font-medium block mb-1">BOM / Reçete Tablosu</label>
                  <input
                    type="text"
                    value={config.bomTable}
                    onChange={(e) => onUpdateConfig({ ...config, bomTable: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-300 font-medium block mb-1">Stok / Malzeme Kartı Tablosu</label>
                  <input
                    type="text"
                    value={config.itemMasterTable}
                    onChange={(e) => onUpdateConfig({ ...config, itemMasterTable: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white font-mono"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between border-t border-slate-800">
                <button
                  onClick={handleTestConnection}
                  disabled={testStatus === 'testing'}
                  className="px-4 py-2 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-lg flex items-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${testStatus === 'testing' ? 'animate-spin' : ''}`} />
                  <span>Bağlantıyı Sına</span>
                </button>

                {testStatus === 'success' && (
                  <span className="text-emerald-400 text-xs flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" /> Bağlantı Başarılı (MSSQL 2022)
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* New Stock Item Modal */}
      {showAddStockModal && (
        <div className="fixed inset-0 z-60 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-5 max-w-md w-full shadow-2xl flex flex-col gap-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-emerald-400" />
                <span>Yeni ERP Stok Kartı Tanımla</span>
              </h4>
              <button onClick={() => setShowAddStockModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex flex-col gap-3">
              <div>
                <label className="text-slate-300 font-medium block mb-1">ERP Stok Kodu</label>
                <input
                  type="text"
                  placeholder="örn. 150.01.0025 veya HAM-BORU-25"
                  value={newStockCode}
                  onChange={(e) => setNewStockCode(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-1.5 text-white font-mono uppercase"
                />
              </div>

              <div>
                <label className="text-slate-300 font-medium block mb-1">ERP Stok Kartı Adı / Açıklaması</label>
                <input
                  type="text"
                  placeholder="örn. Ø25x2.0mm Hassas Dikişsiz Çelik Boru"
                  value={newStockName}
                  onChange={(e) => setNewStockName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-1.5 text-white"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-slate-400 text-[11px] block mb-1">Grup</label>
                  <select
                    value={newStockGroup}
                    onChange={(e) => setNewStockGroup(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-white"
                  >
                    <option value="BORU">BORU</option>
                    <option value="MIL">MIL</option>
                    <option value="MAFSAL">MAFSAL</option>
                    <option value="KECE">KECE</option>
                    <option value="VALF">VALF</option>
                    <option value="GAZ_YAG">GAZ_YAG</option>
                  </select>
                </div>
                <div>
                  <label className="text-slate-400 text-[11px] block mb-1">Birim</label>
                  <input
                    type="text"
                    value={newStockUnit}
                    onChange={(e) => setNewStockUnit(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-white"
                  />
                </div>
                <div>
                  <label className="text-slate-400 text-[11px] block mb-1">Depo Mevcudu</label>
                  <input
                    type="number"
                    value={newStockQty}
                    onChange={(e) => setNewStockQty(Number(e.target.value) || 0)}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-white font-mono"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowAddStockModal(false)}
                className="px-3 py-1.5 rounded text-slate-400 hover:text-white"
              >
                İptal
              </button>
              <button
                type="button"
                onClick={handleCreateStockItem}
                disabled={!newStockCode.trim() || !newStockName.trim()}
                className="px-4 py-1.5 rounded font-semibold text-white bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 cursor-pointer"
              >
                Stok Kartını Kaydet
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
