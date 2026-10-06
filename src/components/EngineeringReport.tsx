import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ReferenceDot,
  AreaChart,
  Area,
} from 'recharts';
import { GasSpringParams, CalculationResult } from '../types/cad';
import { Copy, Check, FileText, Wrench, ShieldAlert, Cpu, Gauge, Activity, Info } from 'lucide-react';

interface EngineeringReportProps {
  params: GasSpringParams;
  calc: CalculationResult;
}

/**
 * Recharts component within EngineeringReport that visualizes the calculated
 * internal gas pressure based on the F1 force input, updating dynamically
 * whenever the F1 value or rod diameter changes.
 */
export const InternalGasPressureChart: React.FC<{ params: GasSpringParams; calc: CalculationResult }> = ({
  params,
  calc,
}) => {
  const { rodOd, tubeOd, forceN, stroke } = params;
  const currentPressure = calc.requiredPressureBar;
  const currentP2 = currentPressure * calc.kFactor;
  const [showAllRods, setShowAllRods] = useState<boolean>(true);
  const [chartMode, setChartMode] = useState<'forceCurve' | 'strokeRise'>('forceCurve');

  // Dynamically compute Force (50N -> 2500N) vs Pressure (Bar) based on current rodOd and forceN
  const chartData = useMemo(() => {
    const rodDiameters = [6, 8, 10, 14, 20];
    const forceSteps = [50, 100, 200, 300, 400, 500, 650, 800, 1000, 1250, 1500, 1800, 2100, 2500];

    // Ensure the exact current forceN is a discrete data point on the curve
    if (!forceSteps.includes(forceN)) {
      forceSteps.push(forceN);
      forceSteps.sort((a, b) => a - b);
    }

    const currentArea = Math.PI * Math.pow(rodOd / 2, 2);

    return forceSteps.map((f) => {
      const point: Record<string, number> = {
        force: f,
        pressure: parseFloat(((f / currentArea) * 10).toFixed(1)),
      };

      // Comparison lines for standard rods
      rodDiameters.forEach((d) => {
        const a = Math.PI * Math.pow(d / 2, 2);
        point[`rod_${d}`] = parseFloat(((f / a) * 10).toFixed(1));
      });

      return point;
    });
  }, [rodOd, forceN]);

  // Dynamic stroke progression pressure data
  const strokeData = useMemo(() => {
    const points = [];
    for (let pct = 0; pct <= 100; pct += 10) {
      const instantP = currentPressure * (1 + (calc.kFactor - 1) * (pct / 100));
      const instantF = forceN * (1 + (calc.kFactor - 1) * (pct / 100));
      points.push({
        percent: pct,
        mm: Math.round((pct / 100) * stroke),
        pressure: parseFloat(instantP.toFixed(1)),
        force: Math.round(instantF),
      });
    }
    return points;
  }, [currentPressure, calc.kFactor, forceN, stroke]);

  // Safety status level based on calculated Bar
  const statusInfo = useMemo(() => {
    if (currentPressure <= 150) {
      return {
        label: 'Standart Güvenli Çalışma Bölgesi',
        badge: 'text-emerald-400 bg-emerald-950/50 border-emerald-800/70',
        note: 'Standart NBR/Poliüretan keçe için uzun ömürlü ve ideal basınç seviyesi.',
      };
    } else if (currentPressure <= 200) {
      return {
        label: 'Yüksek Basınç Bölgesi',
        badge: 'text-amber-400 bg-amber-950/50 border-amber-800/70',
        note: 'Kabul edilebilir seviye. Keçe sürtünmesini azaltmak için PTFE katkılı kılavuz önerilir.',
      };
    } else {
      return {
        label: 'Kritik Basınç Sınırı (>200 Bar)',
        badge: 'text-red-400 bg-red-950/50 border-red-800/70',
        note: 'Basınç çok yüksek! Mil çapını büyüterek (ör. Ø10 veya Ø14) basıncı düşürmeniz tavsiye edilir.',
      };
    }
  }, [currentPressure]);

  return (
    <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 flex flex-col gap-4 shadow-inner">
      {/* Chart Top Header & Mode Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-blue-950/60 border border-blue-800/60 text-blue-400">
            <Gauge className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-semibold text-slate-100 uppercase tracking-wider font-mono flex items-center gap-2">
              <span>İç Gaz Basıncı Dinamik Analizi</span>
              <span className="text-[10px] text-cyan-400 lowercase font-normal">
                (F1 = {forceN}N, Ø{rodOd}mm)
              </span>
            </h4>
            <span className="text-[11px] text-slate-400">
              Formül: P = (F1 / [π × (d/2)²]) × 10 Bar
            </span>
          </div>
        </div>

        {/* Mode Selector Buttons */}
        <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800 self-start sm:self-auto">
          <button
            onClick={() => setChartMode('forceCurve')}
            className={`px-2.5 py-1 text-xs font-medium rounded transition-colors ${
              chartMode === 'forceCurve'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            F1 vs. Basınç Eğrisi
          </button>
          <button
            onClick={() => setChartMode('strokeRise')}
            className={`px-2.5 py-1 text-xs font-medium rounded transition-colors ${
              chartMode === 'strokeRise'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Strok Sıkışma Artışı (P1→P2)
          </button>
        </div>
      </div>

      {/* Dynamic Status Strip */}
      <div className={`p-3 rounded-lg border ${statusInfo.badge} flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs`}>
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 shrink-0" />
          <div>
            <span className="text-slate-300">Hesaplanan İç Basınç: </span>
            <strong className="font-mono text-sm text-white tabular-nums">
              {currentPressure.toFixed(1)} Bar
            </strong>
            <span className="text-slate-400 mx-1.5">·</span>
            <span className="font-semibold">{statusInfo.label}</span>
          </div>
        </div>
        <div className="text-[11px] text-slate-300 font-sans">
          {statusInfo.note}
        </div>
      </div>

      {/* Recharts Visualization */}
      <div className="w-full h-[270px]">
        {chartMode === 'forceCurve' ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{ top: 15, right: 20, left: -5, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis
                dataKey="force"
                stroke="#64748b"
                tick={{ fill: '#94a3b8', fontSize: 11 }}
                unit=" N"
                tickLine={{ stroke: '#334155' }}
              />
              <YAxis
                stroke="#64748b"
                tick={{ fill: '#94a3b8', fontSize: 11 }}
                unit=" Bar"
                tickLine={{ stroke: '#334155' }}
                domain={[0, (dataMax: number) => Math.min(320, Math.ceil(dataMax * 1.15))]}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    const currentVal = payload.find((p) => p.dataKey === 'pressure')?.value;
                    const isOperatingPoint = Math.abs(Number(label) - forceN) < 5;
                    return (
                      <div className="bg-slate-900/95 border border-slate-700 p-3 rounded-lg shadow-xl backdrop-blur-md text-xs font-sans">
                        <div className="flex items-center justify-between gap-4 border-b border-slate-800 pb-1.5 mb-2">
                          <span className="text-slate-400">Nominal Kuvvet F1:</span>
                          <span className="font-mono text-cyan-300 font-bold">{label} N</span>
                        </div>
                        <div className="flex flex-col gap-1.5 font-mono">
                          <div className="flex items-center justify-between gap-4 text-emerald-300 font-semibold">
                            <span className="flex items-center gap-1.5 font-sans font-normal text-slate-200">
                              <span className="w-2 h-2 rounded-full bg-emerald-400" />
                              Seçili Mil (Ø{rodOd}mm):
                            </span>
                            <span>{currentVal} Bar</span>
                          </div>
                          {isOperatingPoint && (
                            <div className="mt-1 pt-1 border-t border-slate-800 text-[11px] text-amber-300 font-sans">
                              ★ Anlık Tasarım Çalışma Noktası
                            </div>
                          )}
                          {showAllRods && (
                            <div className="mt-2 pt-1.5 border-t border-slate-800 flex flex-col gap-0.5 text-[11px] text-slate-400">
                              <span className="font-sans text-[10px] uppercase text-slate-500 mb-0.5">
                                Diğer Çaplar ile Karşılaştırma:
                              </span>
                              {[6, 8, 10, 14, 20]
                                .filter((d) => d !== rodOd)
                                .map((d) => {
                                  const val = payload.find((p) => p.dataKey === `rod_${d}`)?.value;
                                  return (
                                    <div key={d} className="flex justify-between">
                                      <span>Ø{d}mm Mil:</span>
                                      <span className="text-slate-300">{val} Bar</span>
                                    </div>
                                  );
                                })}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />

              {/* Threshold Lines */}
              <ReferenceLine
                y={200}
                stroke="#ef4444"
                strokeDasharray="4 4"
                label={{
                  value: '200 Bar Keçe Güvenlik Sınırı',
                  fill: '#ef4444',
                  fontSize: 10,
                  position: 'top',
                }}
              />
              <ReferenceLine
                y={150}
                stroke="#eab308"
                strokeDasharray="2 2"
                label={{
                  value: '150 Bar Standart Eşik',
                  fill: '#eab308',
                  fontSize: 10,
                  position: 'insideBottomRight',
                }}
              />

              {/* Comparison Lines for other rod diameters */}
              {showAllRods && (
                <>
                  {rodOd !== 6 && (
                    <Line type="monotone" dataKey="rod_6" stroke="#475569" strokeDasharray="2 2" dot={false} strokeWidth={1} name="Ø6mm" />
                  )}
                  {rodOd !== 8 && (
                    <Line type="monotone" dataKey="rod_8" stroke="#475569" strokeDasharray="2 2" dot={false} strokeWidth={1} name="Ø8mm" />
                  )}
                  {rodOd !== 10 && (
                    <Line type="monotone" dataKey="rod_10" stroke="#475569" strokeDasharray="2 2" dot={false} strokeWidth={1} name="Ø10mm" />
                  )}
                  {rodOd !== 14 && (
                    <Line type="monotone" dataKey="rod_14" stroke="#475569" strokeDasharray="2 2" dot={false} strokeWidth={1} name="Ø14mm" />
                  )}
                  {rodOd !== 20 && (
                    <Line type="monotone" dataKey="rod_20" stroke="#475569" strokeDasharray="2 2" dot={false} strokeWidth={1} name="Ø20mm" />
                  )}
                </>
              )}

              {/* Active Selected Rod Curve */}
              <Line
                type="monotone"
                dataKey="pressure"
                stroke="#38bdf8"
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 6, fill: '#38bdf8', stroke: '#0284c7', strokeWidth: 2 }}
                name={`Seçili Mil Ø${rodOd}mm`}
              />

              {/* Operating Point Reference Dot */}
              <ReferenceDot
                x={forceN}
                y={currentPressure}
                r={6}
                fill="#10b981"
                stroke="#ffffff"
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={strokeData} margin={{ top: 15, right: 20, left: -5, bottom: 5 }}>
              <defs>
                <linearGradient id="pressureRiseGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.6} />
                  <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="percent" stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 11 }} unit="%" tickLine={{ stroke: '#334155' }} />
              <YAxis stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 11 }} unit=" Bar" tickLine={{ stroke: '#334155' }} domain={[Math.floor(currentPressure * 0.9), Math.ceil(currentP2 * 1.1)]} />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const d = payload[0].payload;
                    return (
                      <div className="bg-slate-900/95 border border-slate-700 p-2.5 rounded-lg shadow-xl text-xs font-mono">
                        <div className="text-cyan-300 font-semibold border-b border-slate-800 pb-1 mb-1.5">
                          Strok: %{d.percent} ({d.mm} mm)
                        </div>
                        <div className="text-slate-300">Anlık Gaz Basıncı: <strong className="text-sky-300">{d.pressure} Bar</strong></div>
                        <div className="text-slate-300">Anlık Kuvvet F(s): <strong className="text-amber-300">{d.force} N</strong></div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Area type="monotone" dataKey="pressure" stroke="#38bdf8" strokeWidth={2.5} fillOpacity={1} fill="url(#pressureRiseGrad)" />
              <ReferenceLine y={currentPressure} stroke="#10b981" strokeDasharray="3 3" label={{ value: `P1 = ${currentPressure.toFixed(1)} Bar`, fill: '#10b981', fontSize: 10, position: 'insideBottomLeft' }} />
              <ReferenceLine y={currentP2} stroke="#f59e0b" strokeDasharray="3 3" label={{ value: `P2 = ${currentP2.toFixed(1)} Bar`, fill: '#f59e0b', fontSize: 10, position: 'insideTopLeft' }} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Chart Footer Legend & Dynamic Toggle */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800/80 text-[11px] text-slate-400">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-sky-400 inline-block" />
            <span className="text-slate-300 font-medium">Seçili Mil (Ø{rodOd} mm)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 border border-white inline-block" />
            <span className="text-slate-300 font-medium">
              Çalışma Noktası (F1: {forceN} N · P1: {currentPressure.toFixed(1)} Bar)
            </span>
          </div>
          {chartMode === 'forceCurve' && (
            <label className="flex items-center gap-1.5 cursor-pointer text-slate-400 hover:text-slate-200 transition-colors">
              <input
                type="checkbox"
                checked={showAllRods}
                onChange={(e) => setShowAllRods(e.target.checked)}
                className="accent-blue-500 rounded"
              />
              <span>Alternatif Mil Çaplarını Göster</span>
            </label>
          )}
        </div>
        <div className="text-[11px] font-mono text-slate-500">
          Akışkan: N₂ Azot Gazı · 20°C
        </div>
      </div>
    </div>
  );
};

export const EngineeringReport: React.FC<EngineeringReportProps> = ({ params, calc }) => {
  const [activeTab, setActiveTab] = useState<'report' | 'kinematics' | 'bom'>('report');
  const [copiedPartNumber, setCopiedPartNumber] = useState(false);

  const copyPartNumber = () => {
    navigator.clipboard.writeText(calc.partNumber);
    setCopiedPartNumber(true);
    setTimeout(() => setCopiedPartNumber(false), 2000);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl flex flex-col gap-4">
      {/* Tab Navigation conforming to skill rules (functional buttons, no pill sandwiches) */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
          <button
            onClick={() => setActiveTab('report')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              activeTab === 'report'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Mühendislik Raporu
          </button>
          <button
            onClick={() => setActiveTab('kinematics')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              activeTab === 'kinematics'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Kuvvet & Kinematik
          </button>
          <button
            onClick={() => setActiveTab('bom')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              activeTab === 'bom'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            BOM / Malzeme Listesi
          </button>
        </div>

        {/* Part Number Badge */}
        <button
          onClick={copyPartNumber}
          title="Parça Numarasını Kopyala"
          className="flex items-center gap-1.5 text-xs font-mono text-cyan-300 hover:text-cyan-200 bg-slate-800/80 hover:bg-slate-700/80 px-2.5 py-1.5 rounded-md border border-slate-700/70 transition-colors"
        >
          {copiedPartNumber ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          <span className="truncate max-w-[170px]">{calc.partNumber}</span>
        </button>
      </div>

      {/* Tab 1: Mühendislik Raporu (Exact matches to Gradio report) */}
      {activeTab === 'report' && (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="bg-slate-950/70 border border-slate-800/80 rounded-lg p-3">
              <span className="text-[11px] text-slate-400 uppercase tracking-wide block font-sans">
                Açık Boy (L)
              </span>
              <span className="text-base font-semibold text-white font-mono tabular-nums">
                {params.extLength} <span className="text-xs text-slate-400 font-sans">mm</span>
              </span>
            </div>

            <div className="bg-slate-950/70 border border-slate-800/80 rounded-lg p-3">
              <span className="text-[11px] text-slate-400 uppercase tracking-wide block font-sans">
                Strok (S)
              </span>
              <span className="text-base font-semibold text-emerald-400 font-mono tabular-nums">
                {params.stroke} <span className="text-xs text-slate-400 font-sans">mm</span>
              </span>
            </div>

            <div className="bg-slate-950/70 border border-slate-800/80 rounded-lg p-3">
              <span className="text-[11px] text-slate-400 uppercase tracking-wide block font-sans">
                Kapalı Boy (Closed)
              </span>
              <span className="text-base font-semibold text-white font-mono tabular-nums">
                {calc.closedLength} <span className="text-xs text-slate-400 font-sans">mm</span>
              </span>
            </div>

            <div className="bg-slate-950/70 border border-slate-800/80 rounded-lg p-3">
              <span className="text-[11px] text-slate-400 uppercase tracking-wide block font-sans">
                Nominal Kuvvet (F1)
              </span>
              <span className="text-base font-semibold text-cyan-400 font-mono tabular-nums">
                {params.forceN} <span className="text-xs text-slate-400 font-sans">N (~{(params.forceN / 9.81).toFixed(1)} kgf)</span>
              </span>
            </div>

            <div className="bg-slate-950/70 border border-slate-800/80 rounded-lg p-3">
              <span className="text-[11px] text-slate-400 uppercase tracking-wide block font-sans">
                Sıkışmış Kuvvet (F2)
              </span>
              <span className="text-base font-semibold text-amber-400 font-mono tabular-nums">
                {calc.f2Force.toFixed(1)} <span className="text-xs text-slate-400 font-sans">N (~{(calc.f2Force / 9.81).toFixed(1)} kgf)</span>
              </span>
            </div>

            <div className="bg-slate-950/70 border border-slate-800/80 rounded-lg p-3">
              <span className="text-[11px] text-slate-400 uppercase tracking-wide block font-sans">
                İç Gaz Basıncı (N2)
              </span>
              <span className="text-base font-semibold text-sky-400 font-mono tabular-nums">
                ~{calc.requiredPressureBar.toFixed(1)} <span className="text-xs text-slate-400 font-sans">Bar</span>
              </span>
            </div>
          </div>

          {/* Secondary Physical Metrics */}
          <div className="bg-slate-950/40 border border-slate-800/60 rounded-lg p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-300">
            <div>
              <span className="text-slate-400">Mil Kesit Alanı: </span>
              <strong className="text-slate-100 font-mono tabular-nums">{calc.rodAreaMm2.toFixed(1)} mm²</strong>
            </div>
            <div>
              <span className="text-slate-400">Depolanan Enerji: </span>
              <strong className="text-slate-100 font-mono tabular-nums">{calc.storedEnergyJoules.toFixed(1)} J</strong>
            </div>
            <div>
              <span className="text-slate-400">Tahmini Ağırlık: </span>
              <strong className="text-slate-100 font-mono tabular-nums">~{calc.weightGramsEstimate} g</strong>
            </div>
            <div>
              <span className="text-slate-400">K-Faktörü: </span>
              <strong className="text-slate-100 font-mono tabular-nums">{calc.kFactor.toFixed(2)}</strong>
            </div>
          </div>

          {/* Dedicated Recharts Component Defined Within This File */}
          <InternalGasPressureChart params={params} calc={calc} />

          {/* Warnings & Advice */}
          {calc.errors.length > 0 && (
            <div className="bg-red-950/40 border border-red-800/80 rounded-lg p-3 text-xs text-red-300 flex flex-col gap-1.5">
              {calc.errors.map((err, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="text-red-400 font-bold shrink-0">⚠️ Hata:</span>
                  <span>{err}</span>
                </div>
              ))}
            </div>
          )}

          {calc.warnings.length > 0 && (
            <div className="bg-amber-950/30 border border-amber-800/70 rounded-lg p-3 text-xs text-amber-300 flex flex-col gap-1.5">
              {calc.warnings.map((warn, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="text-amber-400 font-bold shrink-0">💡 Tavsiye:</span>
                  <span>{warn}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Kuvvet & Kinematik */}
      {activeTab === 'kinematics' && (
        <div className="flex flex-col gap-3.5 text-xs text-slate-300">
          <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-3.5 flex flex-col gap-2">
            <h4 className="text-xs font-semibold text-sky-400 uppercase tracking-wider font-mono">
              F(x) Karakteristik Kuvvet Eğrisi
            </h4>
            <p className="text-slate-400 leading-relaxed">
              Gazlı amortisörlerde piston mili silindir içine girdikçe iç hacim mil hacmi kadar daralır.
              İç hacim küçüldükçe Boyle-Mariotte kanununa göre basınç yükselir:
            </p>
            <div className="bg-slate-900 border border-slate-800 rounded p-2.5 font-mono text-[11px] text-cyan-300">
              F(s) = F1 × [ 1 + (K - 1) × (s / S) ] ··· K = {calc.kFactor.toFixed(2)}
            </div>
            <div className="grid grid-cols-4 gap-2 pt-1 font-mono text-[11px]">
              <div className="bg-slate-900 p-2 rounded border border-slate-800">
                <span className="text-slate-400 block text-[10px]">0% Açık (F1)</span>
                <span className="text-cyan-400 font-bold">{params.forceN} N</span>
              </div>
              <div className="bg-slate-900 p-2 rounded border border-slate-800">
                <span className="text-slate-400 block text-[10px]">33% Sıkışma</span>
                <span className="text-slate-200">{(params.forceN * 1.116).toFixed(0)} N</span>
              </div>
              <div className="bg-slate-900 p-2 rounded border border-slate-800">
                <span className="text-slate-400 block text-[10px]">66% Sıkışma</span>
                <span className="text-slate-200">{(params.forceN * 1.231).toFixed(0)} N</span>
              </div>
              <div className="bg-slate-900 p-2 rounded border border-slate-800">
                <span className="text-slate-400 block text-[10px]">100% Kapalı (F2)</span>
                <span className="text-amber-400 font-bold">{calc.f2Force.toFixed(0)} N</span>
              </div>
            </div>
          </div>

          {/* Installation orientation rule */}
          <div className="bg-slate-950/50 border border-slate-800 rounded-lg p-3 flex items-start gap-2.5">
            <Wrench className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
            <div className="text-[12px] leading-relaxed text-slate-300">
              <strong className="text-white block font-medium">Montaj Yönü Kuralı:</strong>
              Amortisör piston mili normal kapalı dinlenme pozisyonunda <strong>aşağı bakacak şekilde</strong> monte edilmelidir.
              Bu sayede iç hidrolik yağ keçeyi sürekli yağlar ve son konum hidrolik sönümlemesi (end-position damping) kusursuz çalışır.
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: BOM / Malzeme Listesi */}
      {activeTab === 'bom' && (
        <div className="flex flex-col gap-3">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px] tracking-wider">
                  <th className="py-2 px-2.5">Parça Adı</th>
                  <th className="py-2 px-2.5">Malzeme & Standart</th>
                  <th className="py-2 px-2.5">Boyut (mm)</th>
                  <th className="py-2 px-2.5">Renk / Kaplama</th>
                  <th className="py-2 px-2.5 text-right">Adet</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-sans text-slate-300">
                <tr>
                  <td className="py-2 px-2.5 font-medium text-white">Silindir Gövde (Outer Tube)</td>
                  <td className="py-2 px-2.5">St 37-2BK Hassas Dikişsiz Çelik Boru</td>
                  <td className="py-2 px-2.5 font-mono">Ø{params.tubeOd} × {calc.tubeHeight.toFixed(0)} mm</td>
                  <td className="py-2 px-2.5">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-neutral-900 border border-neutral-600" />
                      Siyah Elektrostatik Toz Boya
                    </span>
                  </td>
                  <td className="py-2 px-2.5 text-right font-mono">1</td>
                </tr>
                <tr>
                  <td className="py-2 px-2.5 font-medium text-white">Piston Mili (Piston Rod)</td>
                  <td className="py-2 px-2.5">C45 / 20MnV6 Taşlanmış Sert Kromlu Çelik</td>
                  <td className="py-2 px-2.5 font-mono">Ø{params.rodOd} × {calc.rodHeight.toFixed(0)} mm</td>
                  <td className="py-2 px-2.5">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-slate-200 border border-slate-400" />
                      Parlak Sert Krom (Ra ≤ 0.1μm)
                    </span>
                  </td>
                  <td className="py-2 px-2.5 text-right font-mono">1</td>
                </tr>
                <tr>
                  <td className="py-2 px-2.5 font-medium text-white">Gövde Mafsalı (Tube End)</td>
                  <td className="py-2 px-2.5">Alüminyum 6082-T6 / Çelik Dövme Uç Elemanı</td>
                  <td className="py-2 px-2.5 font-mono">+{calc.tubeFittingOffset} mm boy payı</td>
                  <td className="py-2 px-2.5">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-blue-600 border border-blue-400" />
                      Anodize Mavi / Kaplamalı
                    </span>
                  </td>
                  <td className="py-2 px-2.5 text-right font-mono">1</td>
                </tr>
                <tr>
                  <td className="py-2 px-2.5 font-medium text-white">Mil Mafsalı (Rod End)</td>
                  <td className="py-2 px-2.5">Alüminyum 6082-T6 / Çelik Dövme Uç Elemanı</td>
                  <td className="py-2 px-2.5 font-mono">+{calc.rodFittingOffset} mm boy payı</td>
                  <td className="py-2 px-2.5">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-blue-600 border border-blue-400" />
                      Anodize Mavi / Kaplamalı
                    </span>
                  </td>
                  <td className="py-2 px-2.5 text-right font-mono">1</td>
                </tr>
                <tr>
                  <td className="py-2 px-2.5 font-medium text-white">Sızdırmazlık & Kılavuz Paketi</td>
                  <td className="py-2 px-2.5">Poliüretan / NBR Çift Dudaklı Keçe + PTFE Kılavuz</td>
                  <td className="py-2 px-2.5 font-mono">Ø{params.tubeOd} / Ø{params.rodOd} Standart</td>
                  <td className="py-2 px-2.5">Doğal Polimer</td>
                  <td className="py-2 px-2.5 text-right font-mono">1</td>
                </tr>
                <tr>
                  <td className="py-2 px-2.5 font-medium text-white">Dolum Akışkanı (Gaz & Yağ)</td>
                  <td className="py-2 px-2.5">Saf Azot Gazı (N2 %99.99) + ISO VG 15 Hidrolik Yağ</td>
                  <td className="py-2 px-2.5 font-mono">P = {calc.requiredPressureBar.toFixed(1)} Bar</td>
                  <td className="py-2 px-2.5">Şeffaf / Yeşil</td>
                  <td className="py-2 px-2.5 text-right font-mono">~15 ml</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

