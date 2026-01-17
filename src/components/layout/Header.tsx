import { useState, useRef, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Menu, X, Search, User, LogOut, LayoutDashboard, Shield, MessageCircle, HelpCircle, Phone, ShieldCheck, Clock, TrendingUp, Sparkles, Mic, MicOff, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import vendibookFavicon from '@/assets/vendibook-favicon.png';
import NotificationCenter from '@/components/notifications/NotificationCenter';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

// Type declarations for Web Speech API
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}

interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognitionInstance;
    webkitSpeechRecognition: new () => SpeechRecognitionInstance;
  }
}

const POPULAR_SEARCHES = [
  'Food truck',
  'Food trailer',
  'Ghost kitchen',
  'Vendor lot',
  'BBQ trailer',
  'Taco truck',
  'Coffee cart',
];

const RECENT_SEARCHES_KEY = 'vendibook_recent_searches';
const MAX_RECENT_SEARCHES = 5;

const getRecentSearches = (): string[] => {
  try {
    const stored = localStorage.getItem(RECENT_SEARCHES_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

const saveRecentSearch = (query: string) => {
  try {
    const recent = getRecentSearches();
    const filtered = recent.filter(s => s.toLowerCase() !== query.toLowerCase());
    const updated = [query, ...filtered].slice(0, MAX_RECENT_SEARCHES);
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
  } catch {
    // Ignore storage errors
  }
};

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const [mobileSearchQuery, setMobileSearchQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [isListening, setIsListening] = useState(false);
  const mobileSearchInputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const { user, profile, signOut, isVerified } = useAuth();
  const navigate = useNavigate();

  // Check if speech recognition is supported
  const isSpeechSupported = typeof window !== 'undefined' && 
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

  // Initialize speech recognition
  useEffect(() => {
    if (!isSpeechSupported) return;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map(result => result[0].transcript)
        .join('');
      setMobileSearchQuery(transcript);
      
      // If this is a final result, execute the search
      if (event.results[0].isFinal) {
        setIsListening(false);
        if (transcript.trim()) {
          executeSearch(transcript.trim());
        }
      }
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
      if (event.error === 'not-allowed') {
        toast.error('Microphone access denied. Please enable it in your browser settings.');
      } else if (event.error !== 'aborted') {
        toast.error('Voice search error. Please try again.');
      }
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.abort();
    };
  }, [isSpeechSupported]);

  const startVoiceSearch = useCallback(() => {
    if (!recognitionRef.current) {
      toast.error('Voice search is not supported in your browser.');
      return;
    }

    // Open search bar if not already open
    if (!isMobileSearchOpen) {
      setIsMobileSearchOpen(true);
    }

    setIsListening(true);
    setShowSuggestions(false);
    
    try {
      recognitionRef.current.start();
      toast.info('Listening... Speak your search query.');
    } catch (error) {
      // Recognition might already be running
      setIsListening(false);
    }
  }, [isMobileSearchOpen]);

  const stopVoiceSearch = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
  }, []);

  // Load recent searches on mount
  useEffect(() => {
    setRecentSearches(getRecentSearches());
  }, []);

  // Focus the input when mobile search opens
  useEffect(() => {
    if (isMobileSearchOpen && mobileSearchInputRef.current) {
      mobileSearchInputRef.current.focus();
      setShowSuggestions(true);
    }
  }, [isMobileSearchOpen]);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target as Node) &&
          mobileSearchInputRef.current && !mobileSearchInputRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Check if user is admin
  const { data: isAdmin = false } = useQuery({
    queryKey: ['is-admin-header', user?.id],
    queryFn: async () => {
      if (!user?.id) return false;
      const { data, error } = await supabase.rpc('is_admin', { user_id: user.id });
      if (error) return false;
      return data as boolean;
    },
    enabled: !!user?.id,
  });

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const executeSearch = useCallback((query: string) => {
    const trimmed = query.trim();
    if (trimmed) {
      saveRecentSearch(trimmed);
      setRecentSearches(getRecentSearches());
      navigate(`/search?q=${encodeURIComponent(trimmed)}`);
      setIsMobileSearchOpen(false);
      setMobileSearchQuery('');
      setShowSuggestions(false);
    }
  }, [navigate]);

  const handleMobileSearch = (e: React.FormEvent) => {
    e.preventDefault();
    executeSearch(mobileSearchQuery);
  };

  const handleSuggestionClick = (suggestion: string) => {
    setMobileSearchQuery(suggestion);
    executeSearch(suggestion);
  };

  const closeMobileSearch = () => {
    setIsMobileSearchOpen(false);
    setMobileSearchQuery('');
    setShowSuggestions(false);
  };

  // Filter suggestions based on query
  const getFilteredSuggestions = () => {
    const query = mobileSearchQuery.toLowerCase().trim();
    
    const filteredRecent = recentSearches.filter(s => 
      s.toLowerCase().includes(query) || query === ''
    );
    
    const filteredPopular = POPULAR_SEARCHES.filter(s => 
      s.toLowerCase().includes(query) || query === ''
    ).filter(s => !filteredRecent.some(r => r.toLowerCase() === s.toLowerCase()));

    return { recent: filteredRecent, popular: filteredPopular };
  };

  const { recent: filteredRecent, popular: filteredPopular } = getFilteredSuggestions();
  const hasSuggestions = filteredRecent.length > 0 || filteredPopular.length > 0;

  return (
    <header className="sticky top-0 z-50 w-full bg-background border-b border-border shadow-sm">
      <div className="container flex h-16 items-center justify-between">
        {/* Logo - hide when mobile search is open */}
        <Link 
          to="/" 
          className={`flex items-center transition-opacity duration-200 ${isMobileSearchOpen ? 'opacity-0 pointer-events-none absolute' : 'opacity-100'} md:opacity-100 md:pointer-events-auto md:relative`}
        >
          <img 
            src={vendibookFavicon} 
            alt="Vendibook" 
            className="h-10 w-auto"
          />
        </Link>

        {/* Mobile Expandable Search */}
        <div 
          className={`md:hidden flex items-center transition-all duration-300 ease-in-out ${
            isMobileSearchOpen 
              ? 'flex-1 mx-0' 
              : 'flex-none'
          }`}
        >
          {isMobileSearchOpen ? (
            <div className="relative flex items-center gap-1 w-full">
              <form onSubmit={handleMobileSearch} className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  ref={mobileSearchInputRef}
                  type="text"
                  value={mobileSearchQuery}
                  onChange={(e) => {
                    setMobileSearchQuery(e.target.value);
                    setShowSuggestions(true);
                  }}
                  onFocus={() => setShowSuggestions(true)}
                  placeholder={isListening ? "Listening..." : "Search food trucks, trailers..."}
                  className={`pl-9 pr-4 py-2 w-full rounded-full border-border bg-muted/50 focus-visible:ring-primary ${isListening ? 'border-primary ring-2 ring-primary/20' : ''}`}
                  autoComplete="off"
                />
              </form>
              
              {/* Voice Search Button */}
              {isSpeechSupported && (
                <Button
                  type="button"
                  variant={isListening ? "default" : "ghost"}
                  size="icon"
                  onClick={isListening ? stopVoiceSearch : startVoiceSearch}
                  className={`shrink-0 ${isListening ? 'bg-primary text-primary-foreground animate-pulse' : ''}`}
                  aria-label={isListening ? "Stop voice search" : "Start voice search"}
                >
                  {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                </Button>
              )}
              
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={closeMobileSearch}
                className="shrink-0"
              >
                <X className="h-5 w-5" />
              </Button>

              {/* Suggestions Dropdown */}
              {showSuggestions && hasSuggestions && (
                <div 
                  ref={suggestionsRef}
                  className="absolute top-full left-0 right-12 mt-2 bg-background border border-border rounded-lg shadow-lg overflow-hidden z-50 animate-fade-in"
                >
                  {filteredRecent.length > 0 && (
                    <div className="py-2">
                      <p className="px-3 py-1 text-xs font-medium text-muted-foreground uppercase tracking-wide">Recent</p>
                      {filteredRecent.map((search, index) => (
                        <button
                          key={`recent-${index}`}
                          type="button"
                          onClick={() => handleSuggestionClick(search)}
                          className="w-full flex items-center gap-3 px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors text-left"
                        >
                          <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                          <span className="truncate">{search}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  
                  {filteredPopular.length > 0 && (
                    <div className="py-2 border-t border-border">
                      <p className="px-3 py-1 text-xs font-medium text-muted-foreground uppercase tracking-wide">Popular</p>
                      {filteredPopular.slice(0, 4).map((search, index) => (
                        <button
                          key={`popular-${index}`}
                          type="button"
                          onClick={() => handleSuggestionClick(search)}
                          className="w-full flex items-center gap-3 px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors text-left"
                        >
                          <TrendingUp className="h-4 w-4 text-muted-foreground shrink-0" />
                          <span className="truncate">{search}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMobileSearchOpen(true)}
              className="text-muted-foreground hover:text-foreground gap-1.5 px-3"
            >
              <Search className="h-4 w-4" />
              <span className="text-sm font-medium">Search</span>
            </Button>
          )}
        </div>

        {/* Centered Search - Desktop */}
        <div className="hidden md:flex flex-1 justify-center max-w-2xl mx-6">
          <button
            onClick={() => navigate('/search')}
            className="search-bar-glow w-full flex items-center gap-4 px-6 py-3.5 rounded-full border border-border bg-white hover:bg-white text-muted-foreground text-base font-medium shadow-sm group"
          >
            <div className="relative">
              <Search className="h-5 w-5 text-primary" />
              <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-primary animate-pulse" />
              <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-primary animate-ping opacity-75" />
            </div>
            <span className="text-muted-foreground/80 group-hover:text-foreground transition-colors">Search food trucks, trailers, ghost kitchens, or equipment</span>
          </button>
        </div>

        {/* Desktop Navigation - Simplified */}
        <nav className="hidden md:flex items-center gap-5">
          <Link 
            to="/tools" 
            className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <Sparkles className="h-4 w-4 text-primary" />
            <span>Host Tools</span>
          </Link>
          <Link 
            to="/host" 
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            List Your Asset
          </Link>
        </nav>

        {/* Desktop Actions */}
        <div className="hidden md:flex items-center gap-2 ml-4">
          {user && <NotificationCenter />}
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="rounded-full gap-2 pl-1.5">
                  <Avatar className="h-7 w-7">
                    <AvatarImage src={profile?.avatar_url || ''} alt={profile?.full_name || 'User'} />
                    <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
                      {(profile?.full_name || user.email || 'U').charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="max-w-[100px] truncate">
                    {profile?.full_name || user.email?.split('@')[0]}
                  </span>
                  {!isVerified && (
                    <Shield className="h-3 w-3 text-amber-500" />
                  )}
                  <ChevronDown className="h-3.5 w-3.5 opacity-60" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 bg-background">
                <DropdownMenuItem onClick={() => navigate('/dashboard')}>
                  <LayoutDashboard className="h-4 w-4 mr-2" />
                  Dashboard
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/profile')}>
                  <User className="h-4 w-4 mr-2" />
                  My Profile
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/messages')}>
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Messages
                </DropdownMenuItem>
                {!isVerified && (
                  <DropdownMenuItem onClick={() => navigate('/verify-identity')}>
                    <Shield className="h-4 w-4 mr-2 text-amber-500" />
                    Verify Identity
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                {isAdmin && (
                  <DropdownMenuItem onClick={() => navigate('/admin')}>
                    <ShieldCheck className="h-4 w-4 mr-2 text-primary" />
                    Admin Dashboard
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={() => navigate('/how-it-works')}>
                  <HelpCircle className="h-4 w-4 mr-2" />
                  How It Works
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/help')}>
                  <HelpCircle className="h-4 w-4 mr-2" />
                  Help Center
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut}>
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <>
              <Button 
                variant="outline" 
                className="rounded-full"
                onClick={() => navigate('/auth')}
              >
                Sign In
              </Button>
              <Button 
                variant="gradient"
                className="rounded-full"
                onClick={() => navigate('/auth')}
              >
                Get Started
              </Button>
            </>
          )}
        </div>

        {/* Mobile Actions - hide when search is open */}
        <div className={`flex md:hidden items-center gap-1 transition-opacity duration-200 ${isMobileSearchOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
          <a
            href="tel:+18778836342"
            className="inline-flex items-center justify-center h-9 w-9 rounded-full text-primary hover:bg-primary/10 transition-colors"
            aria-label="Call customer support"
          >
            <Phone className="h-5 w-5" />
          </a>
          {user && <NotificationCenter />}
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {/* Mobile Menu - Simplified */}
      {isMenuOpen && (
        <div className="md:hidden border-t border-border bg-background animate-fade-in">
          <nav className="container py-4 flex flex-col gap-1">
            <Link 
              to="/search" 
              className="flex items-center gap-3 text-sm font-medium py-3 px-2 rounded-lg hover:bg-muted transition-colors"
              onClick={() => setIsMenuOpen(false)}
            >
              <Search className="h-4 w-4 text-muted-foreground" />
              Browse Listings
            </Link>
            <Link 
              to="/host" 
              className="flex items-center gap-3 text-sm font-medium py-3 px-2 rounded-lg hover:bg-muted transition-colors"
              onClick={() => setIsMenuOpen(false)}
            >
              <LayoutDashboard className="h-4 w-4 text-muted-foreground" />
              List Your Asset
            </Link>
            <Link 
              to="/tools" 
              className="flex items-center gap-3 text-sm font-medium py-3 px-2 rounded-lg hover:bg-muted transition-colors"
              onClick={() => setIsMenuOpen(false)}
            >
              <Sparkles className="h-4 w-4 text-primary" />
              Host Tools
            </Link>
            <Link 
              to="/how-it-works" 
              className="flex items-center gap-3 text-sm font-medium py-3 px-2 rounded-lg hover:bg-muted transition-colors"
              onClick={() => setIsMenuOpen(false)}
            >
              <HelpCircle className="h-4 w-4 text-muted-foreground" />
              How It Works
            </Link>
            <Link 
              to="/help" 
              className="flex items-center gap-3 text-sm font-medium py-3 px-2 rounded-lg hover:bg-muted transition-colors"
              onClick={() => setIsMenuOpen(false)}
            >
              <HelpCircle className="h-4 w-4 text-muted-foreground" />
              Help Center
            </Link>
            
            <div className="border-t border-border mt-2 pt-3">
              {user ? (
                <div className="flex flex-col gap-1">
                  <Link 
                    to="/dashboard" 
                    className="flex items-center gap-3 text-sm font-medium py-3 px-2 rounded-lg hover:bg-muted transition-colors"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <LayoutDashboard className="h-4 w-4 text-muted-foreground" />
                    Dashboard
                  </Link>
                  <Link 
                    to="/profile" 
                    className="flex items-center gap-3 text-sm font-medium py-3 px-2 rounded-lg hover:bg-muted transition-colors"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <User className="h-4 w-4 text-muted-foreground" />
                    My Profile
                  </Link>
                  <Link 
                    to="/messages" 
                    className="flex items-center gap-3 text-sm font-medium py-3 px-2 rounded-lg hover:bg-muted transition-colors"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <MessageCircle className="h-4 w-4 text-muted-foreground" />
                    Messages
                  </Link>
                  {!isVerified && (
                    <Link 
                      to="/verify-identity" 
                      className="flex items-center gap-3 text-sm font-medium py-3 px-2 rounded-lg hover:bg-muted transition-colors text-amber-600"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <Shield className="h-4 w-4" />
                      Verify Identity
                    </Link>
                  )}
                  {isAdmin && (
                    <Link 
                      to="/admin" 
                      className="flex items-center gap-3 text-sm font-medium py-3 px-2 rounded-lg hover:bg-muted transition-colors text-primary"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <ShieldCheck className="h-4 w-4" />
                      Admin Dashboard
                    </Link>
                  )}
                  <div className="pt-2 mt-2 border-t border-border">
                    <Button 
                      variant="ghost" 
                      className="w-full justify-start gap-3 px-2"
                      onClick={() => {
                        handleSignOut();
                        setIsMenuOpen(false);
                      }}
                    >
                      <LogOut className="h-4 w-4" />
                      Sign Out
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-2 pt-2">
                  <Button 
                    variant="outline" 
                    className="w-full rounded-full"
                    onClick={() => {
                      navigate('/auth');
                      setIsMenuOpen(false);
                    }}
                  >
                    Sign In
                  </Button>
                  <Button 
                    variant="gradient"
                    className="w-full rounded-full"
                    onClick={() => {
                      navigate('/auth');
                      setIsMenuOpen(false);
                    }}
                  >
                    Get Started
                  </Button>
                </div>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
};

export default Header;
