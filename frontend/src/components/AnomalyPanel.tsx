import { useState, useMemo } from "react";
import { AlertTriangle, ChevronRight, Activity, Zap } from "lucide-react";
import { TelemetryPoint, getAnomalyReasons, getFeatureDeviations } from "@/lib/telemetryData";
import { StatusBadge } from "./StatusBadge";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";

interface AnomalyPanelProps {
  data: TelemetryPoint[];
  className?: string;
}

export function AnomalyPanel({ data, className }: AnomalyPanelProps) {
  const [showOnlyFlagged, setShowOnlyFlagged] = useState(true);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const filteredData = useMemo(() => {
    const filtered = showOnlyFlagged 
      ? data.filter(p => p.combined_flag === 1)
      : data;
    return [...filtered].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }, [data, showOnlyFlagged]);

  const selectedPoint = filteredData[selectedIndex];
  const reasons = selectedPoint ? getAnomalyReasons(selectedPoint) : [];
  const deviations = selectedPoint ? getFeatureDeviations(selectedPoint, data) : [];

  return (
    <div className={cn("rounded-xl border bg-card overflow-hidden", className)}>
      {/* Header */}
      <div className="p-4 border-b bg-muted/30">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-warning" />
            Anomalies & Explanation
          </h3>
          <StatusBadge status={filteredData.length > 0 ? 'warning' : 'normal'}>
            {filteredData.length} events
          </StatusBadge>
        </div>
        
        <div className="flex items-center gap-2">
          <Switch 
            checked={showOnlyFlagged} 
            onCheckedChange={setShowOnlyFlagged}
            id="flagged-filter"
          />
          <label htmlFor="flagged-filter" className="text-xs text-muted-foreground cursor-pointer">
            Show only flagged events
          </label>
        </div>
      </div>

      {/* Event List */}
      <ScrollArea className="h-[200px]">
        <div className="p-2 space-y-1">
          {filteredData.slice(0, 50).map((point, index) => (
            <button
              key={point.id}
              onClick={() => setSelectedIndex(index)}
              className={cn(
                "w-full flex items-center justify-between p-2.5 rounded-lg text-left transition-all",
                selectedIndex === index 
                  ? "bg-accent/20 border border-accent/30" 
                  : "hover:bg-muted/50"
              )}
            >
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-2 h-2 rounded-full",
                  point.rule_flag === 1 ? "bg-critical" : "bg-warning"
                )} />
                <div>
                  <p className="text-xs font-medium">
                    {format(point.timestamp, 'MMM d, HH:mm:ss')}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    Batt: {point.battery_v}V • Temp: {point.temp}°C
                  </p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </button>
          ))}
          
          {filteredData.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No anomalies detected</p>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Selected Event Details */}
      {selectedPoint && (
        <div className="border-t bg-muted/20 p-4 space-y-4">
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Event Details
            </h4>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2 rounded bg-background">
                <span className="text-muted-foreground">Battery:</span>
                <span className={cn("ml-1 font-mono", selectedPoint.battery_v < 3.2 && "text-critical")}>
                  {selectedPoint.battery_v}V
                </span>
              </div>
              <div className="p-2 rounded bg-background">
                <span className="text-muted-foreground">Temp:</span>
                <span className={cn("ml-1 font-mono", selectedPoint.temp > 70 && "text-critical")}>
                  {selectedPoint.temp}°C
                </span>
              </div>
              <div className="p-2 rounded bg-background">
                <span className="text-muted-foreground">Solar:</span>
                <span className="ml-1 font-mono">{selectedPoint.solar_i}A</span>
              </div>
              <div className="p-2 rounded bg-background">
                <span className="text-muted-foreground">Comm:</span>
                <span className={cn("ml-1 font-mono", selectedPoint.comm === 2 && "text-critical")}>
                  {selectedPoint.comm}
                </span>
              </div>
            </div>
          </div>

          {/* Reasons */}
          {reasons.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Primary Reasons
              </h4>
              <div className="space-y-1.5">
                {reasons.map((reason, i) => (
                  <div 
                    key={i}
                    className={cn(
                      "flex items-start gap-2 p-2 rounded text-xs",
                      reason.type === 'critical' && "bg-critical/10 text-critical",
                      reason.type === 'warning' && "bg-warning/10 text-warning",
                      reason.type === 'info' && "bg-accent/10 text-accent"
                    )}
                  >
                    <Zap className="w-3 h-3 mt-0.5 flex-shrink-0" />
                    {reason.message}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Feature Deviations */}
          {deviations.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Top Feature Deviations (Z-Score)
              </h4>
              <div className="space-y-1.5">
                {deviations.map((dev) => (
                  <div key={dev.feature} className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground font-mono">{dev.feature}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div 
                          className={cn(
                            "h-full rounded-full",
                            dev.zScore > 2 ? "bg-critical" : dev.zScore > 1 ? "bg-warning" : "bg-success"
                          )}
                          style={{ width: `${Math.min(dev.zScore / 3 * 100, 100)}%` }}
                        />
                      </div>
                      <span className="font-mono w-10 text-right">{dev.zScore.toFixed(2)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
