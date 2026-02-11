import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import { Calculator, CreditCard, Wallet, ArrowRight, DollarSign, TrendingUp, Check } from 'lucide-react';
import { 
  calculateRentalFees, 
  calculateSaleFees, 
  formatCurrency,
  RENTAL_HOST_FEE_PERCENT,
  RENTAL_RENTER_FEE_PERCENT,
  SALE_SELLER_FEE_PERCENT
} from '@/lib/commissions';

// Competitor data for comparison
const competitors = [
  { name: 'Vendibook', sellerFee: 12.9, note: 'Full buyer & seller protection' },
  { name: 'eBay', sellerFee: 13.25, note: 'Additional payment fees apply' },
  { name: 'Facebook Marketplace', sellerFee: 5, note: 'Limited buyer protection' },
  { name: 'Traditional Broker', sellerFee: 20, note: 'Slow process, high overhead' },
];

interface PricingCalculatorProps {
  role?: 'renter' | 'host' | 'seller';
}

const PricingCalculator = ({ role }: PricingCalculatorProps = {}) => {
  const [rentalPrice, setRentalPrice] = useState<string>('1000');
  const [salePrice, setSalePrice] = useState<string>('20000');
  const [comparisonPrice, setComparisonPrice] = useState<number[]>([20000]);

  const rentalAmount = parseFloat(rentalPrice) || 0;
  const saleAmount = parseFloat(salePrice) || 0;
  const compareAmount = comparisonPrice[0];

  const rentalFees = calculateRentalFees(rentalAmount);
  const saleFees = calculateSaleFees(saleAmount);

  // Calculate savings compared to each competitor
  const vendibookFee = compareAmount * (SALE_SELLER_FEE_PERCENT / 100);
  const vendibookPayout = compareAmount - vendibookFee;

  return (
    <div className="space-y-6">
      <Card className="border-2 border-vendibook-orange/30 bg-gradient-to-br from-vendibook-orange/5 via-amber-400/5 to-transparent overflow-hidden">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-vendibook-orange/20 to-amber-400/20">
              <Calculator className="h-5 w-5 text-vendibook-orange" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-foreground">Pricing Calculator</h3>
              <p className="text-xs text-muted-foreground">Enter a price to see the fee breakdown instantly</p>
            </div>
          </div>

          <Tabs defaultValue={role === 'seller' ? 'sale' : 'rental'} className="w-full">
            {!role && (
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="rental" className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  Rental
                </TabsTrigger>
                <TabsTrigger value="sale" className="flex items-center gap-2">
                  <Wallet className="h-4 w-4" />
                  Sale
                </TabsTrigger>
              </TabsList>
            )}

            <TabsContent value="rental" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="rental-price" className="text-sm font-medium text-foreground">
                  Rental Price
                </Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="rental-price"
                    type="number"
                    min="0"
                    step="1"
                    value={rentalPrice}
                    onChange={(e) => setRentalPrice(e.target.value)}
                    className="pl-9 text-lg font-semibold h-12"
                    placeholder="Enter rental price"
                  />
                </div>
              </div>

              <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
                  {role === 'renter' ? 'What You Pay' : role === 'host' ? 'What You Earn' : 'Commission Breakdown'}
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Rental price</span>
                    <span className="font-medium text-foreground">{formatCurrency(rentalAmount)}</span>
                  </div>

                  {/* Host view: show commission deducted */}
                  {role !== 'renter' && (
                    <>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-destructive">Host commission ({RENTAL_HOST_FEE_PERCENT}%)</span>
                        <span className="text-destructive">-{formatCurrency(rentalFees.hostFee)}</span>
                      </div>
                      <div className="flex justify-between items-center pt-2 border-t border-border">
                        <span className="font-semibold text-foreground flex items-center gap-1">
                          <ArrowRight className="h-4 w-4 text-green-600" />
                          Host receives
                        </span>
                        <span className="font-bold text-green-600 text-lg">{formatCurrency(rentalFees.hostReceives)}</span>
                      </div>
                    </>
                  )}

                  {/* Renter view: show service fee added */}
                  {role !== 'host' && (
                    <div className={role === 'renter' ? '' : 'mt-4 pt-3 border-t border-dashed border-border/60'}>
                      {role !== 'renter' && (
                        <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                          Renter Pays
                        </div>
                      )}
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">Service fee ({RENTAL_RENTER_FEE_PERCENT}%)</span>
                        <span className="text-muted-foreground">+{formatCurrency(rentalFees.renterFee)}</span>
                      </div>
                      <div className="flex justify-between items-center pt-2 mt-2 border-t border-border">
                        <span className="font-semibold text-foreground">
                          {role === 'renter' ? 'You pay' : 'Renter total'}
                        </span>
                        <span className="font-bold text-foreground">{formatCurrency(rentalFees.customerTotal)}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <p className="text-xs text-muted-foreground italic">
                * Deposits and delivery fees are calculated separately
              </p>
            </TabsContent>

            <TabsContent value="sale" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="sale-price" className="text-sm font-medium text-foreground">
                  Sale Price
                </Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="sale-price"
                    type="number"
                    min="0"
                    step="1"
                    value={salePrice}
                    onChange={(e) => setSalePrice(e.target.value)}
                    className="pl-9 text-lg font-semibold h-12"
                    placeholder="Enter sale price"
                  />
                </div>
              </div>

              <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
                  {role === 'seller' ? 'What You Earn' : 'Commission Breakdown'}
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Sale price</span>
                    <span className="font-medium text-foreground">{formatCurrency(saleAmount)}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-destructive">Seller commission ({SALE_SELLER_FEE_PERCENT}%)</span>
                    <span className="text-destructive">-{formatCurrency(saleFees.sellerFee)}</span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-border">
                    <span className="font-semibold text-foreground flex items-center gap-1">
                      <ArrowRight className="h-4 w-4 text-green-600" />
                      {role === 'seller' ? 'You receive' : 'Seller receives'}
                    </span>
                    <span className="font-bold text-green-600 text-lg">{formatCurrency(saleFees.sellerReceives)}</span>
                  </div>
                </div>

                {role !== 'seller' && (
                  <div className="mt-4 pt-3 border-t border-dashed border-border/60">
                    <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                      Buyer Pays
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">Platform fee</span>
                      <span className="text-green-600 font-medium">$0.00</span>
                    </div>
                    <div className="flex justify-between items-center pt-2 mt-2 border-t border-border">
                      <span className="font-semibold text-foreground">Buyer total</span>
                      <span className="font-bold text-foreground">{formatCurrency(saleFees.customerTotal)}</span>
                    </div>
                  </div>
                )}
              </div>

              <p className="text-xs text-muted-foreground italic">
                * Buyer may add freight if choosing buyer-paid shipping
              </p>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Competitor Comparison Section - only show for seller or no role */}
      {(!role || role === 'seller') && (
        <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 via-background to-transparent overflow-hidden">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10">
                <TrendingUp className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-foreground">Compare With Competitors</h3>
                <p className="text-xs text-muted-foreground">See how much more you keep with Vendibook</p>
              </div>
            </div>

            {/* Price Slider */}
            <div className="space-y-4 mb-6">
              <div className="flex justify-between items-center">
                <Label className="text-sm font-medium text-foreground">Sale Price</Label>
                <span className="text-2xl font-bold text-foreground">{formatCurrency(compareAmount)}</span>
              </div>
              <Slider
                value={comparisonPrice}
                onValueChange={setComparisonPrice}
                min={1000}
                max={100000}
                step={1000}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>$1,000</span>
                <span>$100,000</span>
              </div>
            </div>

            {/* Price Comparison Table */}
            <div className="rounded-xl border border-border overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="bg-muted/50">
                    <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide px-4 py-3">Platform</th>
                    <th className="text-center text-xs font-semibold text-muted-foreground uppercase tracking-wide px-4 py-3">Fee</th>
                    <th className="text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide px-4 py-3">You Keep</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {competitors.map((competitor) => {
                    const fee = compareAmount * (competitor.sellerFee / 100);
                    const payout = compareAmount - fee;
                    const savingsVsThis = payout - vendibookPayout;
                    const isVendibook = competitor.name === 'Vendibook';

                    return (
                      <tr 
                        key={competitor.name} 
                        className={`${isVendibook ? 'bg-vendibook-orange/5' : 'bg-background'} transition-colors`}
                      >
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2">
                            <span className={`font-medium ${isVendibook ? 'text-vendibook-orange' : 'text-foreground'}`}>
                              {competitor.name}
                            </span>
                            {isVendibook && (
                              <span className="px-2 py-0.5 text-[10px] font-bold bg-vendibook-orange text-white rounded-full">
                                BEST
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-muted-foreground mt-0.5">{competitor.note}</p>
                        </td>
                        <td className="px-4 py-4 text-center">
                          <span className={`text-sm font-semibold ${isVendibook ? 'text-vendibook-orange' : 'text-foreground'}`}>
                            {competitor.sellerFee}%
                          </span>
                          <p className="text-xs text-muted-foreground">{formatCurrency(fee)}</p>
                        </td>
                        <td className="px-4 py-4 text-right">
                          <span className={`text-lg font-bold ${isVendibook ? 'text-vendibook-orange' : 'text-foreground'}`}>
                            {formatCurrency(payout)}
                          </span>
                          {!isVendibook && savingsVsThis < 0 && (
                            <p className="text-xs text-green-600 flex items-center justify-end gap-1 mt-0.5">
                              <Check className="h-3 w-3" />
                              Save {formatCurrency(Math.abs(savingsVsThis))}
                            </p>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Summary Card */}
            <div className="mt-6 p-4 rounded-lg bg-gradient-to-r from-vendibook-orange/10 to-amber-400/10 border border-vendibook-orange/20">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-vendibook-orange/20">
                  <Check className="h-4 w-4 text-vendibook-orange" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">
                    You keep {formatCurrency(vendibookPayout)} with Vendibook
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    That's {(100 - SALE_SELLER_FEE_PERCENT).toFixed(1)}% of your sale price, plus full buyer/seller protection
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default PricingCalculator;
