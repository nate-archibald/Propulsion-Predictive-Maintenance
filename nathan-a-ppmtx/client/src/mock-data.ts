// ─── Mock Data for QX Predictive Maintenance ────────────────────────────

export interface Defect {
  id: string;
  tail: string;
  ata: string;
  ataDesc: string;
  station: string;
  date: string;
  narrative: string;
  resolution: string;
  impact: "CANCEL" | "DELAY" | "NONE";
  delayMinutes: number;
  linkedPartSN: string;
  linkedPartPN: string;
  confidence: "HIGH" | "MEDIUM" | "LOW";
  deferral: boolean;
  [key: string]: unknown;
}

export interface Part {
  partNumber: string;
  serialNumber: string;
  description: string;
  engineSN: string;
  tail: string;
  position: string;
  condition: "SVC" | "UNS" | "SCR" | "AOG" | "IN-SHOP";
  location: string;
  tsn: number;
  csn: number;
  tso: number;
  csi: number;
  installDate: string;
  ata: string;
  isLLP: boolean;
  cycleLimit: number | null;
  cyclesRemaining: number | null;
  [key: string]: unknown;
}

export interface SpareItem {
  partNumber: string;
  description: string;
  station: string;
  condition: "SVC" | "UNS" | "SCR" | "AOG" | "IN-SHOP";
  quantity: number;
  removalRate90d: number;
  stockOutRisk: "HIGH" | "MEDIUM" | "LOW";
  [key: string]: unknown;
}

export interface EngineConfig {
  engineSN: string;
  tail: string;
  engineType: string;
  position: "L" | "R";
  totalHours: number;
  totalCycles: number;
  lastShopVisit: string;
  parts: Part[];
  [key: string]: unknown;
}

export interface APUConfig {
  apuSN: string;
  tail: string;
  totalHours: number;
  totalCycles: number;
  lastShopVisit: string;
  parts: Part[];
  [key: string]: unknown;
}

