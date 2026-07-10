/**
 * TransactionDetailsAccordion — expanded terms view. Renders every field
 * present in the TransactionTerms snapshot (dates, fulfillment, required
 * documents, cancellation policy, rules, acknowledgements).
 */
import * as React from 'react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import type { TransactionTerms } from '@/lib/transactionTerms';

const formatDate = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : '—';

interface Props {
  terms: TransactionTerms;
  className?: string;
}

export const TransactionDetailsAccordion: React.FC<Props> = ({ terms, className }) => {
  const sched = terms.schedule;
  return (
    <div
      data-testid="transaction-details-accordion"
      className={'rounded-2xl border border-border bg-card/70 ' + (className ?? '')}
    >
      <Accordion type="single" collapsible defaultValue="dates">
        {(sched.startDate || sched.endDate) && (
          <AccordionItem value="dates">
            <AccordionTrigger className="px-4">Dates &amp; time</AccordionTrigger>
            <AccordionContent className="px-4 pb-4 text-sm text-muted-foreground">
              <div>Start: {formatDate(sched.startDate)}</div>
              <div>End: {formatDate(sched.endDate)}</div>
              {sched.startTime && sched.endTime && (
                <div>
                  Time: {sched.startTime} – {sched.endTime}
                </div>
              )}
            </AccordionContent>
          </AccordionItem>
        )}

        <AccordionItem value="fulfillment">
          <AccordionTrigger className="px-4">Fulfillment</AccordionTrigger>
          <AccordionContent className="px-4 pb-4 text-sm text-muted-foreground">
            {terms.fulfillment.type || 'Coordinated with the host after checkout.'}
          </AccordionContent>
        </AccordionItem>

        {terms.policies.requiredDocuments.length > 0 && (
          <AccordionItem value="documents">
            <AccordionTrigger className="px-4">Required documents</AccordionTrigger>
            <AccordionContent className="px-4 pb-4 text-sm text-muted-foreground">
              <ul className="list-disc pl-5 space-y-1">
                {terms.policies.requiredDocuments.map((d, i) => (
                  <li key={i}>{d}</li>
                ))}
              </ul>
            </AccordionContent>
          </AccordionItem>
        )}

        <AccordionItem value="cancellation">
          <AccordionTrigger className="px-4">Cancellation policy</AccordionTrigger>
          <AccordionContent className="px-4 pb-4 text-sm text-muted-foreground">
            {terms.policies.cancellation}
          </AccordionContent>
        </AccordionItem>

        {terms.policies.rules && (
          <AccordionItem value="rules">
            <AccordionTrigger className="px-4">Rules</AccordionTrigger>
            <AccordionContent className="px-4 pb-4 text-sm text-muted-foreground whitespace-pre-line">
              {terms.policies.rules}
            </AccordionContent>
          </AccordionItem>
        )}

        <AccordionItem value="ack">
          <AccordionTrigger className="px-4">What you&rsquo;re agreeing to</AccordionTrigger>
          <AccordionContent className="px-4 pb-4 text-sm text-muted-foreground">
            <ul className="list-disc pl-5 space-y-1">
              {terms.policies.acknowledgements.map((a, i) => (
                <li key={i}>{a}</li>
              ))}
            </ul>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
};

export default TransactionDetailsAccordion;
