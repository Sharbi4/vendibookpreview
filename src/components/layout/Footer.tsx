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
      { label: 'How It Works', href: '/how-it-works' },
      { label: 'Help Center', href: '/help' },
      { label: 'Contact Us', href: '/contact' },
    ],
  },
  {
    title: 'Browse',
    links: [
      { label: 'All Listings', href: '/search' },
      { label: 'Browse by City', href: '/cities' },
      { label: 'Food Trucks', href: '/search?category=food_truck' },
      { label: 'Food Trailers', href: '/search?category=food_trailer' },
      { label: 'Ghost Kitchens', href: '/search?category=ghost_kitchen' },
      { label: 'Vendor Lots', href: '/search?category=vendor_lot' },
    ],
  },
  {
    title: 'List & Earn',
    links: [
      { label: 'List Your Asset', href: '/host' },
      { label: 'Sell Your Asset', href: '/host?mode=sell' },
      { label: 'Host FAQ', href: '/faq' },
      { label: 'Insurance Info', href: '/insurance' },
    ],
  },
  {
    title: 'Host Tools',
    links: [
      { label: 'All Tools', href: '/tools' },
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
    ],
  },
];

const socialLinks = [
  { icon: Facebook, href: 'https://facebook.com/vendibook', label: 'Facebook' },
  { icon: Instagram, href: 'https://instagram.com/vendibook', label: 'Instagram' },
  { icon: Twitter, href: 'https://twitter.com/vendibook', label: 'Twitter' },
  { icon: Linkedin, href: 'https://linkedin.com/company/vendibook', label: 'LinkedIn' },
];

const FooterAccordion = ({ section }: { section: FooterSection }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border-b border-background/10 md:border-none">
      <button
        className="flex w-full items-center justify-between py-4 md:hidden"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
      >
        <span className="font-semibold text-background">{section.title}</span>
        <ChevronDown
          className={cn(
            'h-4 w-4 text-background/70 transition-transform',
            isOpen && 'rotate-180'
          )}
        />
      </button>
      <h4 className="hidden md:block font-semibold mb-4 text-background">
        {section.title}
      </h4>
      <ul
        className={cn(
          'space-y-2 text-sm text-background/80 overflow-hidden transition-all',
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
                className="hover:text-background transition-colors inline-block py-1 md:py-0"
              >
                {link.label}
              </a>
            ) : (
              <Link
                to={link.href}
                className="hover:text-background transition-colors inline-block py-1 md:py-0"
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
    <footer className="bg-foreground text-background">
      {/* Main Footer Content */}
      <div className="container py-12">
        <div className="grid grid-cols-1 md:grid-cols-6 gap-0 md:gap-8">
          {/* Brand Column */}
          <div className="col-span-1 mb-8 md:mb-0">
            <Link to="/" className="flex items-center mb-4">
              <img
                src={vendibookFavicon}
                alt="Vendibook"
                className="h-10 w-10 rounded-lg"
              />
            </Link>
            <p className="text-sm text-background/70 mb-4 max-w-[200px]">
              The marketplace for mobile food businesses.
            </p>
            <a
              href="tel:+18778836342"
              className="text-sm text-background/80 hover:text-background transition-colors"
            >
              1-877-8-VENDI-2
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
      <div className="border-t border-background/10">
        <div className="container py-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            {/* Trust Badges */}
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-x-6 gap-y-2 text-sm text-background/70">
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
            <div className="flex items-center gap-2 text-sm text-background/60">
              <span>Payments by</span>
              <StripeLogo className="h-5 opacity-70" />
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-background/10">
        <div className="container py-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            {/* Copyright */}
            <p className="text-sm text-background/60 order-2 md:order-1">
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
                  className="text-background/60 hover:text-background transition-colors"
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