export const MOCK_DEFECTS: Defect[] = [
  { id: "DEF-2026-0412", tail: "N628QX", ata: "73-21", ataDesc: "Engine Fuel & Control", station: "PDX", date: "2026-05-28", narrative: "FUEL FLOW FLUCTUATION ON ENG 1 DURING CLIMB", resolution: "Replaced fuel control unit P/N 1301M91G05 S/N FCU-4421", impact: "DELAY", delayMinutes: 47, linkedPartSN: "FCU-4421", linkedPartPN: "1301M91G05", confidence: "HIGH", deferral: false },
  { id: "DEF-2026-0398", tail: "N631QX", ata: "72-50", ataDesc: "Engine Turbine", station: "SEA", date: "2026-05-25", narrative: "HIGH EGT MARGIN LOSS ON ENG 2 TREND MONITORING", resolution: "Borescope inspection — HPT blade tip erosion noted. Engine scheduled for shop visit.", impact: "NONE", delayMinutes: 0, linkedPartSN: "HPT-8829", linkedPartPN: "1538M72P01", confidence: "MEDIUM", deferral: true },
  { id: "DEF-2026-0385", tail: "N622QX", ata: "79-21", ataDesc: "Engine Oil System", station: "PDX", date: "2026-05-22", narrative: "OIL ON ENG 1 OUTBOARD THRUST REVERSER DOOR", resolution: "Replaced oil transfer tube S/N OTT-1192. Leak check SAT.", impact: "DELAY", delayMinutes: 93, linkedPartSN: "OTT-1192", linkedPartPN: "1538M79G01", confidence: "HIGH", deferral: false },
  { id: "DEF-2026-0371", tail: "N640QX", ata: "73-11", ataDesc: "Engine Fuel Distribution", station: "BLI", date: "2026-05-19", narrative: "ENGINE 2 FUEL LEAK AT MANIFOLD CONNECTION", resolution: "Replaced fuel manifold gasket. Ops check SAT.", impact: "CANCEL", delayMinutes: 0, linkedPartSN: "FM-3301", linkedPartPN: "1538M73G02", confidence: "HIGH", deferral: false },
  { id: "DEF-2026-0359", tail: "N635QX", ata: "72-30", ataDesc: "Engine Compressor", station: "RDM", date: "2026-05-16", narrative: "FAN BLADE FOD DAMAGE ENG 1 — BIRD STRIKE PDX-RDM", resolution: "Fan blade blend within limits. RTS.", impact: "DELAY", delayMinutes: 22, linkedPartSN: "FB-7712", linkedPartPN: "1538M72G08", confidence: "HIGH", deferral: false },
  { id: "DEF-2026-0342", tail: "N628QX", ata: "78-10", ataDesc: "Engine Exhaust", station: "GEG", date: "2026-05-12", narrative: "EXHAUST NOZZLE CRACK NOTED DURING WALK-AROUND", resolution: "Replaced exhaust nozzle segment. Deferred to PDX heavy check.", impact: "NONE", delayMinutes: 0, linkedPartSN: "EN-5501", linkedPartPN: "1538M78G03", confidence: "LOW", deferral: true },
  { id: "DEF-2026-0330", tail: "N619QX", ata: "49-10", ataDesc: "APU Power Section", station: "PDX", date: "2026-05-09", narrative: "APU FAILED TO START — NO LIGHT-OFF", resolution: "Replaced APU igniter plug. Ground test SAT.", impact: "DELAY", delayMinutes: 65, linkedPartSN: "IGN-0034", linkedPartPN: "3800726-1", confidence: "HIGH", deferral: false },
  { id: "DEF-2026-0315", tail: "N642QX", ata: "72-50", ataDesc: "Engine Turbine", station: "SEA", date: "2026-05-05", narrative: "HPT SHROUD SEGMENT LIBERATION — BORESCOPE FINDING", resolution: "Engine removal for shop visit. S/N ESN-31047 to StandardAero.", impact: "CANCEL", delayMinutes: 0, linkedPartSN: "HPT-9102", linkedPartPN: "1538M72P01", confidence: "HIGH", deferral: false },
  { id: "DEF-2026-0299", tail: "N633QX", ata: "73-21", ataDesc: "Engine Fuel & Control", station: "PDX", date: "2026-05-01", narrative: "FADEC CHANNEL A FAULT DURING TAKEOFF ROLL — REJECTED TAKEOFF", resolution: "FADEC LRU replaced P/N 1301M91G07 S/N FAD-2288", impact: "CANCEL", delayMinutes: 0, linkedPartSN: "FAD-2288", linkedPartPN: "1301M91G07", confidence: "HIGH", deferral: false },
  { id: "DEF-2026-0281", tail: "N627QX", ata: "71-00", ataDesc: "Power Plant General", station: "MFR", date: "2026-04-27", narrative: "ENG 2 VIBRATION HIGH ON N1 — CREW REPORT", resolution: "Fan balance check — within limits. Continued monitoring.", impact: "DELAY", delayMinutes: 31, linkedPartSN: "", linkedPartPN: "", confidence: "LOW", deferral: true },
  { id: "DEF-2026-0268", tail: "N636QX", ata: "72-30", ataDesc: "Engine Compressor", station: "PDX", date: "2026-04-23", narrative: "HPC STATOR VANE CRACK FOUND DURING BORESCOPE", resolution: "Engine R&R scheduled. Spare engine ESN-31052 installed.", impact: "NONE", delayMinutes: 0, linkedPartSN: "STV-4455", linkedPartPN: "1538M72G12", confidence: "HIGH", deferral: false },
  { id: "DEF-2026-0250", tail: "N625QX", ata: "79-31", ataDesc: "Engine Oil Indication", station: "SEA", date: "2026-04-19", narrative: "LOW OIL PRESSURE WARNING ENG 1 IN CRUISE", resolution: "Oil pressure sensor replaced. Ground run SAT.", impact: "DELAY", delayMinutes: 55, linkedPartSN: "OPS-7721", linkedPartPN: "1538M79G05", confidence: "HIGH", deferral: false },
];

