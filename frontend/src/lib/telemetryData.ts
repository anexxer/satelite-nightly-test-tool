
// Client for Hex20 Python Backend
import { format } from "date-fns";

export interface TelemetryPoint {
  id: number;
  timestamp: Date;
  battery_v: number;
  temp: number;
  solar_i: number;
  cpu: number;
  comm: number;
  iso_flag: number;
  iso_score: number;
  lr_batt_flag?: number;
  rule_flag?: number;
  combined_flag: number;
}

export interface HealthSummary {
  critical: number;
  warning: number;
  normal: number;
}

export interface AnomalyReason {
  type: 'critical' | 'warning' | 'info';
  message: string;
}

export interface FeatureDeviation {
  feature: string;
  zScore: number;
}

const API_URL = "http://localhost:8000";

export async function fetchTelemetry(): Promise<TelemetryPoint[]> {
  try {
    const res = await fetch(`${API_URL}/telemetry`);
    if (!res.ok) throw new Error("Failed to fetch telemetry");
    const rawData = await res.json();

    // Map backend data to frontend interface
    return rawData.map((d: any) => ({
      ...d,
      timestamp: new Date(d.timestamp || new Date()),
      // Default missing flags to 0
      lr_batt_flag: d.lr_batt_flag || 0,
      rule_flag: d.rule_flag || 0,
      iso_flag: d.iso_flag || 0,
      combined_flag: d.combined_flag || 0
    }));
  } catch (err) {
    console.error(err);
    return [];
  }
}

export async function fetchHealthSummary(): Promise<HealthSummary> {
  try {
    const res = await fetch(`${API_URL}/stats`);
    if (!res.ok) throw new Error("Failed to fetch stats");
    return await res.json();
  } catch (err) {
    console.error(err);
    return { critical: 0, warning: 0, normal: 0 };
  }
}

export async function triggerAnomaly(type: 'battery' | 'temp' | 'comm') {
  try {
    await fetch(`${API_URL}/inject_anomaly`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type })
    });
  } catch (err) {
    console.error("Failed to inject anomaly", err);
  }
}

export function computeHealthSummary(data: TelemetryPoint[]): HealthSummary {
  let critical = 0;
  let warning = 0;
  let normal = 0;
  data.forEach(p => {
    if (p.battery_v < 3.2 || p.temp > 70 || p.comm === 2) critical++;
    else if (p.combined_flag) warning++;
    else normal++;
  });
  return { critical, warning, normal };
}

// Kept for backward compatibility with UI components if they use them directly
export function getAnomalyReasons(point: TelemetryPoint): AnomalyReason[] {
  const reasons: AnomalyReason[] = [];

  if (point.battery_v < 3.2) {
    reasons.push({ type: 'critical', message: `Battery critically low at ${point.battery_v.toFixed(2)}V` });
  }
  if (point.temp > 70) {
    reasons.push({ type: 'critical', message: `Temperature high: ${point.temp.toFixed(1)}°C` });
  }
  if (point.comm === 2) {
    reasons.push({ type: 'critical', message: 'Communication link lost' });
  }
  if (point.iso_flag === 1) {
    reasons.push({ type: 'warning', message: `AI Model detected anomaly (score: ${point.iso_score?.toFixed(3)})` });
  }

  return reasons;
}

export function getFeatureDeviations(point: TelemetryPoint, allData: TelemetryPoint[]): FeatureDeviation[] {
  return [];
}

// Deprecated
export function generateTelemetryData(count: number = 500): TelemetryPoint[] {
  return [];
}
