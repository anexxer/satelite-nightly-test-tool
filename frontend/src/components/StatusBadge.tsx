import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: 'critical' | 'warning' | 'normal' | 'info';
  children: React.ReactNode;
  pulse?: boolean;
  className?: string;
}

export function StatusBadge({ status, children, pulse = false, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full uppercase tracking-wide",
        status === 'critical' && "bg-critical/20 text-critical border border-critical/30",
        status === 'warning' && "bg-warning/20 text-warning border border-warning/30",
        status === 'normal' && "bg-success/20 text-success border border-success/30",
        status === 'info' && "bg-accent/20 text-accent border border-accent/30",
        className
      )}
    >
      <span 
        className={cn(
          "w-1.5 h-1.5 rounded-full",
          status === 'critical' && "bg-critical",
          status === 'warning' && "bg-warning",
          status === 'normal' && "bg-success",
          status === 'info' && "bg-accent",
          pulse && "animate-pulse"
        )} 
      />
      {children}
    </span>
  );
}
