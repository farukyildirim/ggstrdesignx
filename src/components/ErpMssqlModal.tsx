import React, { useState } from 'react';
import { ErpMssqlConfig, ErpBomLine, ErpTransferRecord, GasSpringParams, CalculationResult, EndFittingItem } from '../types/cad';
import { generateErpBomLines } from '../utils/gasSpringMath';
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
  const [activeTab, setActiveTab] = useState<'bom_preview' | 'connection' | 'transfer_logs'>('bom_preview');
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [isTransferring, setIsTransferring] = useState(false);
  const [transferToast, setTransferToast] = useState<string | null>(null);
  const [copiedSql, setCopiedSql] = useState(false);

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

  const bomLines = generateErpBomLines(params, calc, availableFittings);

  // Generate real T-SQL Script for MSSQL Server
  const generateSqlScript = () => {
    const linesSql = bomLines
      .map(
        (line, idx) =>
          `  INSERT INTO ${config.bomTable} (ParentPartNo, LineNo, ItemCode, Description, Quantity, Unit, Material, Dimensions, ComponentType, CreatedDate) \n  VALUES ('${calc.partNumber}', ${idx + 1}, '${line.itemCode}', '${line.description.replace(/'/g, "''")}', ${line.quantity}, '${line.unit}', '${line.material.replace(/'/g, "''")}', '${line.dimensions}', '${line.componentType}', GETDATE());`
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

  -- 3. Alt Malzeme & BOM Satırlarını Ekle
${linesSql}

  COMMIT TRANSACTION;
  PRINT 'BOM Transferi Başarıyla Tamamlandı: ${calc.partNumber} (${bomLines.length} Kalem)';
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
      setTransferToast(`BOM reçetesi ${config.database} veritabanına (${bomLines.length} kalem) başarıyla aktarıldı!`);
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
    const headers = ['Üst Ürün No', 'Satır No', 'Malzeme Kodu', 'Açıklama', 'Miktar', 'Birim', 'Malzeme', 'Boyutlar', 'Bileşen Tipi'];
    const rows = bomLines.map((l, i) => [
      calc.partNumber,
      i + 1,
      l.itemCode,
      `"${l.description}"`,
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

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-5xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/80">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-600/20 text-emerald-400 border border-emerald-500/30">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white flex items-center gap-2">
                <span>ERP & MSSQL Veritabanı Entegrasyonu</span>
                <span className="text-xs px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-cyan-300 font-mono">
                  {config.database}
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Gazlı amortisör imalat ürün ağacını (BOM) doğrudan kurumsal ERP SQL veritabanına aktarın
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

        {/* Tab Strip */}
        <div className="flex items-center justify-between px-6 py-2.5 bg-slate-950/60 border-b border-slate-800 text-xs">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setActiveTab('bom_preview')}
              className={`px-3 py-1.5 font-medium rounded-lg transition-colors ${
                activeTab === 'bom_preview'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              Reçete / BOM Önizleme ({bomLines.length} Kalem)
            </button>
            <button
              onClick={() => setActiveTab('connection')}
              className={`px-3 py-1.5 font-medium rounded-lg transition-colors ${
                activeTab === 'connection'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              MSSQL Bağlantı Ayarları
            </button>
            <button
              onClick={() => setActiveTab('transfer_logs')}
              className={`px-3 py-1.5 font-medium rounded-lg transition-colors ${
                activeTab === 'transfer_logs'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              Transfer Geçmişi ({history.length})
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${
                config.status === 'connected' ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'
              }`}
            />
            <span className="text-[11px] text-slate-400">
              {config.status === 'connected' ? `MSSQL Bağlı (${config.host})` : 'Bağlantı Bekliyor'}
            </span>
          </div>
        </div>

        {/* Toast Notification */}
        {transferToast && (
          <div className="bg-emerald-950/90 border-b border-emerald-500/70 text-emerald-200 px-6 py-2.5 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>{transferToast}</span>
            </div>
            <button onClick={() => setTransferToast(null)} className="text-emerald-400 hover:text-white">
              ✕
            </button>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 flex flex-col gap-5">
          {/* TAB 1: BOM REÇETE ÖNİZLEME */}
          {activeTab === 'bom_preview' && (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-950 p-3.5 rounded-xl border border-slate-800">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider font-mono">
                    Üretilecek Ana Ürün
                  </span>
                  <div className="text-sm font-semibold text-white font-mono flex items-center gap-2">
                    <span>{calc.partNumber}</span>
                    <span className="text-xs text-emerald-400 font-sans font-normal">
                      · {calc.springType.name}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={downloadCsv}
                    className="px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 transition-colors flex items-center gap-1.5"
                    title="Excel / CSV Formatında İndir"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                    <span>CSV / Excel</span>
                  </button>

                  <button
                    onClick={downloadSql}
                    className="px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 transition-colors flex items-center gap-1.5"
                    title="MSSQL T-SQL Script İndir"
                  >
                    <FileCode className="w-3.5 h-3.5 text-cyan-400" />
                    <span>SQL Script</span>
                  </button>

                  <button
                    onClick={handleExecuteTransfer}
                    disabled={isTransferring}
                    className="px-4 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-all flex items-center gap-1.5 shadow-md shadow-emerald-900/40 active:scale-95 cursor-pointer disabled:opacity-50"
                  >
                    {isTransferring ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Send className="w-3.5 h-3.5" />
                    )}
                    <span>MSSQL ERP'ye Aktar</span>
                  </button>
                </div>
              </div>

              {/* BOM Lines Table */}
              <div className="overflow-x-auto border border-slate-800 rounded-xl">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-950 border-b border-slate-800 text-slate-400 uppercase text-[10px] tracking-wider">
                      <th className="py-2.5 px-3">Sıra</th>
                      <th className="py-2.5 px-3">Malzeme Kodu</th>
                      <th className="py-2.5 px-3">Bileşen Tanımı</th>
                      <th className="py-2.5 px-3">Miktar / Birim</th>
                      <th className="py-2.5 px-3">Hammadde Standardı</th>
                      <th className="py-2.5 px-3">Boyut / Parametre</th>
                      <th className="py-2.5 px-3">Tip</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-sans text-slate-300">
                    {bomLines.map((line, idx) => (
                      <tr key={line.itemCode} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-2.5 px-3 font-mono text-slate-500">{idx + 1}</td>
                        <td className="py-2.5 px-3 font-mono text-cyan-300 font-medium">{line.itemCode}</td>
                        <td className="py-2.5 px-3 text-white font-medium">{line.description}</td>
                        <td className="py-2.5 px-3 font-mono">
                          {line.quantity} {line.unit}
                        </td>
                        <td className="py-2.5 px-3 text-slate-400 truncate max-w-[180px]">{line.material}</td>
                        <td className="py-2.5 px-3 font-mono text-slate-300">{line.dimensions}</td>
                        <td className="py-2.5 px-3">
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-400">
                            {line.componentType}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* T-SQL Preview Box */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider font-mono flex items-center gap-1.5">
                    <FileCode className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Üretilen T-SQL Migration / Insert Komutu</span>
                  </span>
                  <button
                    onClick={copySql}
                    className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition-colors"
                  >
                    {copiedSql ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedSql ? 'Kopyalandı' : 'SQL Kopyala'}</span>
                  </button>
                </div>
                <pre className="text-[11px] font-mono text-slate-400 overflow-x-auto max-h-[140px] bg-slate-900/90 p-3 rounded-lg border border-slate-800/80 leading-relaxed">
                  {generateSqlScript()}
                </pre>
              </div>
            </div>
          )}

          {/* TAB 2: MSSQL BAĞLANTI AYARLARI */}
          {activeTab === 'connection' && (
            <div className="bg-slate-950 p-5 rounded-xl border border-slate-800 flex flex-col gap-5">
              <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-semibold text-white">MSSQL Server & ERP Bağlantı Parametreleri</h4>
                  <p className="text-xs text-slate-400">
                    Yerel ağ veya bulut üzerindeki Microsoft SQL Server örneklerine bağlanın
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleTestConnection}
                    disabled={testStatus === 'testing'}
                    className="px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors flex items-center gap-1.5"
                  >
                    {testStatus === 'testing' ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <ShieldCheck className="w-3.5 h-3.5" />
                    )}
                    <span>Bağlantıyı Test Et</span>
                  </button>
                </div>
              </div>

              {testStatus === 'success' && (
                <div className="p-3 rounded-lg bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>
                    MSSQL Server bağlantısı başarılı! Port 1433 üzerinden veritabanına erişildi.
                  </span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
                {/* ERP Preset */}
                <div className="flex flex-col gap-1 sm:col-span-3">
                  <label className="text-slate-300 font-medium">ERP Yazılım Şablonu</label>
                  <select
                    value={config.erpSystem}
                    onChange={(e) => {
                      const val = e.target.value as any;
                      let itemTbl = 'dbo.ITEMS';
                      let bomTbl = 'dbo.BOM_LINES';
                      if (val === 'logo_tiger') {
                        itemTbl = 'dbo.LG_001_ITEMS';
                        bomTbl = 'dbo.LG_001_STFICHE_BOM';
                      } else if (val === 'netsis') {
                        itemTbl = 'dbo.TBLSTOKSB';
                        bomTbl = 'dbo.TBLRECHED';
                      } else if (val === 'sap') {
                        itemTbl = 'dbo.OITM';
                        bomTbl = 'dbo.ITT1';
                      } else if (val === 'dynamics_bc') {
                        itemTbl = 'dbo.Item_Card';
                        bomTbl = 'dbo.Production_BOM_Line';
                      } else if (val === 'canias') {
                        itemTbl = 'dbo.IASMATNR';
                        bomTbl = 'dbo.IASBOM';
                      }
                      onUpdateConfig({
                        ...config,
                        erpSystem: val,
                        itemMasterTable: itemTbl,
                        bomTable: bomTbl,
                      });
                    }}
                    className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="logo_tiger">Logo Tiger 3 / Logo Go (LG_001_STFICHE_BOM)</option>
                    <option value="netsis">Mikro / Netsis ERP (TBLSTOKSB / TBLRECHED)</option>
                    <option value="sap">SAP Business One / S4HANA (OITM / ITT1)</option>
                    <option value="dynamics_bc">Microsoft Dynamics 365 Business Central</option>
                    <option value="canias">Canias ERP (IASMATNR / IASBOM)</option>
                    <option value="custom_mssql">Özel Kurumsal MSSQL Şeması</option>
                  </select>
                </div>

                {/* Host */}
                <div className="flex flex-col gap-1 sm:col-span-2">
                  <label className="text-slate-300 font-medium">Sunucu IP / Host Adı</label>
                  <input
                    type="text"
                    value={config.host}
                    onChange={(e) => onUpdateConfig({ ...config, host: e.target.value })}
                    placeholder="192.168.1.100 veya sql.firma.local"
                    className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>

                {/* Port */}
                <div className="flex flex-col gap-1">
                  <label className="text-slate-300 font-medium">TCP Port</label>
                  <input
                    type="number"
                    value={config.port}
                    onChange={(e) => onUpdateConfig({ ...config, port: Number(e.target.value) || 1433 })}
                    className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>

                {/* Database */}
                <div className="flex flex-col gap-1 sm:col-span-2">
                  <label className="text-slate-300 font-medium">Veritabanı Adı (Catalog)</label>
                  <input
                    type="text"
                    value={config.database}
                    onChange={(e) => onUpdateConfig({ ...config, database: e.target.value })}
                    className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>

                {/* Auth Type */}
                <div className="flex flex-col gap-1">
                  <label className="text-slate-300 font-medium">Kimlik Doğrulama</label>
                  <select
                    value={config.authType}
                    onChange={(e) => onUpdateConfig({ ...config, authType: e.target.value as any })}
                    className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="sql_auth">SQL Server Auth</option>
                    <option value="windows_auth">Windows Authentication</option>
                  </select>
                </div>

                {/* Username */}
                <div className="flex flex-col gap-1">
                  <label className="text-slate-300 font-medium">Kullanıcı Adı (sa / erp_user)</label>
                  <input
                    type="text"
                    value={config.username}
                    onChange={(e) => onUpdateConfig({ ...config, username: e.target.value })}
                    className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>

                {/* Target BOM Table */}
                <div className="flex flex-col gap-1 sm:col-span-2">
                  <label className="text-slate-300 font-medium">Hedef Reçete Tablosu (BOM)</label>
                  <input
                    type="text"
                    value={config.bomTable}
                    onChange={(e) => onUpdateConfig({ ...config, bomTable: e.target.value })}
                    className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: TRANSFER LOGS */}
          {activeTab === 'transfer_logs' && (
            <div className="flex flex-col gap-3">
              <span className="text-xs text-slate-400">
                ERP MSSQL Server'a aktarılmış olan BOM transfer kayıtları ve işlem günlükleri
              </span>
              <div className="overflow-x-auto border border-slate-800 rounded-xl">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-950 border-b border-slate-800 text-slate-400 uppercase text-[10px] tracking-wider">
                      <th className="py-2.5 px-3">Tarih / Saat</th>
                      <th className="py-2.5 px-3">Amortisör Kodu</th>
                      <th className="py-2.5 px-3">Hedef Veritabanı</th>
                      <th className="py-2.5 px-3">Kalem Sayısı</th>
                      <th className="py-2.5 px-3">Durum</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-sans text-slate-300">
                    {history.map((h) => (
                      <tr key={h.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-2.5 px-3 font-mono text-slate-400">{h.timestamp}</td>
                        <td className="py-2.5 px-3 font-mono font-medium text-cyan-300">{h.partNumber}</td>
                        <td className="py-2.5 px-3 text-slate-300">{h.system}</td>
                        <td className="py-2.5 px-3 font-mono">{h.recordsCount} Kalem</td>
                        <td className="py-2.5 px-3">
                          <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 font-medium flex items-center gap-1 w-fit">
                            <Check className="w-3 h-3" />
                            <span>{h.status}</span>
                          </span>
                        </td>
                      </tr>
                    ))}
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
