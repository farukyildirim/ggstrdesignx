/**
 * Gas Spring Parametric Engineering CAD Types & ERP Entities
 */

export type EndFittingShapeType = 'eyelet' | 'ball' | 'clevis' | 'threaded' | 'flange';

export interface EndFittingItem {
  id: string;
  name: string;
  category: 'Mafsal' | 'Dişli' | 'Çatal' | 'Flanş' | 'Özel';
  shapeType: EndFittingShapeType;
  offsetLenMm: number; // Length contribution to extended length (e.g. 20mm)
  holeDiaMm?: number;  // Bore/hole diameter (e.g. 8mm)
  threadSize?: string; // Thread code (e.g. "M8x1.25", "M10")
  material: string;
  color: string;       // Hex or CSS color for 3D render & STEP AP214
  isCustom?: boolean;
}

export type SpringFormulaType = 'push' | 'pull' | 'lockable' | 'stainless' | 'damper' | 'custom';

export interface DiameterPairRule {
  id: string;
  tubeOd: number;         // Silindir/Tüp dış çapı (mm) örn. 15, 18, 22, 28, 40
  rodOd: number;          // Mil çapı (mm) örn. 6, 8, 10, 14, 20
  kFactor?: number;       // Bu çapa özel K-faktörü (F2/F1)
  deadLengthMm?: number;  // Bu çapa özel ölü boy payı (mm)
  maxPressureBar?: number;// Bu çapa özel azami iç basınç limiti (Bar)
  maxForceN?: number;     // Bu mil çapı için azami burkulmasız kuvvet sınırı (N)
  tubeWallMm?: number;    // Bu çapa özel silindir et kalınlığı (mm)
  note?: string;          // Örn: "18/8 Standart Seri", "28/14 Ağır Hizmet"
}

export interface GasSpringTypeDefinition {
  id: string;
  name: string;
  formulaType: SpringFormulaType;
  description: string;
  kFactor: number;          // Force progression ratio F2/F1 (e.g. 1.35)
  deadLengthMm: number;     // Internal seal & guide dead length (e.g. 40mm)
  maxPressureBar: number;   // Max continuous seal rating (e.g. 180 Bar)
  oilDampingRatio: number;  // Damping oil volume fraction (0.10 to 0.35)
  tempMinC: number;         // Operating temp min
  tempMaxC: number;         // Operating temp max
  materialGrade: string;    // e.g. "St 37-2 / C45 Chrome" or "AISI 316 Ti"
  isCustom?: boolean;       // Kullanıcı tarafından eklenen özel tip
  diameterRules?: DiameterPairRule[]; // Silindir ve mil çapına göre özelleştirilmiş kurallar
}

export interface GasSpringParams {
  tubeOd: number; // Tube Outer Diameter (mm)
  rodOd: number;  // Rod Outer Diameter (mm)
  stroke: number; // Stroke S (mm)
  extLength: number; // Extended Length L (mm)
  forceN: number; // Nominal force F1 (N)
  rodFittingId: string;  // Reference to EndFittingItem id
  tubeFittingId: string; // Reference to EndFittingItem id
  springTypeId: string;  // Reference to GasSpringTypeDefinition id
  customKFactor?: number; // Override if customized
  customDeadLength?: number; // Override if customized
}

export interface CalculationResult {
  isValid: boolean;
  warnings: string[];
  errors: string[];
  recommendedRod: number;
  closedLength: number;
  minRequiredClosed: number;
  rodAreaMm2: number;
  tubeAreaMm2?: number;
  requiredPressureBar: number;
  f2Force: number;
  kFactor: number;
  storedEnergyJoules: number;
  effectiveTubeLength: number;
  tubeHeight: number;
  rodHeight: number;
  rodFittingOffset: number;
  tubeFittingOffset: number;
  weightGramsEstimate: number;
  partNumber: string;
  reportHtml: string;
  springType: GasSpringTypeDefinition;
  activeDiameterRule?: DiameterPairRule;
}

export interface DesignRevision {
  revId: string; // e.g. "REV-01", "REV-02", "REV-A"
  timestamp: string; // ISO date string
  author: string; // Revizyonu yapan mühendis
  notes: string; // Revizyon gerekçesi / değişiklik notları
  params: GasSpringParams;
  calcSnapshot: {
    partNumber: string;
    extLength: number;
    stroke: number;
    forceN: number;
    tubeOd: number;
    rodOd: number;
    requiredPressureBar: number;
    f2Force: number;
    kFactor: number;
    springTypeName: string;
  };
}

export interface SavedDesign {
  id: string;
  code: string; // e.g. "DSG-001", "PRJ-2026-A"
  name: string; // e.g. "Kabin Kapağı Amortisörü"
  customerOrProject: string; // e.g. "Otomotiv Projesi #42"
  createdAt: string;
  updatedAt: string;
  currentRevId: string; // e.g. "REV-02"
  revisions: DesignRevision[];
  tags: string[];
}

export interface ErpMssqlConfig {
  host: string;
  port: number;
  database: string;
  username: string;
  password?: string;
  authType: 'sql_auth' | 'windows_auth';
  erpSystem: 'logo_tiger' | 'netsis' | 'sap' | 'dynamics_bc' | 'canias' | 'custom_mssql';
  itemMasterTable: string;
  bomTable: string;
  autoSync: boolean;
  lastSyncTime?: string;
  status: 'idle' | 'connected' | 'error';
}

export interface ErpStockItem {
  stockCode: string; // ERP Stok Kodu örn. "150.01.0018"
  stockName: string; // ERP Stok Kartı Adı örn. "Ø18x1.5mm Soğuk Çekme Dikişsiz Boru St 37-2BK"
  stockGroup: 'BORU' | 'MIL' | 'MAFSAL' | 'KECE' | 'VALF' | 'GAZ_YAG';
  unit: string; // "METRE", "ADET", "TAKIM", "BAR", "LITRE"
  inStockQty: number; // Depo Mevcut Miktarı
  leadTimeDays?: number; // Tedarik Süresi (gün)
  priceTry?: number; // Birim Maliyet (TL)
}

export interface BomErpMappingRule {
  id: string;
  cadItemPrefix: string; // örn: "RAW-TUBE-18", "FIT-ROD-FITTING_EYELET_8"
  erpStockCode: string; // örn: "150.01.0018"
  erpStockName: string; // örn: "Ø18x1.5mm Çelik Boru"
}

export interface ErpBomLine {
  itemCode: string; // CAD BOM Kodu (örn. RAW-TUBE-18-160)
  erpStockCode: string; // Eşleşen ERP Stok Kodu (örn. 150.01.0018)
  erpStockName: string; // Eşleşen ERP Stok Açıklaması
  description: string;
  quantity: number;
  unit: string;
  material: string;
  dimensions: string;
  componentType: 'RAW_MATERIAL' | 'SEMI_FINISHED' | 'PURCHASED' | 'GAS_CHARGE';
  isMatched: boolean; // ERP Stok Kartı ile eşleşti mi?
  stockAvailable?: number; // ERP Depo mevcudu
}

export interface ErpTransferRecord {
  id: string;
  timestamp: string;
  partNumber: string;
  system: string;
  status: 'SUCCESS' | 'PENDING' | 'FAILED';
  recordsCount: number;
  payloadSql: string;
}

export interface BatchDesignRow {
  id: string;
  name: string;
  tubeOd: number;
  rodOd: number;
  stroke: number;
  extLength: number;
  forceN: number;
  rodFittingId: string;
  tubeFittingId: string;
  springTypeId: string;
  selected: boolean;
  calcResult?: CalculationResult;
}
