import { AlertTriangle, AlertCircle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { HealthSummary as HealthSummaryType } from "@/lib/telemetryData";

interface HealthSummaryProps {
  summary: HealthSummaryType;
  className?: string;
}

export function HealthSummary({ summary, className }: HealthSummaryProps) {
  const total = summary.critical + summary.warning + summary.normal;
  const criticalPercent = total > 0 ? (summary.critical / total) * 100 : 0;
  const warningPercent = total > 0 ? (summary.warning / total) * 100 : 0;
  const normalPercent = total > 0 ? (summary.normal / total) * 100 : 0;

  return (
    <div className={cn("space-y-4", className)}>
      {/* Progress bar */}
      <div className="h-2 rounded-full bg-muted overflow-hidden flex">
        <div 
          className="bg-critical transition-all duration-500" 
          style={{ width: `${criticalPercent}%` }} 
        />
        <div 
          className="bg-warning transition-all duration-500" 
          style={{ width: `${warningPercent}%` }} 
        />
        <div 
          className="bg-success transition-all duration-500" 
          style={{ width: `${normalPercent}%` }} 
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="flex items-center gap-2 p-3 rounded-lg bg-critical/10 border border-critical/20">
          <AlertCircle className="w-4 h-4 text-critical" />
          <div>
            <p className="text-lg font-bold text-critical">{summary.critical}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Critical</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2 p-3 rounded-lg bg-warning/10 border border-warning/20">
          <AlertTriangle className="w-4 h-4 text-warning" />
          <div>
            <p className="text-lg font-bold text-warning">{summary.warning}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Warning</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2 p-3 rounded-lg bg-success/10 border border-success/20">
          <CheckCircle2 className="w-4 h-4 text-success" />
          <div>
            <p className="text-lg font-bold text-success">{summary.normal}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Normal</p>
          </div>
        </div>
      </div>
    </div>
  );
}
