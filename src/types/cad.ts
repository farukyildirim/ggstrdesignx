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

export type SpringFormulaType = 'push' | 'pull' | 'lockable' | 'stainless' | 'damper';

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

export interface ErpBomLine {
  itemCode: string;
  description: string;
  quantity: number;
  unit: string;
  material: string;
  dimensions: string;
  componentType: 'RAW_MATERIAL' | 'SEMI_FINISHED' | 'PURCHASED' | 'GAS_CHARGE';
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
