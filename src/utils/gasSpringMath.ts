import { GasSpringParams, CalculationResult, EndFittingItem, GasSpringTypeDefinition, ErpBomLine } from '../types/cad';
import { DEFAULT_FITTINGS, DEFAULT_GAS_SPRING_TYPES } from './engineeringData';

export function calculateGasSpringParams(
  params: GasSpringParams,
  availableFittings: EndFittingItem[] = DEFAULT_FITTINGS,
  availableTypes: GasSpringTypeDefinition[] = DEFAULT_GAS_SPRING_TYPES
): CalculationResult {
  const { tubeOd, rodOd, stroke, extLength, forceN, rodFittingId, tubeFittingId, springTypeId } = params;

  // Resolve spring type
  const springType = availableTypes.find((t) => t.id === springTypeId) || availableTypes[0];

  // Resolve fittings
  const rodFitting = availableFittings.find((f) => f.id === rodFittingId) || availableFittings[0];
  const tubeFitting = availableFittings.find((f) => f.id === tubeFittingId) || availableFittings[0];

  const rodFittingOffset = rodFitting.offsetLenMm || 20.0;
  const tubeFittingOffset = tubeFitting.offsetLenMm || 20.0;
  const totalFittingAllowance = rodFittingOffset + tubeFittingOffset;

  // Check if a diameter-pairing specific rule exists for (tubeOd, rodOd)
  const activeDiameterRule = springType.diameterRules?.find(
    (r) => r.tubeOd === tubeOd && r.rodOd === rodOd
  );

  // Dead length (seal package, guide, base plug)
  const baseDeadLength = activeDiameterRule?.deadLengthMm !== undefined
    ? activeDiameterRule.deadLengthMm
    : springType.deadLengthMm;
  const deadLength = params.customDeadLength !== undefined ? params.customDeadLength : baseDeadLength;

  // Closed length
  const closedLength = extLength - stroke;
  const minRequiredClosed = stroke + deadLength;

  const warnings: string[] = [];
  const errors: string[] = [];

  if (closedLength < minRequiredClosed) {
    const minExt = stroke + minRequiredClosed;
    const msg = `Seçilen Açık Boy (${extLength}mm) ve Strok (${stroke}mm) fiziksel olarak imkansız! ${springType.name} amortisörü için (${deadLength}mm ölü bölge) Açık Boy en az ${minExt}mm olmalıdır.`;
    errors.push(msg);
  }

  const recommendedRod = Math.round(tubeOd * 0.45);
  if (Math.abs(rodOd - recommendedRod) > 3) {
    warnings.push(
      `Tavsiye: Ø${tubeOd}mm gövde için standart mil çapı genelde Ø${recommendedRod}mm civarıdır (Seçilen: Ø${rodOd}mm).`
    );
  }

  // Diameter-specific max force limit check (Euler/mechanical capacity)
  if (activeDiameterRule?.maxForceN && forceN > activeDiameterRule.maxForceN) {
    warnings.push(
      `Çap Güvenlik Uyarısı: Ø${tubeOd}/Ø${rodOd} kombinasyonu için tanımlı azami güvenli itme kuvveti (${activeDiameterRule.maxForceN} N) aşıldı! Seçilen: ${forceN} N.`
    );
  }

  // Slenderness / Euler Buckling Warning
  const slendernessRatio = (stroke * 1.5) / (rodOd / 4);
  if (slendernessRatio > 120 && forceN > 500) {
    warnings.push(
      `Burkulma Riski (Euler Limit): Strok / Mil çapı oranı yüksek (${slendernessRatio.toFixed(0)}). Yüksek itme kuvvetinde (${forceN} N) mil burkulmasını önlemek için daha kalın mil çapı önerilir.`
    );
  }

  // Cross section areas
  const rodAreaMm2 = Math.PI * Math.pow(rodOd / 2, 2);
  const tubeWall = activeDiameterRule?.tubeWallMm !== undefined
    ? activeDiameterRule.tubeWallMm
    : (springType.formulaType === 'stainless' ? 1.75 : 1.5);
  const tubeInnerD = tubeOd - (2 * tubeWall);
  const tubeAreaMm2 = Math.PI * Math.pow(tubeInnerD / 2, 2);

  // Pressure calculation
  let requiredPressureBar: number;
  if (springType.formulaType === 'pull') {
    // Traction pull works on annular chamber area
    const annularArea = Math.max(10, tubeAreaMm2 - rodAreaMm2);
    requiredPressureBar = (forceN / annularArea) * 10;
  } else if (springType.formulaType === 'damper') {
    // Dampers use nominal charge plus damping orifice resistance
    requiredPressureBar = Math.min(springType.maxPressureBar, (forceN / rodAreaMm2) * 4);
  } else {
    // Standard push, lockable, stainless
    requiredPressureBar = (forceN / rodAreaMm2) * 10;
  }

  const maxAllowedPressure = activeDiameterRule?.maxPressureBar !== undefined
    ? activeDiameterRule.maxPressureBar
    : springType.maxPressureBar;

  if (requiredPressureBar > maxAllowedPressure) {
    warnings.push(
      `Yüksek Basınç Uyarısı: Gerekli iç gaz basıncı (${requiredPressureBar.toFixed(1)} Bar), bu kombinasyon için izin verilen azami basıncı (${maxAllowedPressure} Bar) aşıyor! Mil çapını büyüterek basıncı düşürünüz.`
    );
  }

  // Progression factor K
  const baseKFactor = activeDiameterRule?.kFactor !== undefined
    ? activeDiameterRule.kFactor
    : springType.kFactor;
  const kFactor = params.customKFactor !== undefined ? params.customKFactor : baseKFactor;
  const f2Force = forceN * kFactor;

  // Stored Energy
  const avgForce = (forceN + f2Force) / 2;
  const storedEnergyJoules = avgForce * (stroke / 1000);

  // Tube and Rod heights
  const effectiveLength = Math.max(50, extLength - totalFittingAllowance);
  const tubeHeight = Math.max(20, effectiveLength - stroke);
  const rodHeight = stroke + 30.0;

  // Mass estimate
  const density = springType.formulaType === 'stainless' ? 8.0 : 7.85; // g/cm³
  const tubeVolCm3 = (Math.PI * (Math.pow(tubeOd / 20, 2) - Math.pow(tubeInnerD / 20, 2))) * (tubeHeight / 10);
  const rodVolCm3 = (Math.PI * Math.pow(rodOd / 20, 2)) * (rodHeight / 10);
  const fittingsWeightGrams = (rodFittingOffset + tubeFittingOffset) * 2.2 + 60;
  const weightGramsEstimate = Math.round((tubeVolCm3 + rodVolCm3) * density + fittingsWeightGrams);

  // Part Numbering
  const typeCode = springType.formulaType === 'push' ? 'GS' : springType.formulaType === 'pull' ? 'GT' : springType.formulaType === 'lockable' ? 'GL' : springType.formulaType === 'stainless' ? 'GSS' : 'GD';
  const rodFittingCode = rodFitting.shapeType.slice(0, 3).toUpperCase();
  const tubeFittingCode = tubeFitting.shapeType.slice(0, 3).toUpperCase();
  const partNumber = `${typeCode}-${tubeOd.toString().padStart(2, '0')}-${rodOd.toString().padStart(2, '0')}-${stroke.toString().padStart(4, '0')}-${extLength.toString().padStart(4, '0')}-${forceN}N-${rodFittingCode}-${tubeFittingCode}`;

  // Report HTML
  const reportHtml = `
    <div style='background-color:#0f172a; border:1px solid #334155; border-radius:8px; padding:16px; font-family:sans-serif; color:#f8fafc;'>
      <h4 style='margin-top:0; color:#38bdf8; font-size:16px; font-weight:600; display:flex; align-items:center; gap:8px;'>
        <span>📐</span> Mühendislik Hesap Raporu (${springType.name})
      </h4>
      <ul style='padding-left:20px; margin:0; line-height:1.75; font-size:14px; color:#cbd5e1;'>
        <li><b style='color:#f1f5f9;'>Amortisör Tipi:</b> ${springType.name}</li>
        <li><b style='color:#f1f5f9;'>Açık Boy (Extended Length):</b> ${extLength} mm</li>
        <li><b style='color:#f1f5f9;'>Strok (Stroke):</b> ${stroke} mm</li>
        <li><b style='color:#f1f5f9;'>Kapalı Boy (Closed Length):</b> ${closedLength} mm</li>
        <li><b style='color:#f1f5f9;'>Nominal Kuvvet (F1):</b> ${forceN} N (~${(forceN / 9.81).toFixed(1)} kgf)</li>
        <li><b style='color:#f1f5f9;'>Tam Sıkışmış Kuvvet (F2 Tahmini):</b> ${f2Force.toFixed(1)} N (K = ${kFactor.toFixed(2)})</li>
        <li><b style='color:#f1f5f9;'>Gerekli İç Gaz Basıncı (N2):</b> ~${requiredPressureBar.toFixed(1)} Bar</li>
        <li><b style='color:#f1f5f9;'>Mil Ucu:</b> ${rodFitting.name} (Pay: ${rodFittingOffset}mm)</li>
        <li><b style='color:#f1f5f9;'>Gövde Ucu:</b> ${tubeFitting.name} (Pay: ${tubeFittingOffset}mm)</li>
      </ul>
      ${errors.length > 0 ? `
        <div style='margin-top:12px; padding:10px; background-color:rgba(239, 68, 68, 0.15); border-left:4px solid #ef4444; border-radius:4px; font-size:13px; color:#fca5a5;'>
          ${errors.map(e => `<div>⚠️ <b>Hata:</b> ${e}</div>`).join('')}
        </div>
      ` : ''}
      ${warnings.length > 0 ? `
        <div style='margin-top:12px; padding:10px; background-color:rgba(234, 179, 8, 0.15); border-left:4px solid #eab308; border-radius:4px; font-size:13px; color:#fde047;'>
          ${warnings.map(w => `<div>💡 <b>Tavsiye:</b> ${w}</div>`).join('')}
        </div>
      ` : ''}
    </div>
  `;

  return {
    isValid: errors.length === 0,
    warnings,
    errors,
    recommendedRod,
    closedLength,
    minRequiredClosed,
    rodAreaMm2,
    tubeAreaMm2,
    requiredPressureBar,
    f2Force,
    kFactor,
    storedEnergyJoules,
    effectiveTubeLength: effectiveLength,
    tubeHeight,
    rodHeight,
    rodFittingOffset,
    tubeFittingOffset,
    weightGramsEstimate,
    partNumber,
    reportHtml,
    springType,
    activeDiameterRule,
  };
}

