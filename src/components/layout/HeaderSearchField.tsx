import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';

interface HeaderSearchFieldProps {
  className?: string;
}

const HeaderSearchField = ({ className }: HeaderSearchFieldProps) => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/homepage2?q=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      navigate('/homepage2');
    }
  };

  return (
    <form onSubmit={handleSubmit} className={`flex items-center ${className || ''}`}>
      <div className="relative flex items-center">
        <Search className="absolute left-2.5 w-3.5 h-3.5 text-white/50 pointer-events-none" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search listings..."
          className="h-8 w-32 sm:w-44 pl-8 pr-3 rounded-xl bg-white/15 border border-white/20 text-white text-xs placeholder:text-white/40 focus:outline-none focus:bg-white/20 focus:border-white/40 transition-all"
        />
      </div>
    </form>
  );
};

export default HeaderSearchField;
