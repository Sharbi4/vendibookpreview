import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { ArrowUpRight, ChevronDown, Facebook, Instagram, Twitter, Linkedin, MessageSquareText, Phone } from 'lucide-react';
import { VENDIBOOK_FACEBOOK_URL } from '@/components/social/FacebookLink';
import { PayPalWordmark, EquinoxFundingLogo } from '@/components/brand/ProviderLogos';
import { cn } from '@/lib/utils';
import { trackFooterCitiesClicked } from '@/lib/analytics';
import './footer.css';

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
      { label: 'Press & Media', href: '/press' },
      { label: 'Blog', href: '/blog' },
    ],
  },
  {
    title: 'Marketplace',
    links: [
      { label: 'Food Trucks for Sale', href: '/food-trucks-for-sale' },
      { label: 'Food Trailers for Sale', href: '/food-trailers-for-sale' },
      { label: 'Used Food Trucks for Sale', href: '/used-food-trucks-for-sale' },
      { label: 'How to Buy a Food Truck', href: '/how-to-buy-a-food-truck' },
      { label: 'Coffee Trucks & Trailers', href: '/coffee-trucks-trailers-for-sale' },
      { label: 'Ice Cream Trucks & Trailers', href: '/ice-cream-trucks-trailers-for-sale' },
      { label: 'Pizza Trucks & Trailers', href: '/pizza-trucks-trailers-for-sale' },
      { label: 'BBQ Trucks & Trailers', href: '/bbq-trucks-trailers-for-sale' },
      { label: 'Food Trucks & Trailers for Rent', href: '/food-trucks-for-rent' },
      { label: 'Food Trailers for Rent', href: '/food-trailers-for-rent' },
      { label: 'Food Truck Financing', href: '/financing' },
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
      { label: 'Sell a Food Truck', href: '/sell-my-food-truck' },
      { label: 'Sell a Food Trailer', href: '/sell-food-trailer' },
      { label: 'Sell a Concession Trailer', href: '/sell-concession-trailer' },
      { label: 'Rent My Kitchen', href: '/rent-my-commercial-kitchen' },
      { label: 'Pricing', href: '/pricing' },
      { label: 'Payment Options', href: '/payments' },
      { label: 'Insurance Info', href: '/insurance' },
      { label: 'Refer & Earn', href: '/referral' },
    ],
  },
  {
    title: 'By State',
    links: [
      { label: 'Texas Food Trucks', href: '/food-trucks-for-sale/texas' },
      { label: 'Texas Food Trailers', href: '/food-trailers-for-sale/texas' },
      { label: 'Arizona Food Trucks', href: '/food-trucks-for-sale/arizona' },
      { label: 'Florida Food Trucks', href: '/food-trucks-for-sale/florida' },
      { label: 'Georgia Food Trucks', href: '/food-trucks-for-sale/georgia' },
      { label: 'Michigan Food Trucks', href: '/food-trucks-for-sale/michigan' },
      { label: 'Ohio Food Trucks', href: '/food-trucks-for-sale/ohio' },
      { label: 'California', href: '/food-trucks-for-sale/california' },
    ],
  },
  {
    title: 'Host Tools',
    links: [
      { label: 'All Tools', href: '/tools' },
      { label: 'Startup Guide', href: '/tools/startup-guide' },
      { label: 'Price Pilot', href: '/tools/pricepilot' },
      { label: 'Food Truck Prices', href: '/food-truck-prices' },
      { label: 'Permit Path', href: '/tools/permitpath' },
      { label: 'Regulations Hub', href: '/tools/regulations-hub' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Legal Center', href: '/legal' },
      { label: 'Terms of Service', href: '/terms' },
      { label: 'Privacy Policy', href: '/privacy' },
      { label: 'Payments Terms', href: '/legal/payments-terms' },
      { label: 'Seller Payment Terms', href: '/legal/seller-payment-terms' },
      { label: 'Electronic Records Consent', href: '/legal/esign' },
      { label: 'Handoff Terms', href: '/legal/handoff-terms' },
      { label: 'Financing Disclosure', href: '/legal/financing-disclosure' },
      { label: 'Recording Notice', href: '/legal/recording-consent' },
      { label: 'Location Tracking', href: '/legal/location-tracking' },
      { label: 'California Privacy', href: '/california-privacy' },
      { label: 'Do Not Sell My Info', href: '/california-privacy#do-not-sell' },
      { label: 'Text message preferences', href: '/sms-opt-in' },
      { label: 'SMS Terms', href: '/legal/sms' },
    ],
  },
];

