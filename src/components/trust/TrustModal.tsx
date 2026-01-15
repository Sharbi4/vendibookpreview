import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { TrustTile, documentChecklist } from './trustContent';
import { Check, FileText } from 'lucide-react';

interface TrustModalProps {
  tile: TrustTile | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const TrustModal = ({ tile, open, onOpenChange }: TrustModalProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  if (!tile) return null;
  
  const Icon = tile.icon;
  const isDocumentsModal = tile.id === 'required-documents';
  
  const handlePrimaryCta = () => {
    onOpenChange(false);
    const cta = tile.modal.primaryCta;
    if (cta.requiresAuth && user) {
      navigate(cta.authHref || cta.href);
    } else {
      navigate(cta.href);
    }
  };
  
  const handleSecondaryCta = () => {
    onOpenChange(false);
    navigate(tile.modal.secondaryCta.href);
  };
  
  const getPrimaryCtaLabel = () => {
    const cta = tile.modal.primaryCta;
    if (cta.requiresAuth && user && cta.authLabel) {
      return cta.authLabel;
    }
    return cta.label;
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="max-w-2xl max-h-[90vh] overflow-y-auto"
        aria-describedby="trust-modal-description"
      >
        <DialogHeader className="pb-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Icon className="w-5 h-5 text-primary" strokeWidth={1.5} />
            </div>
            <DialogTitle className="text-xl font-semibold">
              {tile.modal.title}
            </DialogTitle>
          </div>
        </DialogHeader>
        
        <div id="trust-modal-description" className="space-y-6 py-4">
          {/* Description paragraphs */}
          <div className="space-y-4">
            {tile.modal.description.map((paragraph, index) => (
              <p key={index} className="text-muted-foreground leading-relaxed">
                {paragraph}
              </p>
            ))}
          </div>
          
          {/* Document Checklist (only for Required Documents modal) */}
          {isDocumentsModal && (
            <div className="bg-secondary/50 rounded-lg p-5 space-y-4">
              <h4 className="font-semibold text-foreground flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" />
                Document Checklist by Category
              </h4>
              
              <div className="grid gap-4">
                <DocumentCategory title="Identity" items={documentChecklist.identity} />
                <DocumentCategory title="Food Compliance" items={documentChecklist.foodCompliance} />
                <DocumentCategory title="Insurance" items={documentChecklist.insurance} />
                <DocumentCategory title="Ownership/Proof" items={documentChecklist.ownership} />
                <DocumentCategory title="Business" items={documentChecklist.business} />
              </div>
            </div>
          )}
          
          {/* How it works steps */}
          <div className="space-y-4">
            <h4 className="font-semibold text-foreground">How it works</h4>
            <ol className="space-y-3">
              {tile.modal.steps.map((step) => (
                <li key={step.step} className="flex gap-4">
                  <span className="flex-shrink-0 w-7 h-7 rounded-full bg-primary text-primary-foreground 
                                   text-sm font-medium flex items-center justify-center">
                    {step.step}
                  </span>
                  <div className="pt-0.5">
                    <span className="font-medium text-foreground">{step.title}</span>
                    <p className="text-sm text-muted-foreground mt-0.5">{step.description}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
          
          {/* FAQ Accordion */}
          <div className="space-y-3">
            <h4 className="font-semibold text-foreground">Frequently Asked Questions</h4>
            <Accordion type="single" collapsible className="w-full">
              {tile.modal.faqs.map((faq, index) => (
                <AccordionItem key={index} value={`faq-${index}`} className="border-border">
                  <AccordionTrigger className="text-left text-sm font-medium hover:text-primary">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-sm text-muted-foreground">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </div>
        
        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-border">
          <Button 
            onClick={handlePrimaryCta}
            className="flex-1"
          >
            {getPrimaryCtaLabel()}
          </Button>
          <Button 
            variant="outline" 
            onClick={handleSecondaryCta}
            className="flex-1"
          >
            {tile.modal.secondaryCta.label}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

interface DocumentCategoryProps {
  title: string;
  items: Array<{ name: string; required: boolean; note?: string }>;
}

const DocumentCategory = ({ title, items }: DocumentCategoryProps) => (
  <div>
    <h5 className="text-sm font-medium text-foreground mb-2">{title}</h5>
    <ul className="space-y-1.5">
      {items.map((item, index) => (
        <li key={index} className="flex items-start gap-2 text-sm">
          <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
          <span className="text-muted-foreground">
            {item.name}
            {item.required && <span className="text-primary ml-1">*</span>}
            {item.note && <span className="text-muted-foreground/70 ml-1">— {item.note}</span>}
          </span>
        </li>
      ))}
    </ul>
  </div>
);

export default TrustModal;