export const MOCK_PARTS: Part[] = [
  { partNumber: "1301M91G05", serialNumber: "FCU-4421", description: "Fuel Control Unit", engineSN: "ESN-31042", tail: "N628QX", position: "ENG-1", condition: "SVC", location: "ON-WING", tsn: 8420, csn: 12100, tso: 2100, csi: 3200, installDate: "2025-11-15", ata: "73-21", isLLP: false, cycleLimit: null, cyclesRemaining: null },
  { partNumber: "1538M72P01", serialNumber: "HPT-8829", description: "HPT Blade Set", engineSN: "ESN-31045", tail: "N631QX", position: "ENG-2", condition: "SVC", location: "ON-WING", tsn: 11200, csn: 16800, tso: 4500, csi: 6200, installDate: "2024-08-20", ata: "72-50", isLLP: true, cycleLimit: 20000, cyclesRemaining: 3200 },
  { partNumber: "1538M79G01", serialNumber: "OTT-1192", description: "Oil Transfer Tube", engineSN: "ESN-31038", tail: "N622QX", position: "ENG-1", condition: "UNS", location: "IN-SHOP", tsn: 15300, csn: 22100, tso: 6800, csi: 9400, installDate: "2023-06-10", ata: "79-21", isLLP: false, cycleLimit: null, cyclesRemaining: null },
  { partNumber: "1538M73G02", serialNumber: "FM-3301", description: "Fuel Manifold Assembly", engineSN: "ESN-31055", tail: "N640QX", position: "ENG-2", condition: "SVC", location: "ON-WING", tsn: 3200, csn: 4800, tso: 3200, csi: 4800, installDate: "2025-06-01", ata: "73-11", isLLP: false, cycleLimit: null, cyclesRemaining: null },
  { partNumber: "1538M72G08", serialNumber: "FB-7712", description: "Fan Blade", engineSN: "ESN-31050", tail: "N635QX", position: "ENG-1", condition: "SVC", location: "ON-WING", tsn: 6100, csn: 9200, tso: 1200, csi: 1800, installDate: "2026-01-10", ata: "72-30", isLLP: true, cycleLimit: 30000, cyclesRemaining: 20800 },
  { partNumber: "1301M91G07", serialNumber: "FAD-2288", description: "FADEC LRU", engineSN: "ESN-31048", tail: "N633QX", position: "ENG-1", condition: "UNS", location: "IN-SHOP", tsn: 9800, csn: 14500, tso: 4200, csi: 6100, installDate: "2024-11-05", ata: "73-21", isLLP: false, cycleLimit: null, cyclesRemaining: null },
  { partNumber: "1538M72P01", serialNumber: "HPT-9102", description: "HPT Blade Set", engineSN: "ESN-31047", tail: "N642QX", position: "ENG-1", condition: "UNS", location: "IN-SHOP", tsn: 14100, csn: 19800, tso: 7200, csi: 10100, installDate: "2023-09-15", ata: "72-50", isLLP: true, cycleLimit: 20000, cyclesRemaining: 200 },
  { partNumber: "1538M72G12", serialNumber: "STV-4455", description: "HPC Stator Vane", engineSN: "ESN-31051", tail: "N636QX", position: "ENG-2", condition: "UNS", location: "IN-SHOP", tsn: 12500, csn: 18200, tso: 5100, csi: 7400, installDate: "2024-03-22", ata: "72-30", isLLP: false, cycleLimit: null, cyclesRemaining: null },
  { partNumber: "1538M79G05", serialNumber: "OPS-7721", description: "Oil Pressure Sensor", engineSN: "ESN-31039", tail: "N625QX", position: "ENG-1", condition: "UNS", location: "IN-SHOP", tsn: 10800, csn: 15900, tso: 3900, csi: 5700, installDate: "2024-10-12", ata: "79-31", isLLP: false, cycleLimit: null, cyclesRemaining: null },
  { partNumber: "3800726-1", serialNumber: "IGN-0034", description: "APU Igniter Plug", engineSN: "APU-619", tail: "N619QX", position: "APU", condition: "UNS", location: "IN-SHOP", tsn: 5200, csn: 7800, tso: 2600, csi: 3900, installDate: "2025-04-18", ata: "49-10", isLLP: false, cycleLimit: null, cyclesRemaining: null },
  { partNumber: "1538M72P02", serialNumber: "LPT-6601", description: "LPT Disk Stage 1", engineSN: "ESN-31042", tail: "N628QX", position: "ENG-1", condition: "SVC", location: "ON-WING", tsn: 8420, csn: 12100, tso: 8420, csi: 12100, installDate: "2022-03-01", ata: "72-50", isLLP: true, cycleLimit: 15000, cyclesRemaining: 2900 },
  { partNumber: "1538M72P03", serialNumber: "HPD-3310", description: "HPT Disk", engineSN: "ESN-31045", tail: "N631QX", position: "ENG-2", condition: "SVC", location: "ON-WING", tsn: 11200, csn: 16800, tso: 11200, csi: 16800, installDate: "2021-06-15", ata: "72-50", isLLP: true, cycleLimit: 18000, cyclesRemaining: 1200 },
  { partNumber: "1538M72P04", serialNumber: "FAN-2205", description: "Fan Disk", engineSN: "ESN-31050", tail: "N635QX", position: "ENG-1", condition: "SVC", location: "ON-WING", tsn: 6100, csn: 9200, tso: 6100, csi: 9200, installDate: "2023-01-10", ata: "72-30", isLLP: true, cycleLimit: 25000, cyclesRemaining: 15800 },
  { partNumber: "1538M72P05", serialNumber: "HPC-1108", description: "HPC Impeller", engineSN: "ESN-31048", tail: "N633QX", position: "ENG-1", condition: "SVC", location: "ON-WING", tsn: 9800, csn: 14500, tso: 9800, csi: 14500, installDate: "2022-07-20", ata: "72-30", isLLP: true, cycleLimit: 15000, cyclesRemaining: 500 },
];

