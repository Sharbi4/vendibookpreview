import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { 
  Shield, 
  AlertTriangle, 
  CreditCard, 
  Lock, 
  UserCheck, 
  Scale,
  Car,
  Package,
  UtensilsCrossed,
  ExternalLink,
  CheckCircle,
  HelpCircle,
  FileText,
  Building,
  Users,
  Briefcase
} from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const Insurance = () => {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      
      <main className="flex-1">
        {/* Hero Section */}
        <section className="bg-gradient-to-br from-primary/10 via-background to-secondary/10 py-16">
          <div className="container max-w-4xl">
            <div className="flex items-center gap-3 mb-4">
              <Shield className="h-10 w-10 text-primary" />
              <h1 className="text-4xl font-bold text-foreground">Insurance Information</h1>
            </div>
            <p className="text-xl text-muted-foreground mb-4">
              Understanding your insurance responsibilities when renting on Vendibook
            </p>
            <p className="text-sm text-muted-foreground">Last Updated: December 13, 2025</p>
          </div>
        </section>

        {/* Important Notice */}
        <section className="py-8 bg-destructive/5 border-y border-destructive/20">
          <div className="container max-w-4xl">
            <div className="flex gap-4 items-start">
              <AlertTriangle className="h-6 w-6 text-destructive flex-shrink-0 mt-1" />
              <div>
                <h2 className="font-semibold text-destructive mb-2">Important Notice</h2>
                <p className="text-muted-foreground">
                  Vendibook does not provide insurance coverage by default. Renters are responsible for 
                  obtaining any insurance required by the Host before completing a booking. Please review 
                  this page carefully to understand your insurance obligations.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Table of Contents */}
        <section className="py-8 border-b">
          <div className="container max-w-4xl">
            <h2 className="text-lg font-semibold mb-4">Contents</h2>
            <div className="flex flex-wrap gap-4">
              <a href="#overview" className="text-primary hover:underline">1. Overview</a>
              <a href="#policy" className="text-primary hover:underline">2. Vendibook Policy</a>
              <a href="#responsibility" className="text-primary hover:underline">3. Renter Responsibility</a>
              <a href="#options" className="text-primary hover:underline">4. Recommended Options</a>
              <a href="#host-requirements" className="text-primary hover:underline">5. Host Requirements</a>
              <a href="#faq" className="text-primary hover:underline">6. FAQ</a>
            </div>
          </div>
        </section>

        <div className="container max-w-4xl py-12 space-y-16">
          {/* Section 1: Overview */}
          <section id="overview">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
              <span className="bg-primary text-primary-foreground w-8 h-8 rounded-full flex items-center justify-center text-sm">1</span>
              Insurance Overview
            </h2>
            <div className="prose prose-gray max-w-none">
              <p className="text-muted-foreground mb-4">
                When renting equipment, food trucks, trailers, or other assets through Vendibook, it's important 
                to understand the insurance landscape. This page explains how insurance works on our platform 
                and what you need to know before booking.
              </p>
              <p className="text-muted-foreground mb-6">
                Insurance protects both renters and hosts from financial loss due to accidents, damage, theft, 
                or liability claims. The specific coverage needed depends on the type of equipment being rented 
                and how it will be used.
              </p>
              <Card className="bg-primary/5 border-primary/20">
                <CardContent className="pt-6">
                  <p className="font-medium text-foreground">
                    <strong>Key Point:</strong> Always verify your insurance coverage before operating any rented 
                    equipment. Lack of proper insurance could result in significant financial liability.
                  </p>
                </CardContent>
              </Card>
            </div>
          </section>

          {/* Section 2: Vendibook Policy */}
          <section id="policy">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
              <span className="bg-primary text-primary-foreground w-8 h-8 rounded-full flex items-center justify-center text-sm">2</span>
              Vendibook Insurance Policy
            </h2>
            
            <Card className="mb-6 border-destructive/30 bg-destructive/5">
              <CardHeader>
                <CardTitle className="text-destructive">Vendibook Does Not Provide Insurance</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Vendibook is a marketplace platform that connects equipment owners with renters. We do not 
                  provide, underwrite, or guarantee any insurance coverage for rentals conducted through our platform.
                </p>
              </CardContent>
            </Card>

            <h3 className="text-lg font-semibold mb-4">What This Means for You</h3>
            <ul className="space-y-2 mb-8">
              {[
                'Vendibook does not offer liability insurance for renters',
                'Vendibook does not offer damage protection plans',
                'Vendibook does not cover theft, accidents, or equipment malfunction',
                'Any insurance requirements are set by individual Hosts',
                'Renters must obtain their own coverage when required'
              ].map((item, index) => (
                <li key={index} className="flex items-start gap-2 text-muted-foreground">
                  <span className="text-destructive mt-1">•</span>
                  {item}
                </li>
              ))}
            </ul>

            <h3 className="text-lg font-semibold mb-4">Platform Protections</h3>
            <p className="text-muted-foreground mb-4">
              While we don't provide insurance, Vendibook does offer certain platform protections:
            </p>
            <div className="grid sm:grid-cols-2 gap-4">
              <Card>
                <CardContent className="pt-6 flex items-start gap-3">
                  <CreditCard className="h-5 w-5 text-primary flex-shrink-0" />
                  <div>
                    <h4 className="font-medium">Secure Payments</h4>
                    <p className="text-sm text-muted-foreground">All transactions via Stripe</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6 flex items-start gap-3">
                  <Lock className="h-5 w-5 text-primary flex-shrink-0" />
                  <div>
                    <h4 className="font-medium">Security Deposits</h4>
                    <p className="text-sm text-muted-foreground">Refundable deposits available</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6 flex items-start gap-3">
                  <Scale className="h-5 w-5 text-primary flex-shrink-0" />
                  <div>
                    <h4 className="font-medium">Dispute Resolution</h4>
                    <p className="text-sm text-muted-foreground">Mediation for booking disputes</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6 flex items-start gap-3">
                  <UserCheck className="h-5 w-5 text-primary flex-shrink-0" />
                  <div>
                    <h4 className="font-medium">Identity Verification</h4>
                    <p className="text-sm text-muted-foreground">Stripe Identity verification</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </section>

          {/* Section 3: Renter Responsibility */}
          <section id="responsibility">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
              <span className="bg-primary text-primary-foreground w-8 h-8 rounded-full flex items-center justify-center text-sm">3</span>
              Renter Responsibility
            </h2>
            
            <p className="text-muted-foreground mb-6">
              As a renter on Vendibook, you are responsible for ensuring you have appropriate insurance 
              coverage for any equipment you rent. This is especially important for:
            </p>

            <h3 className="text-lg font-semibold mb-4">Types of Coverage to Consider</h3>
            <div className="grid gap-4 mb-8">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <Shield className="h-8 w-8 text-primary flex-shrink-0" />
                    <div>
                      <h4 className="font-semibold mb-1">General Liability Insurance</h4>
                      <p className="text-sm text-muted-foreground">
                        Covers third-party bodily injury and property damage claims. Essential for food 
                        service operations and public events.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <Car className="h-8 w-8 text-primary flex-shrink-0" />
                    <div>
                      <h4 className="font-semibold mb-1">Commercial Auto Insurance</h4>
                      <p className="text-sm text-muted-foreground">
                        Required for operating food trucks and trailers on public roads. Your personal 
                        auto policy typically won't cover commercial use.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <Package className="h-8 w-8 text-primary flex-shrink-0" />
                    <div>
                      <h4 className="font-semibold mb-1">Equipment/Inland Marine Insurance</h4>
                      <p className="text-sm text-muted-foreground">
                        Covers damage to or theft of rented equipment. May be required by Hosts for 
                        high-value items.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <UtensilsCrossed className="h-8 w-8 text-primary flex-shrink-0" />
                    <div>
                      <h4 className="font-semibold mb-1">Product Liability Insurance</h4>
                      <p className="text-sm text-muted-foreground">
                        Covers claims arising from food products you sell. Critical for any food service operation.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <h3 className="text-lg font-semibold mb-4">Before You Book</h3>
            <div className="space-y-3">
              {[
                'Review the listing\'s insurance requirements carefully',
                'Contact your insurance provider to verify coverage',
                'Obtain any additional coverage needed before the rental period',
                'Keep proof of insurance readily available',
                'Understand what is and isn\'t covered by your policy'
              ].map((item, index) => (
                <div key={index} className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <p className="text-muted-foreground">{item}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Section 4: Recommended Options */}
          <section id="options">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
              <span className="bg-primary text-primary-foreground w-8 h-8 rounded-full flex items-center justify-center text-sm">4</span>
              Recommended Options
            </h2>

            <Card className="mb-6 border-2 border-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" />
                  FLIP Insurance
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">
                  FLIP (Food Liability Insurance Program) offers short-term liability insurance designed for 
                  food vendors, event professionals, and mobile business operators. Coverage can be purchased 
                  for single events or ongoing operations.
                </p>
                <Button variant="dark-shine" asChild>
                  <a 
                    href="https://www.fliprogram.com" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2"
                  >
                    Visit FLIP Website
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </Button>
              </CardContent>
            </Card>

            <Card className="bg-muted/50 border-muted mb-8">
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">
                  <strong>Important Disclaimer:</strong> Vendibook is not affiliated with, endorsed by, or partnered 
                  with FLIP or any other insurance provider. This recommendation is provided for informational 
                  purposes only. You must confirm eligibility, coverage terms, and pricing directly with FLIP 
                  or any insurance provider you choose. Vendibook makes no guarantees about the availability, 
                  suitability, or adequacy of any third-party insurance products.
                </p>
              </CardContent>
            </Card>

            <h3 className="text-lg font-semibold mb-4">Other Options to Explore</h3>
            <div className="grid sm:grid-cols-2 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <FileText className="h-5 w-5 text-primary flex-shrink-0" />
                    <div>
                      <h4 className="font-medium">Your Existing Insurance</h4>
                      <p className="text-sm text-muted-foreground">
                        Check if your current business or personal policies can be extended
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <Building className="h-5 w-5 text-primary flex-shrink-0" />
                    <div>
                      <h4 className="font-medium">Event Insurance Providers</h4>
                      <p className="text-sm text-muted-foreground">
                        Companies like Thimble, Next Insurance, or Hiscox offer short-term coverage
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <Briefcase className="h-5 w-5 text-primary flex-shrink-0" />
                    <div>
                      <h4 className="font-medium">Local Insurance Agents</h4>
                      <p className="text-sm text-muted-foreground">
                        A local agent can help find coverage tailored to your needs
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <Users className="h-5 w-5 text-primary flex-shrink-0" />
                    <div>
                      <h4 className="font-medium">Industry Associations</h4>
                      <p className="text-sm text-muted-foreground">
                        Food truck associations often offer group insurance programs
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </section>

          {/* Section 5: Host Requirements */}
          <section id="host-requirements">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
              <span className="bg-primary text-primary-foreground w-8 h-8 rounded-full flex items-center justify-center text-sm">5</span>
              Host Requirements
            </h2>

            <p className="text-muted-foreground mb-6">
              Individual Hosts on Vendibook may set their own insurance requirements for their listings. 
              These requirements will be clearly displayed on the listing page and must be met before 
              you can complete a booking.
            </p>

            <h3 className="text-lg font-semibold mb-4">Common Host Requirements</h3>
            <ul className="space-y-2 mb-8">
              {[
                { title: 'Proof of Business Insurance', desc: 'Certificate of insurance showing liability coverage' },
                { title: 'Additional Insured Endorsement', desc: 'Adding the Host as an additional insured on your policy' },
                { title: 'Minimum Coverage Amounts', desc: 'Specific dollar amounts for liability coverage' },
                { title: 'Commercial Auto Insurance', desc: 'For vehicle rentals' },
                { title: 'Workers\' Compensation', desc: 'If you have employees' }
              ].map((item, index) => (
                <li key={index} className="flex items-start gap-2 text-muted-foreground">
                  <span className="text-primary mt-1">•</span>
                  <span><strong>{item.title}:</strong> {item.desc}</span>
                </li>
              ))}
            </ul>

            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="pt-6">
                <p className="text-muted-foreground">
                  <strong>Tip:</strong> If you frequently rent equipment, consider getting a COI that can be 
                  easily updated with additional insured endorsements. This makes the booking process faster 
                  and smoother.
                </p>
              </CardContent>
            </Card>
          </section>

          {/* Section 6: FAQ */}
          <section id="faq">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
              <span className="bg-primary text-primary-foreground w-8 h-8 rounded-full flex items-center justify-center text-sm">6</span>
              Frequently Asked Questions
            </h2>

            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="item-1">
                <AccordionTrigger className="text-left">
                  <span className="flex items-center gap-2">
                    <HelpCircle className="h-4 w-4 text-primary flex-shrink-0" />
                    Does Vendibook provide any insurance coverage?
                  </span>
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  No. Vendibook is a marketplace platform and does not provide, underwrite, or guarantee 
                  any insurance coverage. Renters must obtain their own insurance when required by Hosts.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-2">
                <AccordionTrigger className="text-left">
                  <span className="flex items-center gap-2">
                    <HelpCircle className="h-4 w-4 text-primary flex-shrink-0" />
                    What happens if I damage rented equipment?
                  </span>
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  You are financially responsible for any damage to rented equipment. If you have appropriate 
                  insurance, you can file a claim with your provider. Security deposits may also be used to 
                  cover damage costs.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-3">
                <AccordionTrigger className="text-left">
                  <span className="flex items-center gap-2">
                    <HelpCircle className="h-4 w-4 text-primary flex-shrink-0" />
                    Can I book without insurance if the Host doesn't require it?
                  </span>
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  Yes, if a Host doesn't require insurance documentation, you can complete the booking. 
                  However, we strongly recommend having appropriate coverage regardless of Host requirements 
                  to protect yourself from potential liability.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-4">
                <AccordionTrigger className="text-left">
                  <span className="flex items-center gap-2">
                    <HelpCircle className="h-4 w-4 text-primary flex-shrink-0" />
                    How do I know what insurance a Host requires?
                  </span>
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  Insurance requirements are displayed on the listing detail page under the "Requirements" 
                  section. You'll also see them during checkout before completing your booking.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-5">
                <AccordionTrigger className="text-left">
                  <span className="flex items-center gap-2">
                    <HelpCircle className="h-4 w-4 text-primary flex-shrink-0" />
                    Is FLIP the only insurance option?
                  </span>
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  No. FLIP is one option we mention for informational purposes, but there are many insurance 
                  providers that offer coverage for food vendors and event professionals. We encourage you 
                  to shop around and find the coverage that best fits your needs and budget.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-6">
                <AccordionTrigger className="text-left">
                  <span className="flex items-center gap-2">
                    <HelpCircle className="h-4 w-4 text-primary flex-shrink-0" />
                    What if I have questions about insurance requirements?
                  </span>
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  You can message the Host directly through Vendibook to ask questions about their specific 
                  insurance requirements. For general insurance questions, we recommend consulting with a 
                  licensed insurance professional.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </section>

          {/* Still Have Questions */}
          <section className="text-center py-12 bg-muted/30 rounded-lg">
            <h2 className="text-2xl font-bold mb-4">Still Have Questions?</h2>
            <p className="text-muted-foreground mb-6">
              Contact us if you need clarification on insurance requirements or have concerns about coverage.
            </p>
            <Button variant="dark-shine" asChild>
              <Link to="/contact">Contact Support</Link>
            </Button>
          </section>

          {/* Back to Home */}
          <div className="text-center">
            <Link to="/" className="text-primary hover:underline">
              ← Back to Home
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Insurance;