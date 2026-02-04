import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Sparkles, TrendingUp, Lightbulb, Target } from 'lucide-react';

interface SmartRecommendation {
  id: string;
  type: 'product' | 'service' | 'event' | 'person';
  title: string;
  reason: string;
  matchScore: number;
  urgency?: string;
  savings?: number;
  icon: string;
}

const recommendations: SmartRecommendation[] = [
  {
    id: '1',
    type: 'product',
    title: 'Advanced Engineering Mathematics',
    reason: 'Based on your Computer Science major',
    matchScore: 95,
    savings: 200,
    icon: '📚'
  },
  {
    id: '2',
    type: 'service',
    title: 'Resume Review Service',
    reason: 'Final year students hiring this',
    matchScore: 88,
    urgency: 'Placement season',
    icon: '📄'
  },
  {
    id: '3',
    type: 'event',
    title: 'AI/ML Workshop by Google',
    reason: 'Matches your interests',
    matchScore: 92,
    urgency: 'Only 5 spots left',
    icon: '🤖'
  },
  {
    id: '4',
    type: 'person',
    title: 'Connect with Rahul (Web Dev)',
    reason: 'Working on similar projects',
    matchScore: 85,
    icon: '👨‍💻'
  },
];

const trendingInYourCollege = [
  { item: 'Data Science Notes', demand: 'High', price: '₹150' },
  { item: 'Graphic Design Services', demand: 'Medium', price: '₹200/hr' },
  { item: 'TechFest 2024 Passes', demand: 'Very High', price: '₹500' },
];

export function SmartMatchSection() {
  return (
    <div className="space-y-6">
      {/* AI Recommendations */}
      <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-purple-50">
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="h-6 w-6 text-blue-600" />
            <h3 className="text-xl font-bold text-gray-900">AI Recommendations For You</h3>
            <Badge className="bg-blue-600 text-white">Powered by AI</Badge>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {recommendations.map((rec) => (
              <div
                key={rec.id}
                className="bg-white rounded-lg p-4 border-2 border-transparent hover:border-blue-300 transition-all cursor-pointer"
              >
                <div className="flex items-start gap-3">
                  <div className="text-3xl">{rec.icon}</div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold text-gray-900">{rec.title}</h4>
                      <Badge className="bg-green-100 text-green-800">
                        {rec.matchScore}% Match
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{rec.reason}</p>
                    {rec.urgency && (
                      <Badge variant="destructive" className="text-xs mb-2">
                        ⚡ {rec.urgency}
                      </Badge>
                    )}
                    {rec.savings && (
                      <div className="text-sm text-green-600 font-medium">
                        Save ₹{rec.savings} vs market price
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 bg-blue-100 rounded-lg p-3 text-sm text-blue-800">
            <Lightbulb className="h-4 w-4 inline mr-2" />
            Our AI analyzes your major, interests, past purchases, and campus trends to suggest the best matches!
          </div>
        </CardContent>
      </Card>

      {/* Trending in Your College */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="h-6 w-6 text-orange-600" />
            <h3 className="text-xl font-bold text-gray-900">Trending in Your College</h3>
          </div>
          
          <div className="space-y-3">
            {trendingInYourCollege.map((item, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-4">
                  <div className="w-8 h-8 bg-gradient-to-br from-orange-400 to-red-500 rounded-full flex items-center justify-center text-white font-bold">
                    {idx + 1}
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900">{item.item}</div>
                    <div className="text-sm text-gray-600">{item.price}</div>
                  </div>
                </div>
                <Badge
                  variant={
                    item.demand === 'Very High' ? 'destructive' :
                    item.demand === 'High' ? 'default' : 'secondary'
                  }
                >
                  {item.demand} Demand
                </Badge>
              </div>
            ))}
          </div>

          <Button className="w-full mt-4 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600">
            <Target className="h-4 w-4 mr-2" />
            View All Trending Items
          </Button>
        </CardContent>
      </Card>

      {/* Price Drop Alert */}
      <Card className="border-2 border-green-200 bg-green-50">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <div>
                <div className="font-semibold text-gray-900">Scientific Calculator - Price Drop!</div>
                <div className="text-sm text-gray-600">₹100 → ₹50 (50% off)</div>
              </div>
            </div>
            <Button size="sm" className="bg-green-600 hover:bg-green-700">
              Grab Deal
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
