import { Link } from 'react-router-dom';
import vendibookFavicon from '@/assets/vendibook-favicon.png';

const Footer = () => {
  return (
    <footer className="bg-[#FF5124] text-white py-12">
      <div className="container">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Link to="/" className="flex items-center mb-4">
              <img 
                src={vendibookFavicon} 
                alt="Vendibook" 
                className="h-12 w-12 rounded-lg"
              />
            </Link>
            <p className="text-sm text-white/80">
              The marketplace for mobile food businesses.
            </p>
          </div>

          {/* Browse */}
          <div>
            <h4 className="font-semibold mb-4 text-white">Browse</h4>
            <ul className="space-y-2 text-sm text-white/80">
              <li><Link to="/?category=food_truck" className="hover:text-white transition-colors">Food Trucks</Link></li>
              <li><Link to="/?category=food_trailer" className="hover:text-white transition-colors">Food Trailers</Link></li>
              <li><Link to="/?category=ghost_kitchen" className="hover:text-white transition-colors">Ghost Kitchens</Link></li>
              <li><Link to="/?category=vendor_lot" className="hover:text-white transition-colors">Vendor Lots</Link></li>
            </ul>
          </div>

          {/* Host */}
          <div>
            <h4 className="font-semibold mb-4 text-white">Host</h4>
            <ul className="space-y-2 text-sm text-white/80">
              <li><Link to="/create-listing" className="hover:text-white transition-colors">List Your Asset</Link></li>
              <li><Link to="/dashboard" className="hover:text-white transition-colors">Host Dashboard</Link></li>
              <li><Link to="/how-it-works" className="hover:text-white transition-colors">How It Works</Link></li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="font-semibold mb-4 text-white">Support</h4>
            <ul className="space-y-2 text-sm text-white/80">
              <li><a href="tel:+18778836342" className="hover:text-white transition-colors">1 (877) 883-6342</a></li>
              <li><Link to="/help" className="hover:text-white transition-colors">Help Center</Link></li>
              <li><Link to="/how-it-works" className="hover:text-white transition-colors">How Vendibook Works</Link></li>
              <li><Link to="/contact" className="hover:text-white transition-colors">Contact Us</Link></li>
              <li><Link to="/insurance" className="hover:text-white transition-colors">Insurance Information</Link></li>
              <li><Link to="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
              <li><Link to="/terms" className="hover:text-white transition-colors">Terms of Service</Link></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/20 mt-10 pt-6 text-center text-sm text-white/70">
          <p>© {new Date().getFullYear()} Vendibook. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
