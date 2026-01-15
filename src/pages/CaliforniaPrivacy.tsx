import { Link } from 'react-router-dom';
import { useEffect } from 'react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import SEO from '@/components/SEO';
import { ArrowLeft, Mail, Shield, Eye, Trash2, Ban, Scale, PenLine, Lock } from 'lucide-react';

const CaliforniaPrivacy = () => {
  // Inject JSON-LD structured data
  useEffect(() => {
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.id = 'california-privacy-jsonld';
    script.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "WebPage",
      "name": "California Privacy Notice | Vendibook",
      "description": "Learn about your privacy rights under CCPA and CPRA as a California resident using Vendibook.",
      "url": "https://vendibook.com/california-privacy",
      "publisher": {
        "@type": "Organization",
        "name": "Vendibook",
        "url": "https://vendibook.com"
      }
    });
    document.head.appendChild(script);
    return () => {
      const existingScript = document.getElementById('california-privacy-jsonld');
      if (existingScript) existingScript.remove();
    };
  }, []);

  return (
    <>
      <SEO
        title="California Privacy Notice | Vendibook"
        description="Learn about your CCPA and CPRA privacy rights as a California resident. Understand how Vendibook collects, uses, and protects your personal information."
        canonical="/california-privacy"
        type="article"
      />
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        
        <main className="flex-1">
          {/* Hero Section */}
          <section className="bg-gradient-to-br from-primary/10 via-background to-secondary/10 py-16">
            <div className="container">
              <Link 
                to="/" 
                className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Home
              </Link>
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-primary/10 rounded-xl">
                  <Shield className="h-8 w-8 text-primary" />
                </div>
                <h1 className="text-4xl md:text-5xl font-bold text-foreground">
                  California Privacy Notice
                </h1>
              </div>
              <p className="text-xl text-muted-foreground max-w-3xl">
                Under the California Consumer Privacy Act (CCPA) and California Privacy Rights Act (CPRA), 
                California residents have specific rights regarding their personal information.
              </p>
            </div>
          </section>

          {/* Content */}
          <section className="py-12">
            <div className="container max-w-4xl">
              {/* Information We Collect */}
              <div className="mb-12">
                <h2 className="text-2xl font-bold text-foreground mb-6 flex items-center gap-2">
                  <Eye className="h-6 w-6 text-primary" />
                  Information We Collect
                </h2>
                <p className="text-muted-foreground mb-4">
                  We may collect the following categories of personal information:
                </p>
                <ul className="space-y-3">
                  <li className="flex items-start gap-3 p-4 bg-muted/50 rounded-lg">
                    <span className="font-semibold text-foreground min-w-[180px]">Identifiers:</span>
                    <span className="text-muted-foreground">Name, email address, phone number, IP address, and device identifiers</span>
                  </li>
                  <li className="flex items-start gap-3 p-4 bg-muted/50 rounded-lg">
                    <span className="font-semibold text-foreground min-w-[180px]">Commercial Information:</span>
                    <span className="text-muted-foreground">Bookings, transactions, payment information, and listing details</span>
                  </li>
                  <li className="flex items-start gap-3 p-4 bg-muted/50 rounded-lg">
                    <span className="font-semibold text-foreground min-w-[180px]">Internet Activity:</span>
                    <span className="text-muted-foreground">Browsing history, search history, and interaction with our platform</span>
                  </li>
                  <li className="flex items-start gap-3 p-4 bg-muted/50 rounded-lg">
                    <span className="font-semibold text-foreground min-w-[180px]">Business Profile Data:</span>
                    <span className="text-muted-foreground">Information about listings you create, messages, and reviews</span>
                  </li>
                </ul>
              </div>

              {/* How We Use Information */}
              <div className="mb-12">
                <h2 className="text-2xl font-bold text-foreground mb-6">How We Use Information</h2>
                <p className="text-muted-foreground mb-4">We use your personal information to:</p>
                <ul className="space-y-2 text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 bg-primary rounded-full" />
                    Operate user accounts and manage listings
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 bg-primary rounded-full" />
                    Process bookings and secure payments
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 bg-primary rounded-full" />
                    Provide customer support and respond to inquiries
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 bg-primary rounded-full" />
                    Improve and secure the platform
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 bg-primary rounded-full" />
                    Comply with legal obligations and prevent fraud
                  </li>
                </ul>
              </div>

              {/* Selling or Sharing */}
              <div className="mb-12 p-6 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-xl">
                <h2 className="text-2xl font-bold text-foreground mb-4">Selling or Sharing Personal Information</h2>
                <p className="text-foreground font-semibold mb-3">Vendibook does not sell personal information.</p>
                <p className="text-muted-foreground">
                  We may share limited data with service providers (such as payment processors, email services, 
                  and analytics providers) strictly to operate the platform. These parties are contractually 
                  obligated to protect your information and use it only for the purposes we specify.
                </p>
              </div>

              {/* Your Rights */}
              <div className="mb-12">
                <h2 className="text-2xl font-bold text-foreground mb-6">Your Rights</h2>
                <p className="text-muted-foreground mb-6">California residents have the right to:</p>
                
                <div className="grid gap-4">
                  <div className="p-5 border border-border rounded-xl bg-card">
                    <div className="flex items-center gap-3 mb-2">
                      <Eye className="h-5 w-5 text-primary" />
                      <h3 className="font-semibold text-foreground">Right to Know</h3>
                    </div>
                    <p className="text-muted-foreground text-sm">
                      Request disclosure of what personal information we collect, use, disclose, and sell (if applicable).
                    </p>
                  </div>

                  <div className="p-5 border border-border rounded-xl bg-card">
                    <div className="flex items-center gap-3 mb-2">
                      <Trash2 className="h-5 w-5 text-primary" />
                      <h3 className="font-semibold text-foreground">Right to Delete</h3>
                    </div>
                    <p className="text-muted-foreground text-sm">
                      Request deletion of personal information we have collected about you.
                    </p>
                  </div>

                  <div className="p-5 border border-border rounded-xl bg-card">
                    <div className="flex items-center gap-3 mb-2">
                      <Ban className="h-5 w-5 text-primary" />
                      <h3 className="font-semibold text-foreground">Right to Opt-Out</h3>
                    </div>
                    <p className="text-muted-foreground text-sm">
                      Opt out of the sale or sharing of personal information (though we do not sell data).
                    </p>
                  </div>

                  <div className="p-5 border border-border rounded-xl bg-card">
                    <div className="flex items-center gap-3 mb-2">
                      <Scale className="h-5 w-5 text-primary" />
                      <h3 className="font-semibold text-foreground">Right to Non-Discrimination</h3>
                    </div>
                    <p className="text-muted-foreground text-sm">
                      We will not discriminate against you for exercising your privacy rights.
                    </p>
                  </div>

                  <div className="p-5 border border-border rounded-xl bg-card">
                    <div className="flex items-center gap-3 mb-2">
                      <PenLine className="h-5 w-5 text-primary" />
                      <h3 className="font-semibold text-foreground">Right to Correct</h3>
                    </div>
                    <p className="text-muted-foreground text-sm">
                      Request correction of inaccurate personal information.
                    </p>
                  </div>

                  <div className="p-5 border border-border rounded-xl bg-card">
                    <div className="flex items-center gap-3 mb-2">
                      <Lock className="h-5 w-5 text-primary" />
                      <h3 className="font-semibold text-foreground">Right to Limit Use</h3>
                    </div>
                    <p className="text-muted-foreground text-sm">
                      Limit the use and disclosure of sensitive personal information.
                    </p>
                  </div>
                </div>
              </div>

              {/* How to Submit a Request */}
              <div className="mb-12">
                <h2 className="text-2xl font-bold text-foreground mb-6 flex items-center gap-2">
                  <Mail className="h-6 w-6 text-primary" />
                  How to Submit a Request
                </h2>
                <p className="text-muted-foreground mb-4">To exercise your CCPA/CPRA rights, please contact us:</p>
                
                <div className="p-6 bg-muted/50 rounded-xl mb-6">
                  <p className="mb-2">
                    <span className="font-semibold text-foreground">Email: </span>
                    <a href="mailto:privacy@vendibook.com" className="text-primary hover:underline">
                      privacy@vendibook.com
                    </a>
                  </p>
                  <p className="text-muted-foreground">Subject line: California Privacy Request</p>
                </div>

                <p className="text-muted-foreground mb-3">Please include:</p>
                <ul className="space-y-2 text-muted-foreground mb-6">
                  <li className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 bg-primary rounded-full" />
                    Your full name
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 bg-primary rounded-full" />
                    Email associated with your account
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 bg-primary rounded-full" />
                    Type of request (access, deletion, correction, etc.)
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 bg-primary rounded-full" />
                    Any additional details to help us verify your identity
                  </li>
                </ul>

                <p className="text-muted-foreground">
                  We will verify your request and respond within the time required by California law (typically 45 days).
                </p>
              </div>

              {/* Authorized Agent */}
              <div className="mb-12">
                <h2 className="text-2xl font-bold text-foreground mb-4">Authorized Agent</h2>
                <p className="text-muted-foreground">
                  You may designate an authorized agent to make a request on your behalf. The authorized agent 
                  must provide proof of authorization and we may require you to verify your identity directly with us.
                </p>
              </div>

              {/* Data Rights Request Template */}
              <div className="mb-12 p-6 bg-primary/5 border border-primary/20 rounded-xl">
                <h2 className="text-xl font-bold text-foreground mb-4">Data Rights Request Template</h2>
                <p className="text-muted-foreground mb-3">
                  To exercise your GDPR or CCPA rights, please email{' '}
                  <a href="mailto:privacy@vendibook.com" className="text-primary hover:underline">
                    privacy@vendibook.com
                  </a>
                  {' '}with:
                </p>
                <ul className="space-y-2 text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 bg-primary rounded-full" />
                    Your full name
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 bg-primary rounded-full" />
                    Email associated with your account
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 bg-primary rounded-full" />
                    Type of request (access, deletion, correction, portability)
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 bg-primary rounded-full" />
                    Specific information you're inquiring about (if applicable)
                  </li>
                </ul>
              </div>

              {/* Questions */}
              <div className="p-6 bg-muted rounded-xl text-center">
                <h2 className="text-xl font-bold text-foreground mb-3">Questions?</h2>
                <p className="text-muted-foreground">
                  If you have questions about this notice or our privacy practices, please contact us at{' '}
                  <a href="mailto:support@vendibook.com" className="text-primary hover:underline">
                    support@vendibook.com
                  </a>
                </p>
              </div>
            </div>
          </section>
        </main>

        <Footer />
      </div>
    </>
  );
};

export default CaliforniaPrivacy;
