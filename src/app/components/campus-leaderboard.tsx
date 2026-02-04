import { Card } from "./ui/card";
import { Trophy } from "lucide-react";

const leaderboard = [
  { rank: 1, name: "Arjun M.", xp: 5420 },
  { rank: 2, name: "Priya K.", xp: 4890 },
  { rank: 3, name: "Rahul S.", xp: 4560 },
  { rank: 4, name: "You", xp: 2450 },
];

export function CampusLeaderboard() {
  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
        <Trophy className="h-5 w-5 text-yellow-500" />
        Campus Leaderboard
      </h3>

      <div className="space-y-3">
        {leaderboard.map((u) => (
          <div
            key={u.rank}
            className={`flex justify-between items-center p-3 rounded-md ${
              u.name === "You"
                ? "bg-blue-50 border border-blue-200"
                : "bg-gray-50"
            }`}
          >
            <span className="text-sm font-medium">#{u.rank} {u.name}</span>
            <span className="text-sm text-gray-600">{u.xp} XP</span>
          </div>
        ))}
      </div>
    </Card>
  );
}
