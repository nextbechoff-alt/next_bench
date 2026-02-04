export function calculateTrustScore({
  completedDeals,
  avgRating,
  responseRate,
  reports,
}: {
  completedDeals: number;
  avgRating: number;
  responseRate: number; // %
  reports: number;
}) {
  let score =
    completedDeals * 3 +
    avgRating * 10 +
    responseRate * 0.3 -
    reports * 15;

  return Math.max(0, Math.min(100, Math.round(score)));
}
