import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X, Search, User } from 'lucide-react';
import { Button } from '@/components/ui/button';

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-b border-border">
      <div className="container flex h-16 items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
              <span className="text-primary-foreground text-lg font-bold">V</span>
            </div>
            <span className="text-xl font-bold text-foreground">
              vendi<span className="text-primary">book</span>
            </span>
          </div>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-6">
          <Link 
            to="/?mode=rent" 
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            For Rent
          </Link>
          <Link 
            to="/?mode=sale" 
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            For Sale
          </Link>
          <Link 
            to="/list" 
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            List Your Asset
          </Link>
        </nav>

        {/* Desktop Actions */}
        <div className="hidden md:flex items-center gap-3">
          <Button variant="ghost" size="icon" className="rounded-full">
            <Search className="h-5 w-5" />
          </Button>
          <Button variant="outline" className="rounded-full gap-2">
            <User className="h-4 w-4" />
            <span>Sign In</span>
          </Button>
          <Button className="rounded-full">Get Started</Button>
        </div>

        {/* Mobile Menu Button */}
        <Button 
          variant="ghost" 
          size="icon" 
          className="md:hidden"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
        >
          {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="md:hidden border-t border-border bg-background animate-fade-in">
          <nav className="container py-4 flex flex-col gap-4">
            <Link 
              to="/?mode=rent" 
              className="text-sm font-medium py-2"
              onClick={() => setIsMenuOpen(false)}
            >
              For Rent
            </Link>
            <Link 
              to="/?mode=sale" 
              className="text-sm font-medium py-2"
              onClick={() => setIsMenuOpen(false)}
            >
              For Sale
            </Link>
            <Link 
              to="/list" 
              className="text-sm font-medium py-2"
              onClick={() => setIsMenuOpen(false)}
            >
              List Your Asset
            </Link>
            <div className="flex flex-col gap-2 pt-2 border-t border-border">
              <Button variant="outline" className="w-full rounded-full">
                Sign In
              </Button>
              <Button className="w-full rounded-full">Get Started</Button>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
};

export default Header;
