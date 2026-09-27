import { Link } from 'react-router-dom';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import SEO from '@/components/SEO';
import { Shield, Cookie, Eye, Lock, Mail, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';

const Privacy = () => {
  const openCookieSettings = () => {
    localStorage.removeItem('cookie-consent');
    window.location.reload();
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SEO
        title="Privacy Policy"
        description="How Vendibook collects, uses, and protects your personal information across our food truck and shared kitchen marketplace."
        canonical="/privacy"
      />
      <Header />
      
      <main className="flex-1 container py-12 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
            <Shield className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Privacy Policy
          </h1>
          <p className="text-muted-foreground">
            Last updated: January 11, 2026
          </p>
        </div>

        {/* Content */}
        <div className="prose prose-gray dark:prose-invert max-w-none space-y-8">
          {/* Introduction */}
          <section>
            <h2 className="text-xl font-semibold text-foreground flex items-center gap-2 mb-4">
              <Eye className="h-5 w-5 text-primary" />
              Introduction
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              Welcome to Vendibook ("we," "our," or "us"). We are committed to protecting your personal information 
              and your right to privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard 
              your information when you visit our website and use our services.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              Please read this privacy policy carefully. If you do not agree with the terms of this privacy policy, 
              please do not access the site.
            </p>
          </section>

          {/* Information We Collect */}
          <section>
            <h2 className="text-xl font-semibold text-foreground flex items-center gap-2 mb-4">
              <Lock className="h-5 w-5 text-primary" />
              Information We Collect
            </h2>
            
            <h3 className="text-lg font-medium text-foreground mt-6 mb-3">Personal Information</h3>
            <p className="text-muted-foreground leading-relaxed mb-4">
              We collect personal information that you voluntarily provide to us when you register on the website, 
              express an interest in obtaining information about us or our products and services, or otherwise 
              contact us.
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li>Name and contact information (email address, phone number)</li>
              <li>Account credentials (username and password)</li>
              <li>Payment information (processed securely through PayPal)</li>
              <li>Profile information (avatar, bio, preferences)</li>
              <li>Business information for hosts (business name, tax ID)</li>
              <li>Identity verification documents (processed through Vendibook identity verification)</li>
            </ul>

            <h3 className="text-lg font-medium text-foreground mt-6 mb-3">Automatically Collected Information</h3>
            <p className="text-muted-foreground leading-relaxed mb-4">
              We automatically collect certain information when you visit, use, or navigate the website:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li>Device and browser information</li>
              <li>IP address and location data</li>
              <li>Usage patterns and preferences</li>
              <li>Cookies and similar tracking technologies</li>
            </ul>
          </section>

          {/* Cookie Policy */}
          <section className="bg-muted/50 rounded-xl p-6">
            <h2 className="text-xl font-semibold text-foreground flex items-center gap-2 mb-4">
              <Cookie className="h-5 w-5 text-primary" />
              Cookie Policy
            </h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              We use cookies and similar tracking technologies to access or store information. 
              You can manage your cookie preferences at any time.
            </p>

            <h3 className="text-lg font-medium text-foreground mt-6 mb-3">Types of Cookies We Use</h3>
            
            <div className="space-y-4">
              <div className="bg-background rounded-lg p-4 border border-border">
                <h4 className="font-medium text-foreground mb-1">Necessary Cookies</h4>
                <p className="text-sm text-muted-foreground">
                  Essential for the website to function properly. These cannot be disabled as they are 
                  required for basic site functionality, security, and session management.
                </p>
              </div>

              <div className="bg-background rounded-lg p-4 border border-border">
                <h4 className="font-medium text-foreground mb-1">Analytics Cookies</h4>
                <p className="text-sm text-muted-foreground">
                  Help us understand how visitors interact with our website by collecting and reporting 
                  information anonymously. This helps us improve our services.
                </p>
              </div>

              <div className="bg-background rounded-lg p-4 border border-border">
                <h4 className="font-medium text-foreground mb-1">Marketing Cookies</h4>
                <p className="text-sm text-muted-foreground">
                  Used to track visitors across websites to display relevant advertisements. 
                  These are only set with your explicit consent.
                </p>
              </div>

              <div className="bg-background rounded-lg p-4 border border-border">
                <h4 className="font-medium text-foreground mb-1">Functional Cookies</h4>
                <p className="text-sm text-muted-foreground">
                  Enable enhanced functionality and personalization, such as remembering your preferences 
                  and settings for a better experience.
                </p>
              </div>
            </div>

            <Button 
              variant="outline" 
              onClick={openCookieSettings}
              className="mt-6"
            >
              <Settings className="h-4 w-4 mr-2" />
              Manage Cookie Preferences
            </Button>
          </section>

          {/* How We Use Your Information */}
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">How We Use Your Information</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              We use the information we collect for various purposes, including:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li>To facilitate account creation and login processes</li>
              <li>To process transactions and send related information</li>
              <li>To send administrative information and service updates</li>
              <li>To respond to inquiries and provide customer support</li>
              <li>To send promotional communications (with your consent)</li>
              <li>To enforce our terms, policies, and conditions</li>
              <li>To protect against fraud and maintain platform security</li>
              <li>To comply with legal obligations</li>
            </ul>
          </section>

          {/* Data Sharing */}
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">Information Sharing</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              We may share your information in the following situations:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li><strong>With Service Providers:</strong> Third-party vendors who perform services on our behalf (payment processing, hosting, analytics)</li>
              <li><strong>With Other Users:</strong> Limited profile information visible to facilitate transactions</li>
              <li><strong>For Legal Purposes:</strong> When required by law or to protect our rights</li>
              <li><strong>Business Transfers:</strong> In connection with mergers, acquisitions, or sale of assets</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-4">
              We do not sell your personal information to third parties.
            </p>
          </section>

          {/* Data Security */}
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">Data Security</h2>
            <p className="text-muted-foreground leading-relaxed">
              We implement appropriate technical and organizational security measures designed to protect 
              your personal information. However, no electronic transmission over the internet or information 
              storage technology can be guaranteed to be 100% secure. We use industry-standard encryption, 
              secure servers, and regular security assessments to protect your data.
            </p>
          </section>

          {/* Your Rights */}
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">Your Privacy Rights</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Depending on your location, you may have certain rights regarding your personal information:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li><strong>Access:</strong> Request a copy of the personal information we hold about you</li>
              <li><strong>Correction:</strong> Request correction of inaccurate personal information</li>
              <li><strong>Deletion:</strong> Request deletion of your personal information</li>
              <li><strong>Portability:</strong> Request transfer of your data to another service</li>
              <li><strong>Withdraw Consent:</strong> Withdraw consent for processing activities based on consent</li>
              <li><strong>Opt-out:</strong> Opt-out of marketing communications at any time</li>
            </ul>
          </section>

          {/* Service providers */}
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">Service Providers We Share Data With</h2>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li>
                <strong>PayPal</strong> — payment processing, fraud prevention, and dispute resolution. To process a
                payment and defend a dispute we pass buyer contact details and item-level order data to PayPal. PayPal
                handles that data under its own privacy statement.
              </li>
              <li>
                <strong>Our real-time video infrastructure provider</strong> — hosts the live walkthrough room. Audio and
                video pass through that provider while a call is running.
              </li>
              <li><strong>Cloud hosting and database provider</strong> — stores the platform and its data.</li>
              <li><strong>Email delivery provider</strong> — sends account, transaction, and notification email.</li>
              <li><strong>Analytics providers</strong> — measure how pages and features are used.</li>
            </ul>
          </section>

          {/* Feature-specific data categories */}
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">Location, Media, and Consent Records</h2>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li>
                <strong>Location data</strong> — collected only when someone starts an active delivery or confirms an
                in-person pickup or handoff. Purpose: showing the buyer where their delivery is and recording delivery
                evidence. Seen by: that order's buyer, seller, assigned driver, and authorised administrators. Retention:
                live position is not kept after the delivery closes; sparse checkpoints are kept with the transaction
                record. See the <Link to="/legal/location-tracking" className="underline">Location and Delivery Tracking
                Disclosure</Link>.
              </li>
              <li>
                <strong>Walkthrough and handoff media</strong> — photos and video captured in a walkthrough or at a
                handoff. Purpose: transaction evidence, dispute support, and fraud investigation. Seen by: the
                participants, authorised support, and where a dispute is opened, PayPal and any party legally entitled to
                it. Retention: kept with the transaction, and longer where a dispute, claim, or legal hold is open. See the{' '}
                <Link to="/legal/handoff-terms" className="underline">Verified Handoff Terms</Link>.
              </li>
              <li>
                <strong>Consent records</strong> — which document you accepted, its version, when, from what page, and
                which device permissions were granted at that moment. Purpose: proving what you agreed to. Retention: kept
                for as long as the account exists, and as required by law. These records are append-only.
              </li>
            </ul>
          </section>

          {/* Payment logging */}
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">Payment API Logging</h2>
            <p className="text-muted-foreground leading-relaxed">
              We log payment API requests and responses for a limited period so we can debug failures and support
              disputes. We do not log card numbers or full payment credentials. Card fields at checkout are rendered and
              processed by PayPal and never reach Vendibook LC's systems.
            </p>
          </section>

          {/* Data rights */}
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">Exercising Your Data Rights</h2>
            <p className="text-muted-foreground leading-relaxed">
              To access, correct, delete, or receive a copy of your data, email support@vendibook.com from the address on
              your account, or call (725) 755-9598, Monday to Friday, 9am to 5pm Arizona time. We verify that the request
              comes from you before we act on it, and we respond within the period required by the law that applies to
              you. Vendibook does not sell or share personal information for cross-context behavioural advertising. Some
              data must be retained after a deletion request where we need it for a transaction record, a tax obligation,
              a dispute, or a legal hold.
            </p>
          </section>

          {/* Contact */}
          <section className="bg-primary/5 rounded-xl p-6 border border-primary/20">
            <h2 className="text-xl font-semibold text-foreground flex items-center gap-2 mb-4">
              <Mail className="h-5 w-5 text-primary" />
              Contact Us
            </h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              If you have questions or comments about this privacy policy, or if you would like to exercise 
              your privacy rights, please contact us at:
            </p>
            <div className="text-foreground">
              <p className="font-medium">Vendibook Privacy Team</p>
              <p className="text-muted-foreground">Email: privacy@vendibook.com</p>
              <p className="text-muted-foreground">Address: Phoenix, Arizona, USA</p>
            </div>
          </section>

          {/* Updates */}
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">Updates to This Policy</h2>
            <p className="text-muted-foreground leading-relaxed">
              We may update this privacy policy from time to time. The updated version will be indicated 
              by an updated "Last updated" date and will be effective as soon as it is accessible. 
              We encourage you to review this privacy policy frequently to be informed of how we are 
              protecting your information.
            </p>
          </section>

          <section id="sms-and-mobile-messaging">
            <h2 className="text-2xl font-semibold text-foreground mt-8 mb-3">SMS and Mobile Messaging</h2>
            <div className="text-muted-foreground leading-relaxed space-y-3 text-sm">
              <p>
                Vendibook offers an optional transactional SMS program covering account,
                booking, payment, required-document, listing, pickup or delivery, and
                customer-support communications. You can review the full program in the{' '}
                <Link to="/legal/sms" className="underline">Vendibook SMS Terms and Consent Policy</Link>.
              </p>
              <p>
                We collect a mobile number only when you provide it (during signup, in
                notification settings, at checkout, on a listing flow, or on the{' '}
                <Link to="/sms" className="underline">/sms enrollment page</Link>). We use
                it solely to deliver the transactional SMS categories described above and
                to record your consent state. We record consent through an affirmative
                action, along with a timestamp, source, disclosure version, and — when
                available — IP address and user agent, so we can produce evidence of
                consent when required.
              </p>
              <p>
                Opting out of SMS does not delete your Vendibook account. We never sell
                SMS opt-in information. We never transfer SMS opt-in information to
                unrelated third parties. Service providers (for example our messaging
                carrier) process messages only to deliver the service. You can opt out at
                any time by replying <strong>STOP</strong> to any Vendibook SMS, by
                disabling SMS in notification settings, or by emailing{' '}
                <a className="underline" href="mailto:support@vendibook.com">support@vendibook.com</a>.
              </p>
              <p>
                <strong>
                  All the above categories exclude text messaging originator opt-in data and consent;
                  this information won&apos;t be shared with any third parties.
                </strong>
              </p>
            </div>
          </section>
        </div>

        {/* Back to Home */}
        <div className="mt-12 text-center">
          <Button asChild variant="outline">
            <Link to="/">Back to Home</Link>
          </Button>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Privacy;
