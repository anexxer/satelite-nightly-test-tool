import { useMemo } from "react";
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  ReferenceLine,
  Area,
  ComposedChart
} from "recharts";
import { TelemetryPoint } from "@/lib/telemetryData";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface TelemetryChartProps {
  data: TelemetryPoint[];
  metric: 'battery_v' | 'temp' | 'solar_i';
  title: string;
  unit: string;
  threshold?: number;
  thresholdType?: 'max' | 'min';
  color: string;
  className?: string;
}

const metricConfig = {
  battery_v: { domain: [2.5, 4.5], thresholdLabel: 'Min Safe' },
  temp: { domain: [20, 90], thresholdLabel: 'Max Safe' },
  solar_i: { domain: [0, 5], thresholdLabel: undefined },
};

export function TelemetryChart({ 
  data, 
  metric, 
  title, 
  unit, 
  threshold,
  thresholdType = 'min',
  color,
  className 
}: TelemetryChartProps) {
  const chartData = useMemo(() => {
    return data.map(point => ({
      ...point,
      time: format(point.timestamp, 'HH:mm'),
      fullTime: format(point.timestamp, 'MMM d, HH:mm:ss'),
      value: point[metric],
      isAnomaly: point.combined_flag === 1,
    }));
  }, [data, metric]);

  const config = metricConfig[metric];

  return (
    <div className={cn("rounded-xl border bg-card p-4", className)}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-sm">{title}</h3>
        <span className="text-xs text-muted-foreground">{unit}</span>
      </div>
      
      <div className="h-[180px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: -10 }}>
            <defs>
              <linearGradient id={`gradient-${metric}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                <stop offset="95%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            
            <CartesianGrid 
              strokeDasharray="3 3" 
              stroke="hsl(var(--border))" 
              opacity={0.3}
              vertical={false}
            />
            
            <XAxis 
              dataKey="time" 
              tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
              axisLine={{ stroke: 'hsl(var(--border))' }}
              tickLine={false}
              interval="preserveStartEnd"
            />
            
            <YAxis 
              domain={config.domain}
              tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
              axisLine={false}
              tickLine={false}
              width={35}
            />
            
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                fontSize: '12px',
              }}
              labelFormatter={(_, payload) => payload[0]?.payload?.fullTime || ''}
              formatter={(value: number) => [value.toFixed(2), title]}
            />
            
            {threshold && (
              <ReferenceLine 
                y={threshold} 
                stroke={thresholdType === 'min' ? 'hsl(var(--warning))' : 'hsl(var(--critical))'}
                strokeDasharray="5 5"
                label={{ 
                  value: config.thresholdLabel,
                  position: 'right',
                  fontSize: 10,
                  fill: thresholdType === 'min' ? 'hsl(var(--warning))' : 'hsl(var(--critical))'
                }}
              />
            )}
            
            <Area
              type="monotone"
              dataKey="value"
              stroke="transparent"
              fill={`url(#gradient-${metric})`}
            />
            
            <Line
              type="monotone"
              dataKey="value"
              stroke={color}
              strokeWidth={2}
              dot={false}
              activeDot={{ 
                r: 4, 
                fill: color,
                stroke: 'hsl(var(--background))',
                strokeWidth: 2
              }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
