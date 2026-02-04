import { useEffect, useState } from "react";
import { Card, CardContent } from "./ui/card";
import { Badge } from "./ui/badge";
import { Progress } from "./ui/progress";
import {
  Trophy,
  Coins,
  TrendingUp,
  Flame,
  Gift,
  Sparkles,
  Loader2,
} from "lucide-react";
import { api } from "../../utils/api";

/* -------------------------------------------------------
   Self-contained Gamification Panel (NextBench)
-------------------------------------------------------- */

export function GamificationPanel() {
  /* ---------------- STATE ---------------- */
  const [xp, setXP] = useState(0);
  const [level, setLevel] = useState(1);
  const [coins, setCoins] = useState(0);
  const [streak, setStreak] = useState(7);
  const [trustScore, setTrustScore] = useState(100);
  const [loading, setLoading] = useState(true);
  const [showXPToast, setShowXPToast] = useState(false);

  const XP_TO_NEXT_LEVEL = 3000;

  /* ---------------- DERIVED ---------------- */
  const xpPercent = Math.min((xp / XP_TO_NEXT_LEVEL) * 100, 100);

  /* ---------------- XP GAIN (FAKE BUT FEELS REAL) ---------------- */
  const gainXP = (amount: number) => {
    setXP((prev) => prev + amount);
    setCoins((prev) => prev + Math.floor(amount / 2));
    setShowXPToast(true);

    setTimeout(() => setShowXPToast(false), 1200);
  };

  /* ---------------- LEVEL UP LOGIC ---------------- */
  useEffect(() => {
    const fetchGamification = async () => {
      try {
        const data = await api.getMe();
        setXP(data.xp || 0);
        setLevel(data.level || 1);
        setCoins(data.coins || 0);
        setTrustScore(data.trust_score || 100);
      } catch (err) {
        console.error("Gamification fetch error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchGamification();
  }, []);

  /* ===================================================== */

  return (
    <Card className="relative overflow-hidden border bg-white">
      <CardContent className="p-6 space-y-6">
        {/* XP FLOATING TOAST */}
        {showXPToast && (
          <div className="absolute top-4 right-4 z-10 animate-fade-in">
            <div className="bg-blue-600 text-white text-xs px-3 py-1 rounded-full shadow">
              +40 XP
            </div>
          </div>
        )}

        {/* HEADER */}
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-blue-600" />
            Your Progress
          </h3>
          <Badge variant="secondary" className="text-xs">
            Level {level}
          </Badge>
        </div>

        {/* XP BAR */}
        <div>
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>Experience</span>
            <span>
              {xp} / {XP_TO_NEXT_LEVEL} XP
            </span>
          </div>
          <Progress value={xpPercent} className="h-2" />
          <p className="text-[11px] text-gray-500 mt-1">
            {XP_TO_NEXT_LEVEL - xp} XP to next level
          </p>
        </div>

        {/* QUICK STATS */}
        <div className="grid grid-cols-2 gap-4">
          <Stat
            icon={<Coins className="h-4 w-4 text-yellow-500" />}
            label="Coins"
            value={coins}
            hint="Used for premium features"
          />
          <Stat
            icon={<TrendingUp className="h-4 w-4 text-green-600" />}
            label="Trust"
            value={`${trustScore}%`}
            hint="Improves visibility"
          />
          <Stat
            icon={<Flame className="h-4 w-4 text-orange-500" />}
            label="Streak"
            value={`${streak} days`}
            hint="Daily activity bonus"
          />
          <Stat
            icon={<Trophy className="h-4 w-4 text-purple-600" />}
            label="Rank"
            value="Top 12%"
            hint="Campus leaderboard"
          />
        </div>

        {/* PURPOSE STRIP */}
        <div className="rounded-lg bg-gradient-to-r from-blue-50 to-purple-50 p-3 text-xs text-gray-700">
          Earn XP by listing items, responding quickly, and completing swaps.
          Higher levels unlock better visibility and rewards.
        </div>

        {/* DAILY QUEST */}
        <div className="rounded-lg border bg-white p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-medium">🎯 Daily Quest</div>
            <Badge className="text-xs bg-blue-100 text-blue-700">
              +40 XP
            </Badge>
          </div>

          <p className="text-xs text-gray-500 mb-3">
            Complete 3 meaningful actions today
          </p>

          <button
            onClick={() => gainXP(40)}
            className="w-full text-xs bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-md transition"
          >
            Simulate Completion
          </button>
        </div>

        {/* COIN REWARD STRIP */}
        <div className="flex items-center justify-between rounded-lg bg-yellow-50 p-3">
          <div className="text-xs text-gray-700">
            🎁 Coins can be redeemed for boosts & highlights
          </div>
          <Gift className="h-4 w-4 text-yellow-600" />
        </div>
      </CardContent>
    </Card>
  );
}

/* -------------------------------------------------------
   Small stat component (tooltip via title attr)
-------------------------------------------------------- */
function Stat({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  hint?: string;
}) {
  return (
    <div
      className="flex items-center gap-3 rounded-lg border p-3 hover:bg-gray-50 transition"
      title={hint}
    >
      {icon}
      <div>
        <p className="text-[11px] text-gray-500">{label}</p>
        <p className="text-sm font-semibold text-gray-900">{value}</p>
      </div>
    </div>
  );
}
