import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calculator, CreditCard, Wallet, ArrowRight, DollarSign } from 'lucide-react';
import { 
  calculateRentalFees, 
  calculateSaleFees, 
  formatCurrency,
  RENTAL_HOST_FEE_PERCENT,
  RENTAL_RENTER_FEE_PERCENT,
  SALE_SELLER_FEE_PERCENT
} from '@/lib/commissions';

const PricingCalculator = () => {
  const [rentalPrice, setRentalPrice] = useState<string>('1000');
  const [salePrice, setSalePrice] = useState<string>('20000');

  const rentalAmount = parseFloat(rentalPrice) || 0;
  const saleAmount = parseFloat(salePrice) || 0;

  const rentalFees = calculateRentalFees(rentalAmount);
  const saleFees = calculateSaleFees(saleAmount);

  return (
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

        <Tabs defaultValue="rental" className="w-full">
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
                Commission Breakdown
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Rental price</span>
                  <span className="font-medium text-foreground">{formatCurrency(rentalAmount)}</span>
                </div>
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
              </div>

              <div className="mt-4 pt-3 border-t border-dashed border-border/60">
                <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                  Renter Pays
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Service fee ({RENTAL_RENTER_FEE_PERCENT}%)</span>
                  <span className="text-muted-foreground">+{formatCurrency(rentalFees.renterFee)}</span>
                </div>
                <div className="flex justify-between items-center pt-2 mt-2 border-t border-border">
                  <span className="font-semibold text-foreground">Renter total</span>
                  <span className="font-bold text-foreground">{formatCurrency(rentalFees.customerTotal)}</span>
                </div>
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
                Commission Breakdown
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
                    Seller receives
                  </span>
                  <span className="font-bold text-green-600 text-lg">{formatCurrency(saleFees.sellerReceives)}</span>
                </div>
              </div>

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
            </div>

            <p className="text-xs text-muted-foreground italic">
              * Buyer may add freight if choosing buyer-paid shipping
            </p>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default PricingCalculator;
