import { useState } from 'react';
import { UserCheck, ShieldCheck, FileText, AlertCircle, ChevronRight } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface TrustItem {
  id: string;
  icon: React.ReactNode;
  label: string;
  title: string;
  description: string;
  bullets: string[];
}

const trustItems: TrustItem[] = [
  {
    id: 'verified',
    icon: <UserCheck className="h-5 w-5" />,
    label: 'Verified Users',
    title: 'Verified Users',
    description: 'All hosts on Vendibook go through our verification process to ensure a safe marketplace.',
    bullets: [
      'Identity verification via government ID',
      'Email and phone verification',
      'Business verification for commercial listings',
    ],
  },
  {
    id: 'payments',
    icon: <ShieldCheck className="h-5 w-5" />,
    label: 'Secure Payments',
    title: 'Secure Payments',
    description: 'Your payments are protected with industry-standard security powered by Stripe.',
    bullets: [
      'PCI-compliant payment processing',
      'Funds held securely until delivery',
      'Encrypted payment information',
    ],
  },
  {
    id: 'documents',
    icon: <FileText className="h-5 w-5" />,
    label: 'Document Workflows',
    title: 'Document Workflows',
    description: 'Hosts can require verification documents to ensure qualified renters and buyers.',
    bullets: [
      'Secure document upload and storage',
      'Host review and approval process',
      'Documents only shared with relevant parties',
    ],
  },
  {
    id: 'disputes',
    icon: <AlertCircle className="h-5 w-5" />,
    label: 'Dispute Support',
    title: 'Dispute Support',
    description: 'If something goes wrong, our support team is here to help resolve issues.',
    bullets: [
      '24-48 hour response time',
      'Mediation between parties',
      'Refund processing when warranted',
    ],
  },
];

const CompactTrustSection = () => {
  const [selectedItem, setSelectedItem] = useState<TrustItem | null>(null);

  return (
    <>
      <div className="bg-muted/30 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-foreground mb-3">Your booking is protected</h3>
        <div className="grid grid-cols-2 gap-2">
          {trustItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setSelectedItem(item)}
              className="flex items-center gap-2 p-3 rounded-lg bg-background border border-border hover:border-primary/50 hover:bg-primary/5 transition-all text-left group"
            >
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                {item.icon}
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-xs font-medium text-foreground block truncate">{item.label}</span>
              </div>
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
            </button>
          ))}
        </div>
      </div>

      <Dialog open={!!selectedItem} onOpenChange={() => setSelectedItem(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                {selectedItem?.icon}
              </div>
              <span>{selectedItem?.title}</span>
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <p className="text-muted-foreground text-sm">
              {selectedItem?.description}
            </p>
            
            <ul className="space-y-2">
              {selectedItem?.bullets.map((bullet, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm">
                  <span className="text-primary mt-0.5 flex-shrink-0">✓</span>
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>
            
            <div className="pt-2">
              <Button 
                variant="outline" 
                size="sm"
                className="w-full"
                onClick={() => setSelectedItem(null)}
              >
                Got it
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default CompactTrustSection;