const socialLinks = [
  { icon: Facebook, href: VENDIBOOK_FACEBOOK_URL, label: 'Facebook' },
  { icon: Instagram, href: 'https://instagram.com/vendibook', label: 'Instagram' },
  { icon: Twitter, href: 'https://twitter.com/vendibook', label: 'Twitter' },
  { icon: Linkedin, href: 'https://linkedin.com/company/vendibook', label: 'LinkedIn' },
];

const FooterColumn = ({ section }: { section: FooterSection }) => {
  const [isOpen, setIsOpen] = useState(false);
  const id = `vf-${section.title.toLowerCase().replace(/[^a-z]+/g, '-')}`;

  return (
    <div className="vf-col">
      <button className="vf-col-toggle" onClick={() => setIsOpen(!isOpen)} aria-expanded={isOpen} aria-controls={id}>
        <span>{section.title}</span>
        <ChevronDown className={cn('h-4 w-4 transition-transform duration-300', isOpen && 'rotate-180')} aria-hidden />
      </button>
      <h4 className="vf-col-title">{section.title}</h4>
      <ul id={id} className={cn('vf-links', isOpen && 'is-open')}>
        {section.links.map((link) => (
          <li key={link.href}>
            {link.external ? (
              <a href={link.href} target="_blank" rel="noopener noreferrer" className="vf-link">{link.label}</a>
            ) : (
              <Link
                to={link.href}
                className="vf-link"
                onClick={() => { if (link.href === '/cities') trackFooterCitiesClicked(); }}
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
    <footer data-site-chrome="" className="vb-footer">
      <div className="vf-accent" aria-hidden />

      {/* Brand and support */}
      <div className="vf-wrap vf-top">
        <div className="vf-brand">
          <Link to="/" aria-label="Vendibook home">
            <img src="/brand/vendibook-logo-email-white.png" alt="Vendibook" className="vf-logo" loading="lazy" />
          </Link>
          <p className="vf-tagline">The marketplace for mobile food businesses. Built by food entrepreneurs, for food entrepreneurs.</p>
        </div>
        <div className="vf-support">
          <p className="vf-eyebrow">Support, every step of the way</p>
          <a href="tel:+18666906227" className="vf-phone">(866) 690-6227</a>
          <div className="vf-support-actions">
            <a href="tel:+18666906227" className="vf-pill"><Phone className="h-3.5 w-3.5" aria-hidden /> Call</a>
            <a href="sms:+18666906227" className="vf-pill"><MessageSquareText className="h-3.5 w-3.5" aria-hidden /> Text</a>
            <Link to="/contact" className="vf-pill is-solid">Contact us <ArrowUpRight className="h-3.5 w-3.5" aria-hidden /></Link>
          </div>
          <p className="vf-hours">Answered 24/7 · Team callbacks Mon–Fri, 8 AM–8 PM ET</p>
        </div>
      </div>

      {/* Link columns */}
      <div className="vf-wrap vf-grid">
        {footerSections.map((section) => <FooterColumn key={section.title} section={section} />)}
      </div>

      {/* Trust and partners */}
      <div className="vf-wrap vf-trust">
        <ul className="vf-badges">
          <li>Secure payments</li>
          <li>Verified listings</li>
          <li>Purchase Protection</li>
        </ul>
        <div className="vf-partners">
          <span className="vf-partner"><span>Payments by</span><PayPalWordmark className="h-3.5" /></span>
          <span className="vf-partner"><span>Financing by</span><EquinoxFundingLogo className="h-5 vf-mono" /></span>
        </div>
      </div>

      <div className="vf-wrap vf-bottom">
        <p>© {new Date().getFullYear()} Vendibook. All rights reserved.</p>
        <div className="vf-social">
          {socialLinks.map((social) => (
            <a key={social.label} href={social.href} target="_blank" rel="noopener noreferrer" aria-label={social.label}>
              <social.icon className="h-4 w-4" aria-hidden />
            </a>
          ))}
        </div>
      </div>
    </footer>
  );
};

export default Footer;