export const MOCK_SPARES: SpareItem[] = [
  { partNumber: "1301M91G05", description: "Fuel Control Unit", station: "PDX", condition: "SVC", quantity: 2, removalRate90d: 1, stockOutRisk: "LOW" },
  { partNumber: "1301M91G05", description: "Fuel Control Unit", station: "SEA", condition: "SVC", quantity: 1, removalRate90d: 1, stockOutRisk: "MEDIUM" },
  { partNumber: "1301M91G05", description: "Fuel Control Unit", station: "BLI", condition: "SVC", quantity: 0, removalRate90d: 0, stockOutRisk: "HIGH" },
  { partNumber: "1538M72P01", description: "HPT Blade Set", station: "PDX", condition: "SVC", quantity: 1, removalRate90d: 2, stockOutRisk: "HIGH" },
  { partNumber: "1538M72P01", description: "HPT Blade Set", station: "SEA", condition: "SVC", quantity: 1, removalRate90d: 1, stockOutRisk: "MEDIUM" },
  { partNumber: "1538M79G01", description: "Oil Transfer Tube", station: "PDX", condition: "SVC", quantity: 3, removalRate90d: 1, stockOutRisk: "LOW" },
  { partNumber: "1538M79G01", description: "Oil Transfer Tube", station: "GEG", condition: "SVC", quantity: 0, removalRate90d: 1, stockOutRisk: "HIGH" },
  { partNumber: "1301M91G07", description: "FADEC LRU", station: "PDX", condition: "SVC", quantity: 2, removalRate90d: 1, stockOutRisk: "LOW" },
  { partNumber: "1301M91G07", description: "FADEC LRU", station: "SEA", condition: "SVC", quantity: 1, removalRate90d: 1, stockOutRisk: "MEDIUM" },
  { partNumber: "1301M91G07", description: "FADEC LRU", station: "RDM", condition: "SVC", quantity: 0, removalRate90d: 1, stockOutRisk: "HIGH" },
  { partNumber: "1538M72G08", description: "Fan Blade", station: "PDX", condition: "SVC", quantity: 4, removalRate90d: 1, stockOutRisk: "LOW" },
  { partNumber: "1538M72G08", description: "Fan Blade", station: "MFR", condition: "SVC", quantity: 1, removalRate90d: 0, stockOutRisk: "LOW" },
  { partNumber: "3800726-1", description: "APU Igniter Plug", station: "PDX", condition: "SVC", quantity: 3, removalRate90d: 1, stockOutRisk: "LOW" },
  { partNumber: "3800726-1", description: "APU Igniter Plug", station: "BLI", condition: "SVC", quantity: 0, removalRate90d: 1, stockOutRisk: "HIGH" },
  { partNumber: "1538M79G05", description: "Oil Pressure Sensor", station: "PDX", condition: "SVC", quantity: 2, removalRate90d: 1, stockOutRisk: "LOW" },
  { partNumber: "1538M79G05", description: "Oil Pressure Sensor", station: "SEA", condition: "SVC", quantity: 0, removalRate90d: 2, stockOutRisk: "HIGH" },
];

