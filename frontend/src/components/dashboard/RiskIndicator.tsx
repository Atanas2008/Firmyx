import { Badge } from '@/components/ui/Badge';
import { useLanguage } from '@/hooks/useLanguage';
import type { RiskAnalysis } from '@/types';

interface RiskIndicatorProps {
  riskLevel: RiskAnalysis['risk_level'];
  className?: string;
}

export function RiskIndicator({ riskLevel, className }: RiskIndicatorProps) {
  const { t } = useLanguage();
  const label = t.risk[riskLevel as keyof typeof t.risk] ?? t.risk.unknown;
  return (
    <Badge variant={riskLevel} className={className}>
      {label}
    </Badge>
  );
}
