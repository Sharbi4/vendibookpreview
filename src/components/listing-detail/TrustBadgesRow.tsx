import { useState } from 'react';
import { UserCheck, ShieldCheck, FileText, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

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
    icon: <UserCheck className="h-4 w-4" />,
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
    icon: <ShieldCheck className="h-4 w-4" />,
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
    icon: <FileText className="h-4 w-4" />,
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
    icon: <AlertCircle className="h-4 w-4" />,
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

const TrustBadgesRow = () => {
  const [selectedItem, setSelectedItem] = useState<TrustItem | null>(null);

  return (
    <>
      <div className="flex items-center gap-2 flex-wrap">
        {trustItems.map((item) => (
          <Button
            key={item.id}
            variant="ghost"
            size="sm"
            onClick={() => setSelectedItem(item)}
            className="h-8 px-2 text-muted-foreground hover:text-foreground gap-1.5 text-xs"
          >
            {item.icon}
            <span className="hidden sm:inline">{item.label}</span>
          </Button>
        ))}
      </div>

      <Dialog open={!!selectedItem} onOpenChange={() => setSelectedItem(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedItem?.icon}
              {selectedItem?.title}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <p className="text-muted-foreground text-sm">
              {selectedItem?.description}
            </p>
            
            <ul className="space-y-2">
              {selectedItem?.bullets.map((bullet, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm">
                  <span className="text-primary mt-0.5">•</span>
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default TrustBadgesRow;
