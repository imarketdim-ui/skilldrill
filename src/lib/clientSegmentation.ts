import { differenceInDays } from 'date-fns';

export type ClientScoreStatus =
  | 'active'
  | 'prepayment_required'
  | 'blocked'
  | 'insufficient_data'
  | string;

export type ClientSegment =
  | 'all'
  | 'vip'
  | 'trusted'
  | 'regular'
  | 'new'
  | 'sleeping'
  | 'inactive'
  | 'prepayment'
  | 'risk'
  | 'blacklisted';

export interface ClientSegmentInput {
  visitCount: number;
  completedCount: number;
  noShowCount: number;
  lastVisit: string | null;
  revenue: number;
  isBlacklisted: boolean;
  hasVipTag: boolean;
  score?: number | null;
  scoreStatus?: ClientScoreStatus | null;
}

export const classifyClientSegment = (client: ClientSegmentInput): ClientSegment => {
  if (client.isBlacklisted || client.scoreStatus === 'blocked') return 'blacklisted';
  if (client.scoreStatus === 'prepayment_required') return 'prepayment';
  if (client.hasVipTag || (client.score || 0) >= 80 || (client.completedCount >= 8 && client.revenue >= 50000)) return 'vip';

  const daysSinceLast = client.lastVisit
    ? differenceInDays(new Date(), new Date(client.lastVisit))
    : 999;

  if ((client.score || 0) < 50 || client.noShowCount >= 2) return 'risk';
  if (client.completedCount <= 1) return 'new';
  if ((client.score || 0) >= 65 && client.completedCount >= 4) return 'trusted';
  if (daysSinceLast > 180) return 'inactive';
  if (daysSinceLast > 60) return 'sleeping';

  return 'regular';
};
