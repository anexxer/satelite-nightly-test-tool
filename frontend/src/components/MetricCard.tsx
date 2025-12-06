import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface MetricCardProps {
  title: string;
  value: string | number;
  unit?: string;
  icon: LucideIcon;
  status?: 'critical' | 'warning' | 'normal';
  subtitle?: string;
  className?: string;
}

export function MetricCard({ 
  title, 
  value, 
  unit, 
  icon: Icon, 
  status = 'normal',
  subtitle,
  className 
}: MetricCardProps) {
  return (
    <div 
      className={cn(
        "relative overflow-hidden rounded-xl border bg-card p-5 transition-all duration-300 hover:scale-[1.02] hover:shadow-glow",
        status === 'critical' && "border-critical/50 shadow-critical-glow",
        status === 'warning' && "border-warning/50 shadow-warning-glow",
        status === 'normal' && "border-border hover:border-accent/50",
        className
      )}
    >
      {/* Gradient overlay */}
      <div 
        className={cn(
          "absolute inset-0 opacity-5",
          status === 'critical' && "bg-gradient-to-br from-critical to-transparent",
          status === 'warning' && "bg-gradient-to-br from-warning to-transparent",
          status === 'normal' && "bg-gradient-to-br from-accent to-transparent"
        )}
      />
      
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{title}</span>
          <Icon 
            className={cn(
              "w-5 h-5",
              status === 'critical' && "text-critical",
              status === 'warning' && "text-warning",
              status === 'normal' && "text-accent"
            )} 
          />
        </div>
        
        <div className="flex items-baseline gap-1">
          <span 
            className={cn(
              "text-3xl font-bold tracking-tight",
              status === 'critical' && "text-critical",
              status === 'warning' && "text-warning",
              status === 'normal' && "text-foreground"
            )}
          >
            {value}
          </span>
          {unit && <span className="text-sm text-muted-foreground">{unit}</span>}
        </div>
        
        {subtitle && (
          <p className="mt-2 text-xs text-muted-foreground">{subtitle}</p>
        )}
      </div>
    </div>
  );
}
