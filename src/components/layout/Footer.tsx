import { Link } from 'react-router-dom';
import vendibookLogo from '@/assets/vendibook-logo.jpg';

const Footer = () => {
  return (
    <footer className="bg-foreground text-primary-foreground py-12">
      <div className="container">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Link to="/" className="flex items-center mb-4">
              <img 
                src={vendibookLogo} 
                alt="Vendibook" 
                className="h-10 w-auto brightness-0 invert"
              />
            </Link>
            <p className="text-sm text-muted-foreground">
              The marketplace for mobile food businesses.
            </p>
          </div>

          {/* Browse */}
          <div>
            <h4 className="font-semibold mb-4">Browse</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/?category=food_truck" className="hover:text-primary transition-colors">Food Trucks</Link></li>
              <li><Link to="/?category=food_trailer" className="hover:text-primary transition-colors">Food Trailers</Link></li>
              <li><Link to="/?category=ghost_kitchen" className="hover:text-primary transition-colors">Ghost Kitchens</Link></li>
              <li><Link to="/?category=vendor_lot" className="hover:text-primary transition-colors">Vendor Lots</Link></li>
            </ul>
          </div>

          {/* Host */}
          <div>
            <h4 className="font-semibold mb-4">Host</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/list" className="hover:text-primary transition-colors">List Your Asset</Link></li>
              <li><Link to="/host/dashboard" className="hover:text-primary transition-colors">Host Dashboard</Link></li>
              <li><Link to="/pricing" className="hover:text-primary transition-colors">Pricing</Link></li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="font-semibold mb-4">Support</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/help" className="hover:text-primary transition-colors">Help Center</Link></li>
              <li><Link to="/contact" className="hover:text-primary transition-colors">Contact Us</Link></li>
              <li><Link to="/privacy" className="hover:text-primary transition-colors">Privacy Policy</Link></li>
              <li><Link to="/terms" className="hover:text-primary transition-colors">Terms of Service</Link></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-muted-foreground/20 mt-10 pt-6 text-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} Vendibook. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
