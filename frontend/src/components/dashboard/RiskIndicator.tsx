import { Badge } from '@/components/ui/Badge';
import { riskLabel } from '@/lib/utils';
import type { RiskAnalysis } from '@/types';

interface RiskIndicatorProps {
  riskLevel: RiskAnalysis['risk_level'];
  className?: string;
}

export function RiskIndicator({ riskLevel, className }: RiskIndicatorProps) {
  return (
    <Badge variant={riskLevel} className={className}>
      {riskLabel(riskLevel)}
    </Badge>
  );
}