export const MOCK_ENGINES: EngineConfig[] = [
  { engineSN: "ESN-31042", tail: "N628QX", engineType: "CF34-8E", position: "L", totalHours: 8420, totalCycles: 12100, lastShopVisit: "2025-11-15", parts: MOCK_PARTS.filter(p => p.engineSN === "ESN-31042") },
  { engineSN: "ESN-31045", tail: "N631QX", engineType: "CF34-8E", position: "R", totalHours: 11200, totalCycles: 16800, lastShopVisit: "2024-08-20", parts: MOCK_PARTS.filter(p => p.engineSN === "ESN-31045") },
  { engineSN: "ESN-31038", tail: "N622QX", engineType: "CF34-8E", position: "L", totalHours: 15300, totalCycles: 22100, lastShopVisit: "2023-06-10", parts: MOCK_PARTS.filter(p => p.engineSN === "ESN-31038") },
  { engineSN: "ESN-31050", tail: "N635QX", engineType: "CF34-8E", position: "L", totalHours: 6100, totalCycles: 9200, lastShopVisit: "2026-01-10", parts: MOCK_PARTS.filter(p => p.engineSN === "ESN-31050") },
  { engineSN: "ESN-31048", tail: "N633QX", engineType: "CF34-8E", position: "L", totalHours: 9800, totalCycles: 14500, lastShopVisit: "2024-11-05", parts: MOCK_PARTS.filter(p => p.engineSN === "ESN-31048") },
  { engineSN: "ESN-31055", tail: "N640QX", engineType: "CF34-8E", position: "R", totalHours: 3200, totalCycles: 4800, lastShopVisit: "2025-06-01", parts: MOCK_PARTS.filter(p => p.engineSN === "ESN-31055") },
  { engineSN: "ESN-31047", tail: "N642QX", engineType: "CF34-8E", position: "L", totalHours: 14100, totalCycles: 19800, lastShopVisit: "2023-09-15", parts: MOCK_PARTS.filter(p => p.engineSN === "ESN-31047") },
];

export const MOCK_APUS: APUConfig[] = [
  { apuSN: "APU-619", tail: "N619QX", totalHours: 5200, totalCycles: 7800, lastShopVisit: "2025-04-18", parts: [] },
  { apuSN: "APU-621", tail: "N621QX", totalHours: 4800, totalCycles: 7200, lastShopVisit: "2025-06-05", parts: [] },
  { apuSN: "APU-623", tail: "N623QX", totalHours: 6100, totalCycles: 9100, lastShopVisit: "2024-12-10", parts: [] },
];

// ─── Derived aggregation data for charts ─────────────────────────────────

