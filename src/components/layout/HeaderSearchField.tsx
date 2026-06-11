import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { trackEventToDb } from '@/hooks/useAnalyticsEvents';
import { trackLeadEvent } from '@/lib/leadTracking';

interface HeaderSearchFieldProps {
  className?: string;
}

const HeaderSearchField = ({ className }: HeaderSearchFieldProps) => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim();
    trackEventToDb('search_submit', 'search', { query: q, source: 'header' });
    trackLeadEvent('search_performed', { query: q, source: 'header' });
    if (q) {
      navigate(`/homepage2?q=${encodeURIComponent(q)}`);
    } else {
      navigate('/homepage2');
    }
  };

  const handleFocus = () => {
    trackEventToDb('search_focus', 'search', { source: 'header' });
  };

  return (
    <form onSubmit={handleSubmit} className={`flex items-center w-full ${className || ''}`}>
      <div className="relative flex items-center w-full">
        <Search className="absolute left-4 w-4 h-4 text-white/55 pointer-events-none" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onFocus={handleFocus}
          placeholder="Search food trucks, trailers, tools..."
          className="h-[52px] w-full pl-11 pr-4 rounded-full text-[15px] font-medium text-[#F4F4F4] placeholder:text-white/45 focus:outline-none focus:border-white/20 transition-all"
          style={{
            background: 'rgba(18,18,18,0.92)',
            border: '1px solid rgba(255,255,255,0.08)',
            boxShadow:
              'inset 0 1px 0 rgba(255,255,255,0.04), 0 4px 18px rgba(0,0,0,0.35)',
          }}
        />
      </div>
    </form>
  );
};

export default HeaderSearchField;
