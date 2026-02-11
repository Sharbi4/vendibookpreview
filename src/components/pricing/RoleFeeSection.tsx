import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Users, Home, Store, ArrowRight, Check, CreditCard, Truck } from 'lucide-react';
import { 
  RENTAL_RENTER_FEE_PERCENT, 
  RENTAL_HOST_FEE_PERCENT, 
  SALE_SELLER_FEE_PERCENT 
} from '@/lib/commissions';
import PricingCalculator from './PricingCalculator';

type Role = 'renter' | 'host' | 'seller';

interface RoleFAQ {
  question: string;
  answer: string;
}

const roleFAQs: Record<Role, RoleFAQ[]> = {
  renter: [
    { question: 'When does Vendibook charge fees?', answer: 'Vendibook only charges fees when a transaction happens on-platform. All fees are shown clearly before checkout.' },
    { question: 'What is the renter service fee?', answer: `Renters pay a ${RENTAL_RENTER_FEE_PERCENT}% platform/service fee at checkout. This covers secure payments, identity and trust safeguards, customer support, dispute handling, and payout routing.` },
    { question: 'Are there additional fees for freight or shipping?', answer: 'If a buyer selects buyer-paid freight, a freight/shipping charge may be added at checkout. Freight pricing and timing vary by route and carrier availability.' },
    { question: 'Are there payment processing fees?', answer: 'Payment processing costs may apply depending on the payment method and region. Any applicable charges are shown before purchase.' },
  ],
  host: [
    { question: 'When does Vendibook charge fees?', answer: 'Vendibook only charges fees when a transaction happens on-platform. All fees are shown clearly before checkout.' },
    { question: 'What is the host commission for rentals?', answer: `Hosts pay a ${RENTAL_HOST_FEE_PERCENT}% commission on the rental amount (excluding any refundable deposit).` },
    { question: 'Are there payment processing fees?', answer: 'Payment processing costs may apply depending on the payment method and region. Any applicable charges are shown before purchase.' },
    { question: 'When do I get paid?', answer: 'Payout timing depends on your connected payout account settings, banking settlement timelines, and any transaction hold or milestone release rules. Most payouts arrive within a few business days.' },
  ],
  seller: [
    { question: 'When does Vendibook charge fees?', answer: 'Vendibook only charges fees when a transaction happens on-platform. All fees are shown clearly before checkout.' },
    { question: 'What is the seller commission for sales?', answer: `Sellers pay a ${SALE_SELLER_FEE_PERCENT}% commission on the sale price.` },
    { question: 'Do buyers pay a platform fee on sales?', answer: 'No. Buyers do not pay a platform fee on sales.' },
    { question: 'Are there additional fees for freight or shipping?', answer: 'If a buyer selects buyer-paid freight, a freight/shipping charge may be added at checkout. Freight pricing and timing vary by route and carrier availability.' },
  ],
};

const roleConfig: Record<Role, { label: string; icon: typeof Users; description: string; accent: string }> = {
  renter: { label: 'Renter', icon: Users, description: 'What you pay when booking', accent: 'text-blue-600' },
  host: { label: 'Host', icon: Home, description: 'What you earn from rentals', accent: 'text-emerald-600' },
  seller: { label: 'Seller', icon: Store, description: 'What you earn from sales', accent: 'text-vendibook-orange' },
};