export const DEFECTS_BY_ATA: Array<{ ata: string; description: string; count: number; delayMinutes: number; cancels: number; [key: string]: unknown }> = [
  { ata: "73-21", description: "Engine Fuel & Control", count: 3, delayMinutes: 47, cancels: 1 },
  { ata: "72-50", description: "Engine Turbine", count: 2, delayMinutes: 0, cancels: 1 },
  { ata: "79-21", description: "Engine Oil System", count: 1, delayMinutes: 93, cancels: 0 },
  { ata: "73-11", description: "Engine Fuel Distribution", count: 1, delayMinutes: 0, cancels: 1 },
  { ata: "72-30", description: "Engine Compressor", count: 2, delayMinutes: 22, cancels: 0 },
  { ata: "78-10", description: "Engine Exhaust", count: 1, delayMinutes: 0, cancels: 0 },
  { ata: "49-10", description: "APU Power Section", count: 1, delayMinutes: 65, cancels: 0 },
  { ata: "79-31", description: "Engine Oil Indication", count: 1, delayMinutes: 55, cancels: 0 },
];

export const WEEKLY_DEFECT_TREND: Array<{ week: string; count: number; [key: string]: unknown }> = [
  { week: "2026-04-05", count: 4 },
  { week: "2026-04-12", count: 6 },
  { week: "2026-04-19", count: 3 },
  { week: "2026-04-26", count: 5 },
  { week: "2026-05-03", count: 7 },
  { week: "2026-05-10", count: 4 },
  { week: "2026-05-17", count: 8 },
  { week: "2026-05-24", count: 6 },
  { week: "2026-05-31", count: 5 },
  { week: "2026-06-07", count: 9 },
];

export const IMPACT_BY_PN: Array<{ partNumber: string; description: string; delayMinutes: number; cancels: number; removals: number; [key: string]: unknown }> = [
  { partNumber: "1538M79G01", description: "Oil Transfer Tube", delayMinutes: 93, cancels: 0, removals: 1 },
  { partNumber: "3800726-1", description: "APU Igniter Plug", delayMinutes: 65, cancels: 0, removals: 1 },
  { partNumber: "1538M79G05", description: "Oil Pressure Sensor", delayMinutes: 55, cancels: 0, removals: 1 },
  { partNumber: "1301M91G05", description: "Fuel Control Unit", delayMinutes: 47, cancels: 0, removals: 1 },
  { partNumber: "1538M72G08", description: "Fan Blade", delayMinutes: 22, cancels: 0, removals: 1 },
  { partNumber: "1301M91G07", description: "FADEC LRU", delayMinutes: 0, cancels: 1, removals: 1 },
  { partNumber: "1538M73G02", description: "Fuel Manifold Assembly", delayMinutes: 0, cancels: 1, removals: 1 },
  { partNumber: "1538M72P01", description: "HPT Blade Set", delayMinutes: 0, cancels: 1, removals: 2 },
];

export const DEFECTS_BY_ATA_PERIOD: Record<string, typeof DEFECTS_BY_ATA> = {
  week: [
    { ata: "73-21", description: "Engine Fuel & Control", count: 1, delayMinutes: 47, cancels: 0 },
    { ata: "72-50", description: "Engine Turbine", count: 1, delayMinutes: 0, cancels: 0 },
    { ata: "79-21", description: "Engine Oil System", count: 0, delayMinutes: 0, cancels: 0 },
    { ata: "73-11", description: "Engine Fuel Distribution", count: 0, delayMinutes: 0, cancels: 0 },
    { ata: "72-30", description: "Engine Compressor", count: 1, delayMinutes: 0, cancels: 0 },
    { ata: "78-10", description: "Engine Exhaust", count: 0, delayMinutes: 0, cancels: 0 },
    { ata: "49-10", description: "APU Power Section", count: 0, delayMinutes: 0, cancels: 0 },
    { ata: "79-31", description: "Engine Oil Indication", count: 0, delayMinutes: 0, cancels: 0 },
  ],
  month: DEFECTS_BY_ATA,
  year: [
    { ata: "73-21", description: "Engine Fuel & Control", count: 18, delayMinutes: 290, cancels: 4 },
    { ata: "72-50", description: "Engine Turbine", count: 14, delayMinutes: 120, cancels: 5 },
    { ata: "79-21", description: "Engine Oil System", count: 9, delayMinutes: 410, cancels: 1 },
    { ata: "73-11", description: "Engine Fuel Distribution", count: 7, delayMinutes: 85, cancels: 3 },
    { ata: "72-30", description: "Engine Compressor", count: 11, delayMinutes: 165, cancels: 2 },
    { ata: "78-10", description: "Engine Exhaust", count: 5, delayMinutes: 40, cancels: 0 },
    { ata: "49-10", description: "APU Power Section", count: 8, delayMinutes: 310, cancels: 1 },
    { ata: "79-31", description: "Engine Oil Indication", count: 6, delayMinutes: 220, cancels: 0 },
  ],
};

