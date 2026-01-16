import { useState, useRef, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Menu, X, Search, User, LogOut, LayoutDashboard, Shield, MessageCircle, HelpCircle, Phone, ShieldCheck, Clock, TrendingUp, Sparkles, Mic, MicOff, DollarSign, FileText, Wrench, Brain, Lightbulb, Globe, ChevronDown, ChevronRight } from 'lucide-react';
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
  const [isAIMenuExpanded, setIsAIMenuExpanded] = useState(false);
  const [isMobileAIExpanded, setIsMobileAIExpanded] = useState(false);
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

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-6">
          {/* Vendi AI Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors group">
                <span>Vendi</span>
                <span className="bg-gradient-to-r from-primary via-purple-500 to-pink-500 bg-clip-text text-transparent font-semibold">AI</span>
                <ChevronDown className="h-3.5 w-3.5 opacity-70 group-hover:opacity-100 transition-opacity" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-80 p-2 bg-background border border-border shadow-xl z-50">
              {/* Header */}
              <div className="px-3 py-2 mb-1">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                    <Sparkles className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">Vendi AI Suite</p>
                    <p className="text-xs text-muted-foreground">Your AI co-pilot for mobile food business</p>
                  </div>
                </div>
              </div>
              <DropdownMenuSeparator className="my-2" />
              
              {/* AI Tools Grid */}
              <div className="space-y-1">
                <DropdownMenuItem 
                  onClick={() => navigate('/tools/pricepilot')} 
                  className="cursor-pointer flex items-start gap-3 p-3 rounded-lg hover:bg-accent/80 transition-colors"
                >
                  <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center shrink-0 shadow-sm">
                    <DollarSign className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">PricePilot</p>
                    <p className="text-xs text-muted-foreground line-clamp-1">Find out what to charge</p>
                  </div>
                </DropdownMenuItem>
                
                <DropdownMenuItem 
                  onClick={() => navigate('/tools/permitpath')} 
                  className="cursor-pointer flex items-start gap-3 p-3 rounded-lg hover:bg-accent/80 transition-colors"
                >
                  <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-amber-400 to-orange-600 flex items-center justify-center shrink-0 shadow-sm">
                    <FileText className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">PermitPath</p>
                    <p className="text-xs text-muted-foreground line-clamp-1">See what permits you need</p>
                  </div>
                </DropdownMenuItem>
                
                <DropdownMenuItem 
                  onClick={() => navigate('/tools/buildkit')} 
                  className="cursor-pointer flex items-start gap-3 p-3 rounded-lg hover:bg-accent/80 transition-colors"
                >
                  <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center shrink-0 shadow-sm">
                    <Wrench className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">BuildKit</p>
                    <p className="text-xs text-muted-foreground line-clamp-1">Get equipment tips & guides</p>
                  </div>
                </DropdownMenuItem>
                
                <DropdownMenuItem 
                  onClick={() => navigate('/tools/listing-studio')} 
                  className="cursor-pointer flex items-start gap-3 p-3 rounded-lg hover:bg-accent/80 transition-colors"
                >
                  <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-rose-400 to-pink-600 flex items-center justify-center shrink-0 shadow-sm">
                    <Brain className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">Listing Studio</p>
                    <p className="text-xs text-muted-foreground line-clamp-1">Write a great listing fast</p>
                  </div>
                </DropdownMenuItem>
                
                <DropdownMenuItem 
                  onClick={() => navigate('/tools/concept-lab')} 
                  className="cursor-pointer flex items-start gap-3 p-3 rounded-lg hover:bg-accent/80 transition-colors"
                >
                  <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-yellow-300 to-amber-500 flex items-center justify-center shrink-0 shadow-sm">
                    <Lightbulb className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">Concept Lab</p>
                    <p className="text-xs text-muted-foreground line-clamp-1">Get food truck business ideas</p>
                  </div>
                </DropdownMenuItem>
                
                <DropdownMenuItem 
                  onClick={() => navigate('/tools/market-radar')} 
                  className="cursor-pointer flex items-start gap-3 p-3 rounded-lg hover:bg-accent/80 transition-colors"
                >
                  <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-blue-400 to-indigo-600 flex items-center justify-center shrink-0 shadow-sm">
                    <Globe className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">Market Radar</p>
                    <p className="text-xs text-muted-foreground line-clamp-1">Research your market</p>
                  </div>
                </DropdownMenuItem>
              </div>
              
              <DropdownMenuSeparator className="my-2" />
              
              {/* View All Link */}
              <DropdownMenuItem 
                onClick={() => navigate('/ai-tools')} 
                className="cursor-pointer flex items-center justify-center gap-2 p-2 rounded-lg bg-primary/5 hover:bg-primary/10 transition-colors"
              >
                <Sparkles className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium text-primary">Open Command Center</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Link 
            to="/create-listing" 
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            List Your Asset
          </Link>
        </nav>

        {/* Desktop Actions */}
        <div className="hidden md:flex items-center gap-2">
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
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 bg-background">
                <DropdownMenuItem onClick={() => navigate('/profile')}>
                  <User className="h-4 w-4 mr-2" />
                  My Profile
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/dashboard')}>
                  <LayoutDashboard className="h-4 w-4 mr-2" />
                  Dashboard
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
                <DropdownMenuItem onClick={() => navigate('/contact')}>
                  <Phone className="h-4 w-4 mr-2" />
                  Contact Us
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

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="md:hidden border-t border-border bg-background animate-fade-in">
          <nav className="container py-4 flex flex-col gap-4">
            <Link 
              to="/search" 
              className="text-sm font-medium py-2"
              onClick={() => setIsMenuOpen(false)}
            >
              Search
            </Link>
            {/* Vendi AI Section - Collapsible */}
            <div className="py-2">
              <button
                onClick={() => setIsMobileAIExpanded(!isMobileAIExpanded)}
                className="flex items-center justify-between w-full text-sm font-semibold text-foreground py-2"
              >
                <span className="flex items-center gap-1">
                  <span>Vendi</span>
                  <span className="bg-gradient-to-r from-primary via-purple-500 to-pink-500 bg-clip-text text-transparent font-bold">AI</span>
                </span>
                <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${isMobileAIExpanded ? 'rotate-180' : ''}`} />
              </button>
              {isMobileAIExpanded && (
                <div className="flex flex-col gap-2 mt-2 animate-fade-in">
                  {/* Header Card */}
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/10">
                    <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                      <Sparkles className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">Vendi AI Suite</p>
                      <p className="text-xs text-muted-foreground">Your AI co-pilot for mobile food business</p>
                    </div>
                  </div>
                  
                  {/* AI Tools List */}
                  <div className="space-y-1">
                    <Link 
                      to="/tools/pricepilot" 
                      className="flex items-start gap-3 p-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center shrink-0 shadow-sm">
                        <DollarSign className="h-5 w-5 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground">PricePilot</p>
                        <p className="text-xs text-muted-foreground">Find out what to charge</p>
                      </div>
                    </Link>
                    
                    <Link 
                      to="/tools/permitpath" 
                      className="flex items-start gap-3 p-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-amber-400 to-orange-600 flex items-center justify-center shrink-0 shadow-sm">
                        <FileText className="h-5 w-5 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground">PermitPath</p>
                        <p className="text-xs text-muted-foreground">See what permits you need</p>
                      </div>
                    </Link>
                    
                    <Link 
                      to="/tools/buildkit" 
                      className="flex items-start gap-3 p-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center shrink-0 shadow-sm">
                        <Wrench className="h-5 w-5 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground">BuildKit</p>
                        <p className="text-xs text-muted-foreground">Get equipment tips & guides</p>
                      </div>
                    </Link>
                    
                    <Link 
                      to="/tools/listing-studio" 
                      className="flex items-start gap-3 p-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-rose-400 to-pink-600 flex items-center justify-center shrink-0 shadow-sm">
                        <Brain className="h-5 w-5 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground">Listing Studio</p>
                        <p className="text-xs text-muted-foreground">Write a great listing fast</p>
                      </div>
                    </Link>
                    
                    <Link 
                      to="/tools/concept-lab" 
                      className="flex items-start gap-3 p-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-yellow-300 to-amber-500 flex items-center justify-center shrink-0 shadow-sm">
                        <Lightbulb className="h-5 w-5 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground">Concept Lab</p>
                        <p className="text-xs text-muted-foreground">Get food truck business ideas</p>
                      </div>
                    </Link>
                    
                    <Link 
                      to="/tools/market-radar" 
                      className="flex items-start gap-3 p-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-blue-400 to-indigo-600 flex items-center justify-center shrink-0 shadow-sm">
                        <Globe className="h-5 w-5 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground">Market Radar</p>
                        <p className="text-xs text-muted-foreground">Research your market</p>
                      </div>
                    </Link>
                  </div>
                  
                  {/* View All Link */}
                  <Link 
                    to="/ai-tools" 
                    className="flex items-center justify-center gap-2 p-3 rounded-xl bg-primary/5 hover:bg-primary/10 transition-colors"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <Sparkles className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium text-primary">Open Command Center</span>
                  </Link>
                </div>
              )}
            </div>
            <Link 
              to="/create-listing" 
              className="text-sm font-medium py-2"
              onClick={() => setIsMenuOpen(false)}
            >
              List Your Asset
            </Link>
            
            <div className="flex flex-col gap-2 pt-2 border-t border-border">
              {user ? (
                <>
                  <Link 
                    to="/profile" 
                    className="flex items-center gap-2 text-sm font-medium py-2"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <User className="h-4 w-4" />
                    My Profile
                  </Link>
                  <Link 
                    to="/dashboard" 
                    className="flex items-center gap-2 text-sm font-medium py-2"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <LayoutDashboard className="h-4 w-4" />
                    Dashboard
                  </Link>
                  <Link 
                    to="/messages" 
                    className="flex items-center gap-2 text-sm font-medium py-2"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <MessageCircle className="h-4 w-4" />
                    Messages
                  </Link>
                  {!isVerified && (
                    <Link 
                      to="/verify-identity" 
                      className="flex items-center gap-2 text-sm font-medium py-2 text-amber-600"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <Shield className="h-4 w-4" />
                      Verify Identity
                    </Link>
                  )}
                  {isAdmin && (
                    <Link 
                      to="/admin" 
                      className="flex items-center gap-2 text-sm font-medium py-2 text-primary"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <ShieldCheck className="h-4 w-4" />
                      Admin Dashboard
                    </Link>
                  )}
                  <Link 
                    to="/how-it-works" 
                    className="flex items-center gap-2 text-sm font-medium py-2"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <HelpCircle className="h-4 w-4" />
                    How It Works
                  </Link>
                  <Link 
                    to="/contact" 
                    className="flex items-center gap-2 text-sm font-medium py-2"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <Phone className="h-4 w-4" />
                    Contact Us
                  </Link>
                  <div className="pt-2 border-t border-border mt-2">
                    <Button 
                      variant="ghost" 
                      className="w-full rounded-full justify-start gap-2"
                      onClick={() => {
                        handleSignOut();
                        setIsMenuOpen(false);
                      }}
                    >
                      <LogOut className="h-4 w-4" />
                      Sign Out
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <Link 
                    to="/how-it-works" 
                    className="flex items-center gap-2 text-sm font-medium py-2"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <HelpCircle className="h-4 w-4" />
                    How It Works
                  </Link>
                  <Link 
                    to="/contact" 
                    className="flex items-center gap-2 text-sm font-medium py-2"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <Phone className="h-4 w-4" />
                    Contact Us
                  </Link>
                  <div className="pt-2 border-t border-border mt-2 flex flex-col gap-2">
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
                </>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
};

export default Header;
