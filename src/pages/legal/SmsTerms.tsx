import React from 'react';
import SEO from '@/components/SEO';
import { SMS_POLICY_VERSION } from '@/lib/sms/consent';

const EFFECTIVE_DATE = 'July 27, 2026';

/**
 * /legal/sms — Vendibook SMS Terms and Consent Policy.
 * Public, indexable page that satisfies TCPA / toll-free-verification
 * disclosure requirements.
 */
const SmsTerms: React.FC = () => {
  return (
    <>
      <SEO
        title="SMS Terms & Consent Policy | Vendibook"
        description="Learn how Vendibook uses transactional SMS for accounts, bookings, payments, documents, listings, and customer support. Consent is optional; reply STOP to opt out."
        canonical="https://vendibook.com/legal/sms"
      />
      <main className="mx-auto max-w-3xl px-4 py-12 space-y-6 text-foreground">
        <header>
          <h1 className="text-3xl font-semibold">Vendibook SMS Terms and Consent Policy</h1>
          <p className="text-sm text-muted-foreground mt-2">
            Effective: {EFFECTIVE_DATE} · Policy version {SMS_POLICY_VERSION}
          </p>
        </header>

        <Section title="Program description">
          <p>
            Vendibook provides optional transactional text messages concerning accounts,
            bookings, payments, required documents, listings, inquiries, pickup or delivery
            coordination, and customer support. Vendibook does not send promotional or
            marketing text messages under this program.
          </p>
        </Section>

        <Section title="Consent">
          <p>
            You enroll in Vendibook SMS only through an affirmative action, such as selecting
            the optional SMS checkbox on the signup or notification-settings screen, submitting
            the dedicated SMS enrollment form at <a href="/sms" className="underline">vendibook.com/sms</a>,
            or replying with a recognized opt-in keyword to a Vendibook message.
          </p>
          <p>
            Your consent to receive text messages is <strong>not a condition</strong> of creating
            an account, purchasing, renting, selling, financing, or using Vendibook.
          </p>
        </Section>

        <Section title="Message frequency">
          <p>Message frequency varies depending on your account and marketplace activity.</p>
        </Section>

        <Section title="Charges">
          <p>Message and data rates may apply according to your mobile carrier and plan.</p>
        </Section>

        <Section title="Opting out">
          <p>
            You may reply <strong>STOP</strong>, <strong>UNSUBSCRIBE</strong>, <strong>END</strong>,
            <strong> QUIT</strong>, <strong>CANCEL</strong>, or <strong>HALT</strong> to any Vendibook
            SMS to opt out. After you opt out, Vendibook will send one confirmation message and
            then stop sending SMS to that number unless you affirmatively enroll again. You may
            also disable SMS in your Vendibook notification settings.
          </p>
        </Section>

        <Section title="Re-enrollment">
          <p>
            You may reply <strong>START</strong>, <strong>YES</strong>, or <strong>UNSTOP</strong>,
            or affirmatively re-enable SMS in your Vendibook account settings. Re-enrollment
            creates a new consent record — Vendibook never silently reactivates a prior consent.
          </p>
        </Section>

        <Section title="Help">
          <p>
            Reply <strong>HELP</strong>, <strong>INFO</strong>, or <strong>SUPPORT</strong> to any
            Vendibook SMS, visit <a href="/support" className="underline">Vendibook Support</a>,
            or email <a href="mailto:support@vendibook.com" className="underline">support@vendibook.com</a>.
          </p>
        </Section>

        <Section title="Supported content">
          <p>
            This SMS program is for transactional and customer-care communication. It does not
            enroll you in promotional marketing messages, discounts, general listing promotions,
            or bulk marketing campaigns.
          </p>
        </Section>

        <Section title="Delivery">
          <p>
            Delivery is subject to carrier availability and is not guaranteed. Carriers are not
            liable for delayed or undelivered messages.
          </p>
        </Section>

        <Section title="Privacy">
          <p>
            Vendibook handles mobile-number consent records in accordance with our{' '}
            <a href="/legal/privacy" className="underline">Privacy Policy</a>.
          </p>
        </Section>

        <Section title="Contact">
          <address className="not-italic text-sm text-muted-foreground">
            Vendibook<br />
            support@vendibook.com<br />
            <a href="https://vendibook.com" className="underline">https://vendibook.com</a>
          </address>
        </Section>
      </main>
    </>
  );
};

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <section className="space-y-2">
    <h2 className="text-lg font-semibold">{title}</h2>
    <div className="text-sm leading-relaxed text-muted-foreground space-y-2">{children}</div>
  </section>
);

export default SmsTerms;
