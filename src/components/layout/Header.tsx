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
import vendibookWordmark from '@/assets/vendibook-wordmark-light.png';
import NotificationCenter from '@/components/notifications/NotificationCenter';
import { ConciergeInbox } from '@/components/concierge/ConciergeInbox';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import MobileMenu from './MobileMenu';
import AppDropdownMenu from './AppDropdownMenu';
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

interface HeaderProps {
  hideSearch?: boolean;
}

const Header = ({ hideSearch = false }: HeaderProps) => {
  const { t } = useTranslation();
  
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
    <header
      className="sticky top-0 z-50 w-full border-b border-border/30 shadow-sm"
      style={{
        // Near-opaque charcoal instead of backdrop-filter: blur(24px).
        // backdrop-filter over animated/scrolling content re-samples every frame
        // and causes flicker / graphic tearing during scroll on many GPUs.
        background: 'hsl(0, 0%, 4%)',
        // Promote to its own compositor layer so scroll repaints don't drag the header.
        transform: 'translateZ(0)',
        willChange: 'transform',
      }}
    >
      <div className="container max-w-7xl mx-auto pl-3 pr-2 sm:px-4 flex h-[72px] items-center justify-between gap-2 sm:gap-3">
        {/* Brand — compact bird mark on mobile, full wordmark lockup from md up */}
        <Link 
          to="/" 
          aria-label="Vendibook home"
          className={`group flex items-center shrink-0 transition-opacity duration-200 ${isMobileSearchOpen ? 'opacity-0 pointer-events-none absolute' : 'opacity-100'} md:opacity-100 md:pointer-events-auto md:relative`}
        >
          <div className="flex items-center justify-center h-11 w-11 shrink-0 sm:h-12 sm:w-12 md:hidden">
            <img 
              src={vendibookFavicon} 
              alt="Vendibook" 
              className="h-9 w-auto object-contain brightness-125 transition-transform duration-300 group-hover:scale-105 sm:h-10"
            />
          </div>
          <img
            src={vendibookWordmark}
            alt="Vendibook"
            width={1000}
            height={293}
            className="hidden h-9 w-auto object-contain transition-transform duration-300 group-hover:scale-[1.02] md:block lg:h-10"
          />
        </Link>


        {/* Mobile Expandable Search */}
        {!hideSearch && <div 
          className={`md:hidden flex items-center min-w-0 transition-all duration-300 ease-in-out ${
            isMobileSearchOpen 
              ? 'flex-1 mx-0' 
              : 'flex-1'
          }`}
        >
          {isMobileSearchOpen ? (
            <div className="relative flex items-center gap-2 w-full">
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
              

              
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={closeMobileSearch}
                className="shrink-0"
                aria-label="Close search"
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
            <button
              onClick={() => setIsMobileSearchOpen(true)}
              className="flex items-center gap-2 px-3 sm:px-4 h-[44px] rounded-full text-sm font-medium text-white/70 transition-all flex-1 mx-1.5 sm:mx-3 min-w-0"
              style={{
                background: 'rgba(18,18,18,0.92)',
                border: '1px solid rgba(255,255,255,0.08)',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04), 0 4px 18px rgba(0,0,0,0.35)',
              }}
            >
              <Search className="h-4 w-4 text-white/55 shrink-0" />
              <span className="truncate text-white/55 text-left flex-1 min-w-0">Search food trucks, trailers...</span>
            </button>
          )}
        </div>}

        {/* Centered Search - Desktop */}
        {!hideSearch && (
          <div className="hidden md:flex flex-1 justify-center max-w-2xl mx-6">
            <button
              onClick={() => navigate('/search')}
              className="group flex h-[52px] w-full items-center gap-3.5 rounded-full px-6 text-[15px] font-medium text-white/70 transition-all duration-300 hover:-translate-y-px"
              style={{
                background: 'rgba(255,255,255,0.045)',
                border: '1px solid rgba(255,255,255,0.10)',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05), 0 6px 22px rgba(0,0,0,0.30)',
                backdropFilter: 'blur(14px)',
              }}
            >
              <Search className="h-[18px] w-[18px] text-primary transition-transform duration-200 group-hover:scale-105" />
              <span className="text-white/55 transition-colors group-hover:text-white/85">Search food trucks, trailers, or a city</span>
              <span className="ml-auto rounded-full border border-white/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/40 transition-colors group-hover:text-white/60">Search</span>
            </button>
          </div>
        )}

        {/* Desktop Navigation */}
        <nav className="hidden lg:flex items-center gap-3 shrink-0">
          {!user && (
            <Link 
              to="/become-a-host" 
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Become a Host
            </Link>
          )}
        </nav>

        {/* Desktop Actions */}
        <div className="hidden lg:flex items-center gap-2 ml-4 shrink-0">
          {user && (
            <Button 
              variant="dark-shine"
              className="rounded-full"
              onClick={() => navigate('/list')}
            >
              {t('common.createListing')}
            </Button>
          )}
          {user ? (
            <>
              <ConciergeInbox userId={user.id} />
              <NotificationCenter />
              <AppDropdownMenu variant="light" />
            </>
          ) : (
            <>
              <Button 
                variant="dark-shine" 
                className="rounded-full"
                onClick={() => navigate('/auth')}
              >
                Sign Up / Login
              </Button>
              <AppDropdownMenu variant="light" />
            </>
          )}
          {/* Language Switcher - Far Right */}
          <LanguageSwitcher />
        </div>

        {/* Mobile & Tablet Actions - hide when search is open */}
        <div className={`flex lg:hidden items-center gap-1 shrink-0 ${isMobileSearchOpen ? 'hidden' : 'flex'}`}> 
          {user && <ConciergeInbox userId={user.id} />}
          {user && <NotificationCenter />}
          <AppDropdownMenu variant="light" />
          <div className="hidden sm:block">
            <LanguageSwitcher />
          </div>
        </div>
      </div>
    </header>
  </>
  );
};

export default Header;
