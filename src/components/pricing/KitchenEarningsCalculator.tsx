import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ChefHat, 
  MapPin, 
  Sparkles, 
  TrendingUp, 
  DollarSign, 
  Clock, 
  Calendar, 
  CalendarDays,
  Lightbulb,
  BarChart3,
  Loader2,
  CheckCircle2,
  ArrowRight
} from 'lucide-react';
import { useKitchenEarningsEstimate, KitchenEstimateParams, KitchenEarningsEstimate } from '@/hooks/useKitchenEarningsEstimate';
import { formatCurrency, calculateRentalFees, RENTAL_HOST_FEE_PERCENT } from '@/lib/commissions';
import { motion, AnimatePresence } from 'framer-motion';

const US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
];

const KITCHEN_TYPES = [
  { value: 'full_commercial', label: 'Full Commercial Kitchen', description: 'Complete commercial setup with all equipment' },
  { value: 'shared_space', label: 'Shared Kitchen Space', description: 'Multi-tenant shared commercial kitchen' },
  { value: 'prep_kitchen', label: 'Prep Kitchen', description: 'Food preparation focused space' },
  { value: 'commissary', label: 'Commissary Kitchen', description: 'Licensed commercial kitchen for food trucks/caterers' },
];

const COMMON_EQUIPMENT = [
  'Commercial Oven', 'Walk-in Cooler', 'Walk-in Freezer', 'Hood System',
  'Fryers', 'Grills', 'Steam Table', 'Prep Tables', 'Commercial Dishwasher',
  'Ice Machine', 'Storage Racks', 'Three-Compartment Sink'
];

const CERTIFICATIONS = [
  'Health Department Approved', 'ServSafe Certified Facility', 'Organic Certified',
  'USDA Approved', 'Kosher Certified', 'Halal Certified'
];

