import { useState, useEffect, useMemo } from "react";
import {
  Satellite,
  Battery,
  Thermometer,
  Sun,
  Cpu,
  Radio,
  Clock
} from "lucide-react";
import {
  fetchTelemetry,
  triggerAnomaly,
  computeHealthSummary,
  TelemetryPoint
} from "@/lib/telemetryData";
import { MetricCard } from "@/components/MetricCard";
import { HealthSummary } from "@/components/HealthSummary";
import { TelemetryChart } from "@/components/TelemetryChart";
import { AnomalyPanel } from "@/components/AnomalyPanel";
import { ControlPanel } from "@/components/ControlPanel";
import { Slider } from "@/components/ui/slider";
import { format } from "date-fns";

const Index = () => {
  const [telemetryData, setTelemetryData] = useState<TelemetryPoint[]>([]);
  const [rowsToShow, setRowsToShow] = useState([300]);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Initialize data and start polling
  useEffect(() => {
    const loadData = async () => {
      const data = await fetchTelemetry();
      setTelemetryData(data);
    };

    loadData(); // Initial load

    const interval = setInterval(async () => {
      setCurrentTime(new Date());
      const data = await fetchTelemetry();
      setTelemetryData(data);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Computed values
  const visibleData = useMemo(() => {
    return telemetryData.slice(-rowsToShow[0]);
  }, [telemetryData, rowsToShow]);

  const healthSummary = useMemo(() => {
    return computeHealthSummary(telemetryData);
  }, [telemetryData]);

  const latestPoint = visibleData[visibleData.length - 1];

  const handleRefresh = async () => {
    const data = await fetchTelemetry();
    setTelemetryData(data);
  };

  const handleInjectAnomaly = async () => {
    // We will cycle through anomaly types for the demo
    const types = ['battery', 'temp', 'comm'] as const;
    const type = types[Math.floor(Math.random() * types.length)];
    await triggerAnomaly(type);
  };

  const getStatus = (metric: string, value: number) => {
    if (metric === 'battery' && value < 3.2) return 'critical';
    if (metric === 'battery' && value < 3.4) return 'warning';
    if (metric === 'temp' && value > 70) return 'critical';
    if (metric === 'temp' && value > 60) return 'warning';
    if (metric === 'comm' && value === 2) return 'critical';
    if (metric === 'comm' && value === 1) return 'warning';
    return 'normal';
  };

  const timeRange = telemetryData.length > 0
    ? `${format(telemetryData[0].timestamp, 'MMM d, HH:mm')} → ${format(telemetryData[telemetryData.length - 1].timestamp, 'MMM d, HH:mm')}`
    : 'No data';

  return (
    <div className="min-h-screen bg-background bg-grid">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-lg">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <Satellite className="w-8 h-8 text-accent" />
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-success rounded-full animate-pulse" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight">
                  Hex20 <span className="text-accent">Telemetry</span>
                </h1>
                <p className="text-xs text-muted-foreground">Nightly Test Dashboard</p>
              </div>
            </div>

            <div className="flex items-center gap-4 text-sm">
              <div className="hidden sm:flex items-center gap-2 text-muted-foreground">
                <Clock className="w-4 h-4" />
                <span className="font-mono">{format(currentTime, 'HH:mm:ss')}</span>
              </div>
              <div className="px-3 py-1.5 rounded-full bg-accent/10 border border-accent/20">
                <span className="text-accent text-xs font-medium">
                  {telemetryData.length.toLocaleString()} datapoints
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Overview Section */}
        <section className="animate-fade-in" style={{ animationDelay: '0.1s' }}>
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Left: Overview Info */}
            <div className="flex-1 space-y-4">
              <div>
                <h2 className="text-lg font-semibold mb-1">Telemetry Overview</h2>
                <p className="text-sm text-muted-foreground">
                  Time range: <span className="font-mono text-foreground">{timeRange}</span>
                </p>
              </div>

              <HealthSummary summary={healthSummary} />
            </div>

            {/* Right: Live Metrics */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:flex-1">
              <MetricCard
                title="Battery"
                value={latestPoint?.battery_v.toFixed(2) || '--'}
                unit="V"
                icon={Battery}
                status={latestPoint ? getStatus('battery', latestPoint.battery_v) : 'normal'}
                subtitle="Main power"
              />
              <MetricCard
                title="Temperature"
                value={latestPoint?.temp.toFixed(1) || '--'}
                unit="°C"
                icon={Thermometer}
                status={latestPoint ? getStatus('temp', latestPoint.temp) : 'normal'}
                subtitle="Core temp"
              />
              <MetricCard
                title="Solar Current"
                value={latestPoint?.solar_i.toFixed(2) || '--'}
                unit="A"
                icon={Sun}
                status="normal"
                subtitle="Panel output"
              />
              <MetricCard
                title="CPU Load"
                value={latestPoint?.cpu.toFixed(0) || '--'}
                unit="%"
                icon={Cpu}
                status="normal"
                subtitle="Processing"
              />
            </div>
          </div>
        </section>

        {/* Control Panel */}
        <section className="animate-fade-in" style={{ animationDelay: '0.2s' }}>
          <ControlPanel
            onRefresh={handleRefresh}
            onInjectAnomaly={handleInjectAnomaly}
          />
        </section>

        {/* Charts & Anomaly Panel */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in" style={{ animationDelay: '0.3s' }}>
          {/* Charts Column */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-semibold">Time-Series Dashboard</h2>
              <div className="flex items-center gap-3 text-sm">
                <span className="text-muted-foreground text-xs">Rows: {rowsToShow[0]}</span>
                <Slider
                  value={rowsToShow}
                  onValueChange={setRowsToShow}
                  min={100}
                  max={500}
                  step={50}
                  className="w-32"
                />
              </div>
            </div>

            <TelemetryChart
              data={visibleData}
              metric="battery_v"
              title="Battery Voltage"
              unit="V"
              threshold={3.2}
              thresholdType="min"
              color="hsl(199, 89%, 48%)"
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <TelemetryChart
                data={visibleData}
                metric="temp"
                title="Temperature"
                unit="°C"
                threshold={70}
                thresholdType="max"
                color="hsl(38, 92%, 50%)"
              />
              <TelemetryChart
                data={visibleData}
                metric="solar_i"
                title="Solar Current"
                unit="A"
                color="hsl(142, 71%, 45%)"
              />
            </div>
          </div>

          {/* Anomaly Panel */}
          <div className="lg:col-span-1">
            <AnomalyPanel data={telemetryData} />
          </div>
        </section>

        {/* Footer */}
        <footer className="pt-6 border-t">
          <p className="text-xs text-muted-foreground text-center">
            Hex20 Telemetry Dashboard • Demo Mode • Connect to real telemetry for production use
          </p>
        </footer>
      </main>
    </div>
  );
};

export default Index;
