import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { HelpCircle } from 'lucide-react';

interface BookingFAQProps {
  isRental: boolean;
}

const BookingFAQ = ({ isRental }: BookingFAQProps) => {
  const rentalFaqs = [
    {
      question: "How does the booking process work?",
      answer: "Submit your booking request with your preferred dates. The host will review your request and either approve or decline it. You won't be charged until your request is approved."
    },
    {
      question: "When do I pay?",
      answer: "Payment is only processed after the host approves your booking request. Once approved, you'll receive a notification to complete your payment securely through our platform."
    },
    {
      question: "What happens after I submit a booking request?",
      answer: "The host will be notified immediately and typically responds within 24-48 hours. You'll receive an email and in-app notification once they respond."
    },
    {
      question: "Can I cancel my booking?",
      answer: "Yes, you can cancel your booking according to the cancellation policy. Cancellations made before payment is processed are always free."
    },
    {
      question: "Are there any documents required?",
      answer: "Some listings may require documents like a driver's license or insurance. Any required documents will be clearly listed on this page. You can upload them before or after booking approval."
    },
    {
      question: "How is payment protected?",
      answer: "All payments are processed securely through Stripe. Your payment information is never shared with the host, and funds are protected until you receive the rental."
    }
  ];

  const saleFaqs = [
    {
      question: "How does purchasing work?",
      answer: "Click 'Buy Now' to proceed directly to secure checkout. Once payment is complete, the seller will be notified to prepare your item for pickup or delivery."
    },
    {
      question: "When will I receive my item?",
      answer: "Timing depends on the fulfillment method you choose. For pickup, you'll coordinate directly with the seller. For delivery or Vendibook Freight, you'll receive tracking information once shipped."
    },
    {
      question: "Is my payment secure?",
      answer: "Yes, all payments are processed securely through Stripe. Your payment information is never shared with the seller."
    },
    {
      question: "What if the item isn't as described?",
      answer: "Vendibook offers buyer protection. If the item isn't as described, you can raise a dispute through our platform and we'll help resolve the issue."
    },
    {
      question: "Can I message the seller before buying?",
      answer: "Yes, you can message the host directly to ask questions about the listing before making a purchase. Look for the 'Message Host' button."
    },
    {
      question: "What fulfillment options are available?",
      answer: "Options vary by listing but may include local pickup, seller delivery within a radius, or Vendibook Freight for larger items shipped nationwide."
    }
  ];

  const faqs = isRental ? rentalFaqs : saleFaqs;

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <HelpCircle className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold text-foreground">
          Frequently Asked Questions
        </h2>
      </div>
      
      <Accordion type="single" collapsible className="w-full">
        {faqs.map((faq, index) => (
          <AccordionItem key={index} value={`item-${index}`}>
            <AccordionTrigger className="text-left text-foreground hover:no-underline">
              {faq.question}
            </AccordionTrigger>
            <AccordionContent className="text-muted-foreground">
              {faq.answer}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
};

export default BookingFAQ;