const KitchenEarningsCalculator = () => {
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [kitchenType, setKitchenType] = useState<KitchenEstimateParams['kitchenType']>('full_commercial');
  const [squareFootage, setSquareFootage] = useState('');
  const [selectedEquipment, setSelectedEquipment] = useState<string[]>([]);
  const [selectedCertifications, setSelectedCertifications] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState('daily');
  
  const { estimate, isLoading, getEstimate, reset } = useKitchenEarningsEstimate();

  const handleEquipmentToggle = (equipment: string) => {
    setSelectedEquipment(prev => 
      prev.includes(equipment) 
        ? prev.filter(e => e !== equipment)
        : [...prev, equipment]
    );
  };

  const handleCertificationToggle = (cert: string) => {
    setSelectedCertifications(prev => 
      prev.includes(cert) 
        ? prev.filter(c => c !== cert)
        : [...prev, cert]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!city.trim()) {
      return;
    }

    await getEstimate({
      city: city.trim(),
      state: state || undefined,
      kitchenType,
      squareFootage: squareFootage ? parseInt(squareFootage) : undefined,
      equipment: selectedEquipment.length > 0 ? selectedEquipment : undefined,
      certifications: selectedCertifications.length > 0 ? selectedCertifications : undefined,
    });
  };

  const handleReset = () => {
    reset();
    setCity('');
    setState('');
    setKitchenType('full_commercial');
    setSquareFootage('');
    setSelectedEquipment([]);
    setSelectedCertifications([]);
  };

  // Calculate net earnings after platform fee
  const getNetEarnings = (grossAmount: number) => {
    const fees = calculateRentalFees(grossAmount);
    return fees.hostReceives;
  };

  return (
    <div className="space-y-6">
      <AnimatePresence mode="wait">
        {!estimate ? (
          <motion.div
            key="form"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 via-background to-transparent">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10">
                    <ChefHat className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-xl">Kitchen Earnings Calculator</CardTitle>
                    <p className="text-sm text-muted-foreground">Get AI-powered rental income estimates</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Location */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="city" className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        City *
                      </Label>
                      <Input
                        id="city"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        placeholder="e.g., Los Angeles"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="state">State</Label>
                      <Select value={state} onValueChange={setState}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select state" />
                        </SelectTrigger>
                        <SelectContent>
                          {US_STATES.map(s => (
                            <SelectItem key={s} value={s}>{s}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Kitchen Type */}
                  <div className="space-y-2">
                    <Label>Kitchen Type</Label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {KITCHEN_TYPES.map(type => (
                        <button
                          key={type.value}
                          type="button"
                          onClick={() => setKitchenType(type.value as KitchenEstimateParams['kitchenType'])}
                          className={`p-3 rounded-lg border-2 text-left transition-all ${
                            kitchenType === type.value 
                              ? 'border-primary bg-primary/5' 
                              : 'border-border hover:border-primary/50'
                          }`}
                        >
                          <span className="font-medium text-sm">{type.label}</span>
                          <p className="text-xs text-muted-foreground mt-0.5">{type.description}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Square Footage */}
                  <div className="space-y-2">
                    <Label htmlFor="sqft">Square Footage (optional)</Label>
                    <Input
                      id="sqft"
                      type="number"
                      value={squareFootage}
                      onChange={(e) => setSquareFootage(e.target.value)}
                      placeholder="e.g., 1500"
                      min="100"
                      max="50000"
                    />
                  </div>

                  {/* Equipment */}
                  <div className="space-y-2">
                    <Label>Equipment Included (optional)</Label>
                    <div className="flex flex-wrap gap-2">
                      {COMMON_EQUIPMENT.map(equipment => (
                        <Badge
                          key={equipment}
                          variant={selectedEquipment.includes(equipment) ? "default" : "outline"}
                          className="cursor-pointer transition-all hover:scale-105"
                          onClick={() => handleEquipmentToggle(equipment)}
                        >
                          {selectedEquipment.includes(equipment) && <CheckCircle2 className="h-3 w-3 mr-1" />}
                          {equipment}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Certifications */}
                  <div className="space-y-2">
                    <Label>Certifications (optional)</Label>
                    <div className="flex flex-wrap gap-2">
                      {CERTIFICATIONS.map(cert => (
                        <Badge
                          key={cert}
                          variant={selectedCertifications.includes(cert) ? "default" : "outline"}
                          className="cursor-pointer transition-all hover:scale-105"
                          onClick={() => handleCertificationToggle(cert)}
                        >
                          {selectedCertifications.includes(cert) && <CheckCircle2 className="h-3 w-3 mr-1" />}
                          {cert}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <Button 
                    type="submit" 
                    size="lg" 
                    className="w-full gap-2"
                    disabled={isLoading || !city.trim()}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Analyzing Market...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4" />
                        Get AI Earnings Estimate
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          <motion.div
            key="results"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            <EarningsResults 
              estimate={estimate} 
              onReset={handleReset}
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              getNetEarnings={getNetEarnings}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

interface EarningsResultsProps {
  estimate: KitchenEarningsEstimate;
  onReset: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  getNetEarnings: (amount: number) => number;
}

const EarningsResults = ({ estimate, onReset, activeTab, setActiveTab, getNetEarnings }: EarningsResultsProps) => {
  const confidenceColors = {
    low: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/30',
    medium: 'bg-blue-500/10 text-blue-600 border-blue-500/30',
    high: 'bg-green-500/10 text-green-600 border-green-500/30',
  };

  const getTabData = () => {
    switch (activeTab) {
      case 'hourly':
        return { low: estimate.hourly_low, suggested: estimate.hourly_suggested, high: estimate.hourly_high, label: 'Hourly' };
      case 'daily':
        return { low: estimate.daily_low, suggested: estimate.daily_suggested, high: estimate.daily_high, label: 'Daily' };
      case 'weekly':
        return { low: estimate.weekly_low, suggested: estimate.weekly_suggested, high: estimate.weekly_high, label: 'Weekly' };
      case 'monthly':
        return { low: estimate.monthly_low, suggested: estimate.monthly_suggested, high: estimate.monthly_high, label: 'Monthly' };
      default:
        return { low: estimate.daily_low, suggested: estimate.daily_suggested, high: estimate.daily_high, label: 'Daily' };
    }
  };

  const tabData = getTabData();

  return (
    <>
      {/* Main Earnings Card */}
      <Card className="border-2 border-green-500/30 bg-gradient-to-br from-green-500/5 via-background to-transparent overflow-hidden">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-green-500/20 to-emerald-500/20">
                <TrendingUp className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <CardTitle className="text-xl">Your Earnings Potential</CardTitle>
                <p className="text-sm text-muted-foreground">AI-powered market analysis</p>
              </div>
            </div>
            <Badge className={`${confidenceColors[estimate.confidence]} border`}>
              {estimate.confidence.charAt(0).toUpperCase() + estimate.confidence.slice(1)} Confidence
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Time Period Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="hourly" className="gap-1.5">
                <Clock className="h-4 w-4" />
                <span className="hidden sm:inline">Hourly</span>
              </TabsTrigger>
              <TabsTrigger value="daily" className="gap-1.5">
                <Calendar className="h-4 w-4" />
                <span className="hidden sm:inline">Daily</span>
              </TabsTrigger>
              <TabsTrigger value="weekly" className="gap-1.5">
                <CalendarDays className="h-4 w-4" />
                <span className="hidden sm:inline">Weekly</span>
              </TabsTrigger>
              <TabsTrigger value="monthly" className="gap-1.5">
                <BarChart3 className="h-4 w-4" />
                <span className="hidden sm:inline">Monthly</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="mt-6">
              {/* Price Range Display */}
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="text-center p-4 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Low End</p>
                  <p className="text-xl font-bold text-foreground">{formatCurrency(tabData.low)}</p>
                  <p className="text-xs text-muted-foreground mt-1">You keep: {formatCurrency(getNetEarnings(tabData.low))}</p>
                </div>
                <div className="text-center p-4 rounded-lg bg-green-500/10 border-2 border-green-500/30">
                  <p className="text-xs text-green-600 uppercase tracking-wide mb-1 font-medium">Suggested</p>
                  <p className="text-2xl font-bold text-green-600">{formatCurrency(tabData.suggested)}</p>
                  <p className="text-xs text-green-600/80 mt-1">You keep: {formatCurrency(getNetEarnings(tabData.suggested))}</p>
                </div>
                <div className="text-center p-4 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">High End</p>
                  <p className="text-xl font-bold text-foreground">{formatCurrency(tabData.high)}</p>
                  <p className="text-xs text-muted-foreground mt-1">You keep: {formatCurrency(getNetEarnings(tabData.high))}</p>
                </div>
              </div>

              {/* Platform Fee Note */}
              <div className="text-center text-sm text-muted-foreground">
                <DollarSign className="h-4 w-4 inline mr-1" />
                "You keep" amounts reflect our {RENTAL_HOST_FEE_PERCENT}% host fee
              </div>
            </TabsContent>
          </Tabs>

          {/* Annual Potential */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-primary/10 to-amber-500/10 border border-primary/20">
            <div className="flex items-center gap-3 mb-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              <span className="font-semibold text-foreground">Annual Earning Potential</span>
            </div>
            <p className="text-2xl font-bold text-primary">
              {formatCurrency(estimate.annual_potential_low)} – {formatCurrency(estimate.annual_potential_high)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Based on {estimate.expected_occupancy_percent}% expected occupancy
            </p>
          </div>

          {/* Reasoning */}
          <div className="p-4 rounded-lg bg-muted/30 border border-border">
            <p className="text-sm text-foreground">{estimate.reasoning}</p>
          </div>
        </CardContent>
      </Card>

      {/* Market Insights */}
      <Card className="border border-border">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-amber-500" />
            <CardTitle className="text-lg">Market Insights</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {estimate.market_insights.map((insight, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                <span className="text-muted-foreground">{insight}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* Tips */}
      {estimate.tips && estimate.tips.length > 0 && (
        <Card className="border border-amber-500/30 bg-amber-500/5">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-amber-600" />
              <CardTitle className="text-lg">Tips to Maximize Earnings</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {estimate.tips.map((tip, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <ArrowRight className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                  <span className="text-muted-foreground">{tip}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Button onClick={onReset} variant="outline" className="flex-1">
          Calculate Again
        </Button>
        <Button asChild className="flex-1 gap-2">
          <a href="/list">
            List Your Kitchen
            <ArrowRight className="h-4 w-4" />
          </a>
        </Button>
      </div>
    </>
  );
};

export default KitchenEarningsCalculator;
