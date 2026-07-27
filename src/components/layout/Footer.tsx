import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { ChevronDown, Facebook, Instagram, Twitter, Linkedin } from 'lucide-react';
import vendibookFavicon from '@/assets/vendibook-favicon.png';
import { StripeLogo } from '@/components/ui/StripeLogo';
import { cn } from '@/lib/utils';
import { trackFooterCitiesClicked } from '@/lib/analytics';

interface FooterSection {
  title: string;
  links: { label: string; href: string; external?: boolean }[];
}

const footerSections: FooterSection[] = [
  {
    title: 'Vendibook',
    links: [
      { label: 'What Is Vendibook?', href: '/what-is-vendibook' },
      { label: 'Why List on Vendibook?', href: '/why-list-on-vendibook' },
      { label: 'How Vendibook Works', href: '/how-it-works' },
      { label: 'Best Places to Sell a Food Truck', href: '/best-place-to-sell-a-food-truck' },
      { label: 'Mobile Food Marketplace Glossary', href: '/resources/mobile-food-marketplace-glossary' },
      { label: 'Food Truck Selling FAQ', href: '/resources/food-truck-selling-faq' },
      { label: 'Help Center', href: '/help' },
      { label: 'Contact Us', href: '/contact' },
      { label: 'Blog', href: '/blog' },
    ],
  },
  {
    title: 'Marketplace',
    links: [
      { label: 'Food Trucks for Sale', href: '/food-trucks-for-sale' },
      { label: 'Food Trailers for Sale', href: '/food-trailers-for-sale' },
      { label: 'Food Trucks for Rent', href: '/food-trucks-for-rent' },
      { label: 'Shared Kitchens', href: '/shared-kitchens' },
      { label: 'Browse by City', href: '/cities' },
      { label: 'All Listings', href: '/search' },
    ],
  },
  {
    title: 'Sell on Vendibook',
    links: [
      { label: 'List Food Truck for Sale', href: '/list-food-truck-for-sale' },
      { label: 'Rent Out My Food Truck', href: '/rent-out-my-food-truck' },
      { label: 'Sell a Food Truck', href: '/sell-food-truck' },
      { label: 'Sell a Food Trailer', href: '/sell-food-trailer' },
      { label: 'Sell a Concession Trailer', href: '/sell-concession-trailer' },
      { label: 'Rent My Kitchen', href: '/rent-my-commercial-kitchen' },
      { label: 'Pricing & Plans', href: '/pricing' },
      { label: 'Payment Options', href: '/payments' },
      { label: 'Insurance Info', href: '/insurance' },
      { label: 'Refer & Earn', href: '/referral' },
    ],
  },
  {
    title: 'By State',
    links: [
      { label: 'Arizona Food Trucks', href: '/food-trucks-for-sale/arizona' },
      { label: 'Texas Food Trucks', href: '/food-trucks-for-sale/texas' },
      { label: 'Florida Food Trucks', href: '/food-trucks-for-sale/florida' },
      { label: 'Georgia Food Trucks', href: '/food-trucks-for-sale/georgia' },
      { label: 'North Carolina', href: '/food-trucks-for-sale/north-carolina' },
      { label: 'California', href: '/food-trucks-for-sale/california' },
    ],
  },
  {
    title: 'Host Tools',
    links: [
      { label: 'All Tools', href: '/tools' },
      { label: 'Startup Guide', href: '/tools/startup-guide' },
      { label: 'Price Pilot', href: '/tools/pricepilot' },
      { label: 'Listing Studio', href: '/tools/listing-studio' },
      { label: 'Permit Path', href: '/tools/permitpath' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Terms of Service', href: '/terms' },
      { label: 'Privacy Policy', href: '/privacy' },
      { label: 'California Privacy', href: '/california-privacy' },
      { label: 'Do Not Sell My Info', href: '/california-privacy#do-not-sell' },
      { label: 'Text message preferences', href: '/sms-opt-in' },
      { label: 'SMS Terms', href: '/legal/sms' },
    ],
  },
];

const socialLinks = [
  { icon: Facebook, href: 'https://www.facebook.com/people/Vendibook/61575463393177/', label: 'Facebook' },
  { icon: Instagram, href: 'https://instagram.com/vendibook', label: 'Instagram' },
  { icon: Twitter, href: 'https://twitter.com/vendibook', label: 'Twitter' },
  { icon: Linkedin, href: 'https://linkedin.com/company/vendibook', label: 'LinkedIn' },
];

const FooterAccordion = ({ section }: { section: FooterSection }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border-b border-border/50 md:border-none">
      <button
        className="flex w-full items-center justify-between py-4 md:hidden"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
      >
        <span className="font-semibold text-foreground">{section.title}</span>
        <ChevronDown
          className={cn(
            'h-4 w-4 text-muted-foreground transition-transform',
            isOpen && 'rotate-180'
          )}
        />
      </button>
      <h4 className="hidden md:block font-semibold mb-4 text-foreground">
        {section.title}
      </h4>
      <ul
        className={cn(
          'space-y-2 text-sm text-muted-foreground overflow-hidden transition-all',
          'md:block md:max-h-none md:pb-0',
          isOpen ? 'max-h-96 pb-4' : 'max-h-0 md:max-h-none'
        )}
      >
        {section.links.map((link) => (
          <li key={link.href}>
            {link.external ? (
              <a
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-foreground transition-colors inline-block py-1 md:py-0"
              >
                {link.label}
              </a>
            ) : (
              <Link
                to={link.href}
                className="hover:text-foreground transition-colors inline-block py-1 md:py-0"
                onClick={() => {
                  if (link.href === '/cities') {
                    trackFooterCitiesClicked();
                  }
                }}
              >
                {link.label}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
};

const Footer = () => {
  return (
    <footer className="bg-card text-foreground border-t border-border">
      {/* Main Footer Content */}
      <div className="container py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-7 gap-0 md:gap-8">
          {/* Brand Column */}
          <div className="col-span-1 mb-8 md:mb-0">
            <Link to="/" className="flex items-center mb-4">
              <img
                src={vendibookFavicon}
                alt="Vendibook"
                className="h-10 w-10 rounded-lg"
              />
            </Link>
            <p className="text-sm text-muted-foreground mb-4 max-w-[200px]">
              The marketplace for mobile food businesses.
            </p>
            <a
              href="tel:+17257559598"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              (725) 755-9598
            </a>
          </div>

          {/* Footer Sections */}
          {footerSections.map((section) => (
            <div key={section.title} className="col-span-1">
              <FooterAccordion section={section} />
            </div>
          ))}
        </div>
      </div>

      {/* Trust Bar */}
      <div className="border-t border-border/50">
        <div className="container py-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            {/* Trust Badges */}
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-x-6 gap-y-2 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                Secure Payments
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                Verified Listings
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                24/7 Support
              </span>
            </div>

            {/* Stripe Badge */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Payments by</span>
              <StripeLogo className="h-5 opacity-70" />
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-border/50">
        <div className="container py-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            {/* Copyright */}
            <p className="text-sm text-muted-foreground order-2 md:order-1">
              © {new Date().getFullYear()} Vendibook. All rights reserved.
            </p>

            {/* Social Links */}
            <div className="flex items-center gap-4 order-1 md:order-2">
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={social.label}
                >
                  <social.icon className="h-5 w-5" />
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
