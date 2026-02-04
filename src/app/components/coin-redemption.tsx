import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Coins } from "lucide-react";

const rewards = [
  { title: "Boost Listing (24 hrs)", cost: 200 },
  { title: "Highlight Profile", cost: 300 },
  { title: "Priority Search Rank", cost: 500 },
  { title: "Campus Featured", cost: 800 },
];

export function CoinRedemption() {
  return (
    <Card className="p-6 space-y-4">
      <h3 className="text-lg font-semibold">Redeem Coins</h3>

      {rewards.map((r) => (
        <div key={r.title} className="flex justify-between items-center border rounded-md p-3">
          <span className="text-sm">{r.title}</span>
          <Button size="sm" variant="outline">
            <Coins className="h-4 w-4 mr-1" />
            {r.cost}
          </Button>
        </div>
      ))}
    </Card>
  );
}
