import { useState, useRef, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Menu, X, Search, User, LogOut, Shield, MessageCircle, HelpCircle, ShieldCheck, Clock, TrendingUp, Mic, MicOff, ChevronDown, CheckCircle2, Heart, CalendarDays, Home, Bell, Globe, Settings, Gift, LayoutDashboard, PlusCircle } from 'lucide-react';
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
import MobileMenu from './MobileMenu';
import LanguageSwitcher from './LanguageSwitcher';
import { useTranslation } from 'react-i18next';
import AirbnbMenuItem from '@/components/ui/AirbnbMenuItem';

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
  'Shared kitchen',
  'Vendor Space',
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
  const { t } = useTranslation();
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
    <>
    <header className="sticky top-0 z-50 w-full bg-background/95 backdrop-blur-xl border-b border-border/50 shadow-sm supports-[backdrop-filter]:bg-background/80">
      <div className="container max-w-7xl mx-auto px-4 flex h-16 items-center justify-between">
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
                  placeholder={isListening ? t('header.listening') : t('header.mobileSearchPlaceholder')}
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
                      <p className="px-3 py-1 text-xs font-medium text-muted-foreground uppercase tracking-wide">{t('header.recent')}</p>
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
                      <p className="px-3 py-1 text-xs font-medium text-muted-foreground uppercase tracking-wide">{t('header.popular')}</p>
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
              <span className="text-sm font-medium">{t('common.search')}</span>
            </Button>
          )}
        </div>

        {/* Centered Search - Desktop */}
        <div className="hidden lg:flex flex-1 justify-center max-w-2xl mx-6">
          <button
            onClick={() => navigate('/search')}
            className="w-full flex items-center gap-4 px-6 py-3.5 rounded-full border border-border bg-white hover:bg-muted/30 text-muted-foreground text-base font-medium shadow-sm transition-all duration-200 group"
          >
            <Search className="h-5 w-5 text-primary transition-transform duration-200 group-hover:scale-105" />
            <span className="text-muted-foreground/80 group-hover:text-foreground transition-colors">{t('header.searchPlaceholder')}</span>
          </button>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden lg:flex items-center gap-3">
          <Link 
            to="/how-it-works" 
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            {t('common.learnMore')}
          </Link>
        </nav>

        {/* Desktop Actions */}
        <div className="hidden lg:flex items-center gap-2 ml-4">
          {user && (
            <Button 
              variant="dark-shine"
              className="rounded-full"
              onClick={() => navigate('/list')}
            >
              {t('common.createListing')}
            </Button>
          )}
          {user && <NotificationCenter />}
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="rounded-full gap-2 pl-1.5 pr-3">
                  <Avatar className="h-8 w-8 ring-2 ring-primary/20">
                    <AvatarImage src={profile?.avatar_url || ''} alt={profile?.full_name || 'User'} />
                    <AvatarFallback className="bg-gradient-to-br from-primary to-primary/70 text-primary-foreground text-sm font-semibold">
                      {(profile?.full_name || user.email || 'U').charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <ChevronDown className="h-3.5 w-3.5 opacity-60" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64 bg-background p-0 rounded-xl shadow-xl border">
                {/* Group 1: Core User Actions */}
                <div className="py-2">
                  <AirbnbMenuItem icon={Heart} label={t('common.favorites')} to="/favorites" />
                  <AirbnbMenuItem icon={CalendarDays} label={t('common.bookings')} to="/transactions?tab=bookings" />
                  <AirbnbMenuItem icon={MessageCircle} label={t('common.messages')} to="/messages" />
                </div>
                
                <DropdownMenuSeparator className="my-0" />
                
                {/* Group 2: Profile & Notifications */}
                <div className="py-2">
                  <AirbnbMenuItem icon={User} label="Profile" to={`/profile/${user?.id}`} />
                  <AirbnbMenuItem icon={Bell} label="Notifications" onClick={() => {}} />
                </div>
                
                <DropdownMenuSeparator className="my-0" />
                
                {/* Group 3: Account Settings */}
                <div className="py-2">
                  <AirbnbMenuItem icon={LayoutDashboard} label={t('common.dashboard')} to="/dashboard" />
                  <AirbnbMenuItem icon={Globe} label="Language" onClick={() => {}} />
                  <AirbnbMenuItem icon={HelpCircle} label={t('common.support')} to="/help" />
                </div>
                
                <DropdownMenuSeparator className="my-0" />
                
                {/* Group 4: Verification */}
                <div className="py-2">
                  {!isVerified ? (
                    <AirbnbMenuItem 
                      icon={Shield} 
                      label="Verify Identity" 
                      subtext="Get verified to unlock all features"
                      to="/verify-identity"
                    />
                  ) : (
                    <div className="flex items-center gap-2 px-4 py-2 text-sm text-emerald-600">
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Verified</span>
                    </div>
                  )}
                </div>
                
                {isAdmin && (
                  <>
                    <DropdownMenuSeparator className="my-0" />
                    <div className="py-2">
                      <AirbnbMenuItem icon={ShieldCheck} label={t('common.admin')} to="/admin" />
                    </div>
                  </>
                )}
                
                <DropdownMenuSeparator className="my-0" />
                
                {/* Group 5: Sign Out */}
                <div className="py-2">
                  <AirbnbMenuItem icon={LogOut} label={t('common.signOut')} onClick={handleSignOut} />
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button 
              variant="dark-shine" 
              className="rounded-full"
              onClick={() => navigate('/auth')}
            >
              Sign Up / Login
            </Button>
          )}
          {/* Language Switcher - Far Right */}
          <LanguageSwitcher />
        </div>

        {/* Mobile & Tablet Actions - hide when search is open */}
        <div className={`flex lg:hidden items-center gap-1 transition-opacity duration-200 ${isMobileSearchOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}> 
          <Link
            to="/how-it-works"
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors px-2"
          >
            {t('common.learnMore')}
          </Link>
          {user && <NotificationCenter />}
          <Button 
            variant="outline" 
            size="icon" 
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="text-foreground bg-background border-border relative z-50"
          >
            {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </Button>
          <div className="hidden sm:block">
            <LanguageSwitcher />
          </div>
        </div>
      </div>
    </header>

    {/* Mobile Menu - Rendered outside header to avoid stacking context issues from backdrop-blur */}
    <MobileMenu
      isOpen={isMenuOpen}
      onClose={() => setIsMenuOpen(false)}
      user={user}
      profile={profile}
      isVerified={isVerified}
      isAdmin={isAdmin}
      onSignOut={handleSignOut}
      onNavigate={navigate}
    />
  </>
  );
};

export default Header;
