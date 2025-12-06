import { useState } from "react";
import { Play, Syringe, Database, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface ControlPanelProps {
  onRefresh: () => void;
  onInjectAnomaly: () => void;
  className?: string;
}

export function ControlPanel({ onRefresh, onInjectAnomaly, className }: ControlPanelProps) {
  const [isProcessing, setIsProcessing] = useState(false);

  const handleRunProcessing = async () => {
    setIsProcessing(true);
    toast({
      title: "Processing Pipeline",
      description: "Running telemetry analysis...",
    });
    
    // Simulate processing
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    onRefresh();
    setIsProcessing(false);
    
    toast({
      title: "Processing Complete",
      description: "Telemetry data has been refreshed.",
    });
  };

  const handleInjectAnomaly = () => {
    onInjectAnomaly();
    toast({
      title: "Demo Anomaly Injected",
      description: "A simulated anomaly has been added to the view.",
      variant: "destructive",
    });
  };

  return (
    <div className={cn("rounded-xl border bg-card p-4", className)}>
      <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
        <Database className="w-4 h-4 text-accent" />
        Control Actions
      </h3>
      
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Button 
          variant="outline" 
          className="justify-start gap-2 h-auto py-3"
          onClick={handleRunProcessing}
          disabled={isProcessing}
        >
          {isProcessing ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <Play className="w-4 h-4" />
          )}
          <div className="text-left">
            <p className="font-medium text-xs">Run Processing</p>
            <p className="text-[10px] text-muted-foreground">Execute pipeline</p>
          </div>
        </Button>
        
        <Button 
          variant="outline" 
          className="justify-start gap-2 h-auto py-3 border-warning/30 hover:bg-warning/10"
          onClick={handleInjectAnomaly}
        >
          <Syringe className="w-4 h-4 text-warning" />
          <div className="text-left">
            <p className="font-medium text-xs">Inject Anomaly</p>
            <p className="text-[10px] text-muted-foreground">Demo mode only</p>
          </div>
        </Button>
        
        <Button 
          variant="outline" 
          className="justify-start gap-2 h-auto py-3"
          onClick={onRefresh}
        >
          <RefreshCw className="w-4 h-4" />
          <div className="text-left">
            <p className="font-medium text-xs">Refresh Data</p>
            <p className="text-[10px] text-muted-foreground">Reload telemetry</p>
          </div>
        </Button>
      </div>
      
      <div className="mt-4 p-3 rounded-lg bg-muted/30 border border-dashed">
        <p className="text-[10px] text-muted-foreground">
          <span className="font-semibold text-foreground">Models loaded:</span> IsolationForest, LinearRegression (Battery), StandardScaler
        </p>
      </div>
    </div>
  );
}