export const WEEKLY_DEFECT_TREND_PERIOD: Record<string, typeof WEEKLY_DEFECT_TREND> = {
  week: [
    { week: "Mon", count: 2 },
    { week: "Tue", count: 1 },
    { week: "Wed", count: 3 },
    { week: "Thu", count: 0 },
    { week: "Fri", count: 2 },
    { week: "Sat", count: 1 },
    { week: "Sun", count: 0 },
  ],
  month: WEEKLY_DEFECT_TREND,
  year: [
    { week: "Jul", count: 28 },
    { week: "Aug", count: 35 },
    { week: "Sep", count: 22 },
    { week: "Oct", count: 31 },
    { week: "Nov", count: 40 },
    { week: "Dec", count: 26 },
    { week: "Jan", count: 33 },
    { week: "Feb", count: 19 },
    { week: "Mar", count: 37 },
    { week: "Apr", count: 29 },
    { week: "May", count: 42 },
    { week: "Jun", count: 38 },
  ],
};

export const LINKAGE_STATS = {
  total: 12,
  high: 9,
  medium: 1,
  low: 2,
  highPct: 75,
  mediumPct: 8,
  lowPct: 17,
};

// Critical propulsion parts for Spare Quick View
export interface CriticalSparePart {
  name: string;
  partNumbers: Array<{ pn: string; quantity: number }>;
  [key: string]: unknown;
}

export const CRITICAL_SPARE_PARTS: CriticalSparePart[] = [
  { name: "FADEC", partNumbers: [{ pn: "4120T00P60", quantity: 2 }, { pn: "4120T00P63", quantity: 1 }] },
  { name: "FMU", partNumbers: [{ pn: "4120T01P02", quantity: 3 }] },
  { name: "SEAL PRV", partNumbers: [{ pn: "421645-2", quantity: 5 }] },
  { name: "ENG FUEL PUMP", partNumbers: [{ pn: "829500-7", quantity: 1 }, { pn: "829500-9", quantity: 2 }] },
  { name: "ENG OBV", partNumbers: [{ pn: "5080046-103", quantity: 4 }] },
  { name: "ENG ATS", partNumbers: [{ pn: "4120T06P10", quantity: 2 }] },
  { name: "APU ANTI-SURGE VALVE", partNumbers: [{ pn: "4954226", quantity: 1 }] },
  { name: "T2 AIR TEMP SENSOR", partNumbers: [{ pn: "4119T30P07", quantity: 6 }] },
  { name: "APU INLET SILENCER", partNumbers: [{ pn: "4953193", quantity: 2 }] },
  { name: "APU ESC", partNumbers: [{ pn: "4508022", quantity: 1 }, { pn: "4954309", quantity: 0 }] },
  { name: "APU FUEL MODULE ASSY", partNumbers: [{ pn: "4505008G", quantity: 3 }, { pn: "4505008H", quantity: 2 }] },
  { name: "ENG IGNITION EXCITER", partNumbers: [{ pn: "9238M66P11", quantity: 4 }] },
  { name: "ENG FUEL LOW PRESSURE SWITCH", partNumbers: [{ pn: "1103P1114-01", quantity: 7 }] },
  { name: "OIL LEVEL TANK INDICATOR", partNumbers: [{ pn: "4121T65P02", quantity: 2 }] },
  { name: "APU BSG", partNumbers: [{ pn: "4952826", quantity: 1 }] },
  { name: "ENG SCV", partNumbers: [{ pn: "4120T05P04", quantity: 3 }] },
  { name: "APU FADEC", partNumbers: [{ pn: "4505003M", quantity: 2 }] },
];