const RoleFeeSection = () => {
  const [activeRole, setActiveRole] = useState<Role>('renter');

  return (
    <div className="space-y-6">
      <Tabs value={activeRole} onValueChange={(v) => setActiveRole(v as Role)} className="w-full">
        <TabsList className="grid w-full grid-cols-3 h-auto p-1">
          {(Object.keys(roleConfig) as Role[]).map((role) => {
            const config = roleConfig[role];
            const Icon = config.icon;
            return (
              <TabsTrigger key={role} value={role} className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 py-2.5 px-2 text-xs sm:text-sm">
                <Icon className="h-4 w-4" />
                <span>{config.label}</span>
              </TabsTrigger>
            );
          })}
        </TabsList>

        {/* Renter View */}
        <TabsContent value="renter" className="space-y-6 mt-6">
          <Card className="border-2 border-blue-500/20 bg-gradient-to-br from-blue-500/5 to-transparent">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <Users className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-foreground">Renter Fees</h3>
                  <p className="text-xs text-muted-foreground">What you pay when renting</p>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center py-2 border-b border-border/50">
                  <span className="text-muted-foreground">Platform service fee</span>
                  <span className="font-bold text-foreground text-lg">{RENTAL_RENTER_FEE_PERCENT}%</span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-4">
                Added at checkout. Covers secure payments, identity safeguards, support, and dispute handling.
              </p>

              {/* Example */}
              <div className="mt-6 p-4 rounded-lg bg-muted/50">
                <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                  <span className="text-xs bg-blue-500/10 text-blue-600 px-2 py-1 rounded">Example</span>
                  $1,000 Rental
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Rental price</span>
                    <span className="font-medium text-foreground">$1,000.00</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Service fee ({RENTAL_RENTER_FEE_PERCENT}%)</span>
                    <span className="text-muted-foreground">+$129.00</span>
                  </div>
                  <div className="flex justify-between border-t pt-2 mt-2">
                    <span className="font-semibold text-foreground flex items-center gap-1">
                      <ArrowRight className="h-4 w-4 text-blue-600" />
                      You pay
                    </span>
                    <span className="font-bold text-foreground text-lg">$1,129.00</span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground italic mt-3">* Deposits and delivery fees shown separately</p>
              </div>
            </CardContent>
          </Card>

          <PricingCalculator role="renter" />

          <RoleFAQAccordion role="renter" />
        </TabsContent>

        {/* Host View */}
        <TabsContent value="host" className="space-y-6 mt-6">
          <Card className="border-2 border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 to-transparent">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-2 rounded-lg bg-emerald-500/10">
                  <Home className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-foreground">Host Commission</h3>
                  <p className="text-xs text-muted-foreground">What you earn from rentals</p>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center py-2 border-b border-border/50">
                  <span className="text-muted-foreground">Commission on rentals</span>
                  <span className="font-bold text-foreground text-lg">{RENTAL_HOST_FEE_PERCENT}%</span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-4">
                Deducted from your rental payout. Excludes refundable deposits.
              </p>

              {/* Example */}
              <div className="mt-6 p-4 rounded-lg bg-muted/50">
                <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                  <span className="text-xs bg-emerald-500/10 text-emerald-600 px-2 py-1 rounded">Example</span>
                  $1,000 Rental
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Rental price</span>
                    <span className="font-medium text-foreground">$1,000.00</span>
                  </div>
                  <div className="flex justify-between text-destructive">
                    <span>Commission ({RENTAL_HOST_FEE_PERCENT}%)</span>
                    <span>-$129.00</span>
                  </div>
                  <div className="flex justify-between border-t pt-2 mt-2">
                    <span className="font-semibold text-foreground flex items-center gap-1">
                      <ArrowRight className="h-4 w-4 text-emerald-600" />
                      You receive
                    </span>
                    <span className="font-bold text-emerald-600 text-lg">$871.00</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <PricingCalculator role="host" />

          <RoleFAQAccordion role="host" />
        </TabsContent>

        {/* Seller View */}
        <TabsContent value="seller" className="space-y-6 mt-6">
          <Card className="border-2 border-vendibook-orange/20 bg-gradient-to-br from-vendibook-orange/5 to-transparent">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-2 rounded-lg bg-vendibook-orange/10">
                  <Store className="h-5 w-5 text-vendibook-orange" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-foreground">Seller Commission</h3>
                  <p className="text-xs text-muted-foreground">What you earn from sales</p>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center py-2 border-b border-border/50">
                  <span className="text-muted-foreground">Commission on sales</span>
                  <span className="font-bold text-foreground text-lg">{SALE_SELLER_FEE_PERCENT}%</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-border/50">
                  <span className="text-muted-foreground">Buyer platform fee</span>
                  <span className="font-bold text-emerald-600 text-lg flex items-center gap-1">
                    <Check className="h-4 w-4" /> $0
                  </span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-4">
                Buyers may add freight if they choose buyer-paid shipping
              </p>

              {/* Example */}
              <div className="mt-6 p-4 rounded-lg bg-muted/50">
                <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                  <span className="text-xs bg-vendibook-orange/10 text-vendibook-orange px-2 py-1 rounded">Example</span>
                  $20,000 Sale
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Sale price</span>
                    <span className="font-medium text-foreground">$20,000.00</span>
                  </div>
                  <div className="flex justify-between text-destructive">
                    <span>Commission ({SALE_SELLER_FEE_PERCENT}%)</span>
                    <span>-$2,580.00</span>
                  </div>
                  <div className="flex justify-between border-t pt-2 mt-2">
                    <span className="font-semibold text-foreground flex items-center gap-1">
                      <ArrowRight className="h-4 w-4 text-vendibook-orange" />
                      You receive
                    </span>
                    <span className="font-bold text-emerald-600 text-lg">$17,420.00</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground pt-2 border-t">
                    <span>Buyer pays extra</span>
                    <span className="text-emerald-600">$0</span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground italic mt-3">* Buyer may add freight if choosing buyer-paid shipping</p>
              </div>
            </CardContent>
          </Card>

          <PricingCalculator role="seller" />

          <RoleFAQAccordion role="seller" />
        </TabsContent>
      </Tabs>

      {/* Additional Fees - always visible */}
      <Card className="bg-muted/30 border-dashed">
        <CardContent className="pt-6">
          <h3 className="font-semibold text-foreground mb-4">Additional Fees (When Applicable)</h3>
          <div className="grid sm:grid-cols-2 gap-4 text-sm">
            <div className="flex items-start gap-3">
              <Truck className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-foreground">Freight / Shipping</p>
                <p className="text-muted-foreground text-xs">Buyer-paid freight added at checkout when selected. Pricing varies by route.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CreditCard className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-foreground">Payment Processing</p>
                <p className="text-muted-foreground text-xs">May apply depending on payment method and region. Shown before purchase.</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

const RoleFAQAccordion = ({ role }: { role: Role }) => {
  const faqs = roleFAQs[role];
  return (
    <Accordion type="single" collapsible className="w-full">
      {faqs.map((faq, index) => (
        <AccordionItem key={index} value={`${role}-${index}`}>
          <AccordionTrigger className="text-left text-foreground hover:no-underline hover:text-primary">
            {faq.question}
          </AccordionTrigger>
          <AccordionContent className="text-muted-foreground leading-relaxed">
            {faq.answer}
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
};

export default RoleFeeSection;
