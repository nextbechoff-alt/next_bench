import { Card, CardContent } from "./ui/card";
import { Badge } from "./ui/badge";

const mockOrders = [
  {
    id: "1",
    title: "Scientific Calculator",
    price: 499,
    type: "Buy",
    status: "Completed",
    date: "12 Jan 2025",
  },
  {
    id: "2",
    title: "Laptop Stand",
    price: 40,
    type: "Rent",
    status: "Active",
    date: "20 Jan 2025",
  },
];

export function OrderHistory() {
  return (
    <Card>
      <CardContent className="p-6">
        <h2 className="text-lg font-semibold mb-4">🛒 Order History</h2>

        {mockOrders.length === 0 ? (
          <p className="text-gray-500">No purchases yet.</p>
        ) : (
          <div className="space-y-4">
            {mockOrders.map(order => (
              <div
                key={order.id}
                className="flex justify-between items-center border-b pb-3"
              >
                <div>
                  <p className="font-medium">{order.title}</p>
                  <p className="text-sm text-gray-500">
                    {order.type} • {order.date}
                  </p>
                </div>

                <div className="text-right">
                  <p className="font-semibold">₹{order.price}</p>
                  <Badge variant="secondary">{order.status}</Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