export function generateErpBomLines(
  params: GasSpringParams,
  calc: CalculationResult,
  availableFittings: EndFittingItem[] = DEFAULT_FITTINGS
): ErpBomLine[] {
  const rodFitting = availableFittings.find((f) => f.id === params.rodFittingId) || availableFittings[0];
  const tubeFitting = availableFittings.find((f) => f.id === params.tubeFittingId) || availableFittings[0];
  const { tubeOd, rodOd } = params;
  const isStainless = calc.springType.formulaType === 'stainless';

  return [
    {
      itemCode: `RAW-TUBE-${tubeOd}-${calc.tubeHeight.toFixed(0)}`,
      description: `Hassas Dikişsiz Silindir Borusu Ø${tubeOd} mm (L=${calc.tubeHeight.toFixed(0)}mm)`,
      quantity: 1,
      unit: 'ADET',
      material: isStainless ? 'AISI 316L (1.4404) Dikişsiz Paslanmaz' : 'St 37-2BK EN 10305-1 Dikişsiz Çelik',
      dimensions: `Ø${tubeOd} × ${calc.tubeHeight.toFixed(0)} mm`,
      componentType: 'RAW_MATERIAL',
    },
    {
      itemCode: `RAW-ROD-${rodOd}-${calc.rodHeight.toFixed(0)}`,
      description: `Taşlanmış Sert Kromlu Piston Mili Ø${rodOd} mm (L=${calc.rodHeight.toFixed(0)}mm)`,
      quantity: 1,
      unit: 'ADET',
      material: isStainless ? 'AISI 316 / 1.4401 Taşlanmış Paslanmaz Mil' : 'C45 / 20MnV6 Taşlanmış Sert Krom (Ra ≤ 0.1μm)',
      dimensions: `Ø${rodOd} × ${calc.rodHeight.toFixed(0)} mm`,
      componentType: 'RAW_MATERIAL',
    },
    {
      itemCode: `FIT-ROD-${rodFitting.id.toUpperCase()}`,
      description: `Mil Ucu: ${rodFitting.name}`,
      quantity: 1,
      unit: 'ADET',
      material: rodFitting.material,
      dimensions: `L=${rodFitting.offsetLenMm}mm ${rodFitting.holeDiaMm ? `Ø${rodFitting.holeDiaMm}mm delik` : ''} ${rodFitting.threadSize || ''}`,
      componentType: 'PURCHASED',
    },
    {
      itemCode: `FIT-TUBE-${tubeFitting.id.toUpperCase()}`,
      description: `Gövde Ucu: ${tubeFitting.name}`,
      quantity: 1,
      unit: 'ADET',
      material: tubeFitting.material,
      dimensions: `L=${tubeFitting.offsetLenMm}mm ${tubeFitting.holeDiaMm ? `Ø${tubeFitting.holeDiaMm}mm delik` : ''} ${tubeFitting.threadSize || ''}`,
      componentType: 'PURCHASED',
    },
    {
      itemCode: `SEAL-KIT-${tubeOd}-${rodOd}`,
      description: `Yüksek Basınç Sızdırmazlık & Kılavuz Burç Paketi Ø${tubeOd}/Ø${rodOd}`,
      quantity: 1,
      unit: 'TAKIM',
      material: isStainless ? 'FKM (Viton) + Karbonlu PTFE Kılavuz' : 'Poliüretan NBR Çift Dudaklı Keçe + PTFE Kılavuz',
      dimensions: `Ø${tubeOd} / Ø${rodOd} mm Standart`,
      componentType: 'PURCHASED',
    },
    {
      itemCode: `VALVE-PISTON-${rodOd}`,
      description: `${calc.springType.formulaType === 'lockable' ? 'Blokaj Baypas Kontrol Subabı' : 'Dinamik Orifis Sönümleme Piston Başı'}`,
      quantity: 1,
      unit: 'ADET',
      material: 'CuZn39Pb3 Pirinç / Sinter Bronz',
      dimensions: `Ø${rodOd} Mil Geçişli`,
      componentType: 'SEMI_FINISHED',
    },
    {
      itemCode: `GAS-N2-CHARGE-${Math.round(calc.requiredPressureBar)}BAR`,
      description: `Yüksek Saflıkta Azot Gazı Dolumu (%99.99 N2)`,
      quantity: Math.round(calc.requiredPressureBar),
      unit: 'BAR',
      material: 'Azot Gazı (N2) + ISO VG 15 Hidrolik Yağ',
      dimensions: `P1 = ${calc.requiredPressureBar.toFixed(1)} Bar (${calc.springType.oilDampingRatio * 100}% Yağ Hacmi)`,
      componentType: 'GAS_CHARGE',
    },
  ];
}
