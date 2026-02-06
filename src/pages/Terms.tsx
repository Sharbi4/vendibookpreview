import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';

const Terms = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1 py-12">
        <div className="container max-w-4xl">
          <h1 className="text-4xl font-bold mb-8">Terms of Service</h1>
          <p className="text-muted-foreground mb-8">Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>

          <div className="prose prose-gray max-w-none space-y-8">
            <section>
              <h2 className="text-2xl font-semibold mb-4">1. Acceptance of Terms</h2>
              <p className="text-muted-foreground leading-relaxed">
                By accessing or using Vendibook ("the Platform"), you agree to be bound by these Terms of Service ("Terms"). 
                If you do not agree to these Terms, you may not access or use the Platform. These Terms apply to all users, 
                including hosts who list assets and shoppers who book them.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">2. Description of Service</h2>
              <p className="text-muted-foreground leading-relaxed">
                Vendibook is an online marketplace that connects hosts who have mobile food business assets (food trucks, 
                food trailers, shared kitchens, Vendor Spaces) with shoppers seeking to rent or purchase such assets. 
                Vendibook facilitates these transactions but is not a party to any rental or sale agreement between hosts and shoppers.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">3. User Accounts</h2>
              <div className="space-y-4 text-muted-foreground leading-relaxed">
                <p>
                  <strong className="text-foreground">3.1 Registration:</strong> You must create an account to use certain features of the Platform. 
                  You agree to provide accurate, current, and complete information during registration.
                </p>
                <p>
                  <strong className="text-foreground">3.2 Account Security:</strong> You are responsible for maintaining the confidentiality of your 
                  account credentials and for all activities that occur under your account.
                </p>
                <p>
                  <strong className="text-foreground">3.3 Age Requirement:</strong> You must be at least 18 years old to create an account and use the Platform.
                </p>
                <p>
                  <strong className="text-foreground">3.4 Account Termination:</strong> We reserve the right to suspend or terminate your account at any time 
                  for violations of these Terms or for any other reason at our sole discretion.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">4. Host Responsibilities</h2>
              <div className="space-y-4 text-muted-foreground leading-relaxed">
                <p>
                  <strong className="text-foreground">4.1 Listing Accuracy:</strong> Hosts must provide accurate and complete information about their assets, 
                  including descriptions, photos, availability, pricing, and any applicable terms or restrictions.
                </p>
                <p>
                  <strong className="text-foreground">4.2 Legal Compliance:</strong> Hosts are responsible for ensuring their listings comply with all applicable 
                  laws, regulations, permits, and licenses required for food service operations.
                </p>
                <p>
                  <strong className="text-foreground">4.3 Asset Condition:</strong> Hosts must ensure their assets are safe, clean, and in good working condition 
                  as described in their listings.
                </p>
                <p>
                  <strong className="text-foreground">4.4 Communication:</strong> Hosts must respond to booking requests and inquiries in a timely manner.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">5. Shopper Responsibilities</h2>
              <div className="space-y-4 text-muted-foreground leading-relaxed">
                <p>
                  <strong className="text-foreground">5.1 Proper Use:</strong> Shoppers must use rented assets responsibly and in accordance with the 
                  host's instructions and any applicable laws.
                </p>
                <p>
                  <strong className="text-foreground">5.2 Return Condition:</strong> Shoppers must return rented assets in the same condition as received, 
                  normal wear and tear excepted.
                </p>
                <p>
                  <strong className="text-foreground">5.3 Damage Responsibility:</strong> Shoppers are responsible for any damage to assets that occurs 
                  during the rental period beyond normal wear and tear.
                </p>
                <p>
                  <strong className="text-foreground">5.4 Compliance:</strong> Shoppers must comply with all applicable food safety regulations, permits, 
                  and licenses required for their intended use.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">6. Payments and Fees</h2>
              <div className="space-y-4 text-muted-foreground leading-relaxed">
                <p>
                  <strong className="text-foreground">6.1 Service Fees:</strong> Vendibook charges service fees for facilitating transactions. 
                  These fees will be clearly disclosed before any booking is confirmed.
                </p>
                <p>
                  <strong className="text-foreground">6.2 Payment Processing:</strong> All payments are processed through our third-party payment processor. 
                  By using the Platform, you agree to their terms of service.
                </p>
                <p>
                  <strong className="text-foreground">6.3 Cancellations and Refunds:</strong> Cancellation and refund policies are set by individual hosts 
                  and will be displayed on each listing. Vendibook's service fees may be non-refundable.
                </p>
                <p>
                  <strong className="text-foreground">6.4 Taxes:</strong> Users are responsible for determining and paying any applicable taxes related 
                  to their transactions on the Platform.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">7. Prohibited Activities</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">You agree not to:</p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li>Violate any applicable laws or regulations</li>
                <li>Post false, misleading, or fraudulent content</li>
                <li>Infringe on the intellectual property rights of others</li>
                <li>Harass, abuse, or harm other users</li>
                <li>Circumvent the Platform's payment system</li>
                <li>Use the Platform for any illegal purpose</li>
                <li>Attempt to gain unauthorized access to the Platform or other users' accounts</li>
                <li>Interfere with the proper functioning of the Platform</li>
                <li>Collect or store personal data about other users without their consent</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">8. Intellectual Property</h2>
              <p className="text-muted-foreground leading-relaxed">
                The Platform and its original content, features, and functionality are owned by Vendibook and are protected 
                by international copyright, trademark, and other intellectual property laws. Users retain ownership of content 
                they submit but grant Vendibook a license to use, display, and distribute such content on the Platform.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">9. Disclaimer of Warranties</h2>
              <p className="text-muted-foreground leading-relaxed">
                THE PLATFORM IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED. 
                VENDIBOOK DOES NOT GUARANTEE THE ACCURACY, COMPLETENESS, OR RELIABILITY OF ANY CONTENT ON THE PLATFORM. 
                WE DO NOT WARRANT THAT THE PLATFORM WILL BE UNINTERRUPTED, SECURE, OR ERROR-FREE.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">10. Limitation of Liability</h2>
              <p className="text-muted-foreground leading-relaxed">
                TO THE MAXIMUM EXTENT PERMITTED BY LAW, VENDIBOOK SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, 
                CONSEQUENTIAL, OR PUNITIVE DAMAGES ARISING FROM YOUR USE OF THE PLATFORM OR ANY TRANSACTIONS FACILITATED THROUGH IT. 
                VENDIBOOK IS NOT RESPONSIBLE FOR THE ACTIONS, CONTENT, OR CONDITION OF ASSETS PROVIDED BY HOSTS.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">11. Indemnification</h2>
              <p className="text-muted-foreground leading-relaxed">
                You agree to indemnify and hold harmless Vendibook, its officers, directors, employees, and agents from any claims, 
                damages, losses, or expenses arising from your use of the Platform, your violation of these Terms, or your violation 
                of any rights of a third party.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">12. Dispute Resolution</h2>
              <div className="space-y-4 text-muted-foreground leading-relaxed">
                <p>
                  <strong className="text-foreground">12.1 Between Users:</strong> Disputes between hosts and shoppers should first be resolved 
                  directly between the parties. Vendibook may offer mediation services but is not obligated to do so.
                </p>
                <p>
                  <strong className="text-foreground">12.2 With Vendibook:</strong> Any disputes with Vendibook shall be resolved through binding 
                  arbitration in accordance with applicable arbitration rules, except where prohibited by law.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">13. Changes to Terms</h2>
              <p className="text-muted-foreground leading-relaxed">
                We reserve the right to modify these Terms at any time. We will notify users of material changes by posting the 
                updated Terms on the Platform. Your continued use of the Platform after such changes constitutes acceptance of 
                the modified Terms.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">14. Governing Law</h2>
              <p className="text-muted-foreground leading-relaxed">
                These Terms shall be governed by and construed in accordance with the laws of the jurisdiction in which 
                Vendibook operates, without regard to its conflict of law provisions.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">15. Contact Us</h2>
              <p className="text-muted-foreground leading-relaxed">
                If you have any questions about these Terms of Service, please contact us at:
              </p>
              <p className="text-muted-foreground mt-2">
                Email: legal@vendibook.com
              </p>
            </section>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Terms;
