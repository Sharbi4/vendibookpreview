import { Link } from 'react-router-dom';
import vendibookFavicon from '@/assets/vendibook-favicon.png';

const Footer = () => {
  const launchCities = [
    { name: 'Phoenix', query: 'Phoenix, AZ' },
    { name: 'Houston', query: 'Houston, TX' },
    { name: 'Austin', query: 'Austin, TX' },
    { name: 'Tucson', query: 'Tucson, AZ' },
    { name: 'Tempe', query: 'Tempe, AZ' },
    { name: 'Portland', query: 'Portland, OR' },
  ];

  return (
    <footer className="bg-foreground text-background py-12">
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
            <p className="text-sm text-background/80">
              The marketplace for mobile food businesses.
            </p>
          </div>

          {/* Browse - Launch Cities */}
          <div>
            <h4 className="font-semibold mb-4 text-background">Browse Cities</h4>
            <ul className="space-y-2 text-sm text-background/80">
              {launchCities.map((city) => (
                <li key={city.name}>
                  <Link 
                    to={`/search?location=${encodeURIComponent(city.query)}`} 
                    className="hover:text-background transition-colors"
                  >
                    {city.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Host */}
          <div>
            <h4 className="font-semibold mb-4 text-background">Host</h4>
            <ul className="space-y-2 text-sm text-background/80">
              <li><Link to="/create-listing" className="hover:text-background transition-colors">List Your Asset</Link></li>
              <li><Link to="/dashboard" className="hover:text-background transition-colors">Host Dashboard</Link></li>
              <li><Link to="/how-it-works" className="hover:text-background transition-colors">How It Works</Link></li>
              <li><Link to="/ai-tools" className="hover:text-background transition-colors">AI Business Tools</Link></li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="font-semibold mb-4 text-background">Support</h4>
            <ul className="space-y-2 text-sm text-background/80">
              <li><a href="tel:+18778836342" className="hover:text-background transition-colors">1 (877) 883-6342</a></li>
              <li><Link to="/help" className="hover:text-background transition-colors">Help Center</Link></li>
              <li><Link to="/how-it-works" className="hover:text-background transition-colors">How Vendibook Works</Link></li>
              <li><Link to="/contact" className="hover:text-background transition-colors">Contact Us</Link></li>
              <li><Link to="/insurance" className="hover:text-background transition-colors">Insurance Information</Link></li>
              <li><Link to="/privacy" className="hover:text-background transition-colors">Privacy Policy</Link></li>
              <li><Link to="/california-privacy" className="hover:text-background transition-colors">California Privacy Notice</Link></li>
              <li><Link to="/terms" className="hover:text-background transition-colors">Terms of Service</Link></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-background/20 mt-10 pt-6 text-center text-sm text-background/70">
          <p>© {new Date().getFullYear()} Vendibook. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
