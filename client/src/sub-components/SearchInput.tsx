import React, { useState, useEffect, useCallback } from 'react';
import { useDebounce } from '../utilities/useDebounce';
import { useDisclosure } from '../utilities/useDisclosure';
import DismissableOverlay from './DismissableOverlay';
import { Search, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export interface SearchResult {
  id: number;
  label: string,
  type: string;
  country?: { value: string; label: string };
  province?: { value: string; label: string };
  city?: { value: string; label: string };
  [key: string]: any;
}

interface SearchInputProps {
  endpoint: string;
  placeholder?: string;
  historyKey: string;
  transformData: (data: any) => SearchResult[];
  onSelect?: (result: SearchResult) => void;
  searchType?: string;
}

const SearchInput: React.FC<SearchInputProps> = ({
  endpoint,
  placeholder = 'Search...',
  historyKey,
  transformData,
  onSelect,
  searchType,
}) => {

  // Search states
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [history, setHistory] = useState<SearchResult[]>([]);

  // Utility states
  const [isLoading, setIsLoading] = useState(false);
  const debouncedQuery = useDebounce(query, 300);
  const disclosure = useDisclosure();
  const navigate = useNavigate();

  // ----------------------
  // Search history management (sessionStorage)
  // ----------------------
  useEffect(() => {
    // Load history from sessionStorage instead of localStorage
    const savedHistory = sessionStorage.getItem(historyKey);
    setHistory(savedHistory ? JSON.parse(savedHistory) : []);
  }, [historyKey]);

  useEffect(() => {
    if (history.length > 0) {
      // Persist history in sessionStorage
      sessionStorage.setItem(historyKey, JSON.stringify(history));
    }
  }, [history, historyKey]);

  // ----------------------
  // Search functionality
  // ----------------------
  useEffect(() => {
    const fetchResults = async () => {
      if (debouncedQuery.length < 2) {
        disclosure.onClose(); // close dropdown if too short
        return;
      }

      setIsLoading(true);
      try {
        const response = await fetch(
          `${import.meta.env.VITE_API_URL}${endpoint}?query=${encodeURIComponent(debouncedQuery)}`
        );

        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Search failed');

        setResults(transformData(data));
        disclosure.onOpen(); // open dropdown when results present
      } catch (error) {
        console.error('Backend responded with error:', error);
        disclosure.onClose();
      } finally {
        setIsLoading(false);
      }
    };

    if (debouncedQuery.trimStart() && debouncedQuery.length > 2) {
      fetchResults();
    }
  }, [debouncedQuery]);

  const handleSearch = useCallback(() => {
    const cleanQuery = query.trim();
    if (cleanQuery.length >= 2) {
      const encodedQuery = encodeURIComponent(cleanQuery);
      const searchPath = `/host-listing`;

      // Create history item for manual search
      const newHistoryItem: SearchResult = {
        id: Date.now(),
        value: encodedQuery,
        label: cleanQuery,
        type: 'other',
        country: undefined,
        province: undefined,
        city: undefined,
        isManualSearch: true,
      };

      // Update session-based search history
      setHistory(prev => [
        newHistoryItem,
        ...prev.filter(item => item.value !== encodedQuery)
      ].slice(0, 5));

      navigate(searchPath, { state: { newHistoryItem } });
      setQuery('');
      disclosure.onClose();
    }
  }, [query, navigate, disclosure]);

  const handleSelect = (result: SearchResult) => {
    setQuery('');
    setResults([])
    disclosure.onClose();

    setHistory(prev => [
      result,
      ...prev.filter(item => item.id !== result.id)
    ].slice(0, 5));

    if (onSelect) {
      onSelect(result);
    } else {
      navigate(`/search/${searchType}/${encodeURIComponent(result.value)}`);
    }
  };

  return (
    <div className="search-form">
      <div className="search-input-wrapper">
        <input
          className="search-input"
          type="search"
          placeholder={placeholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => disclosure.onOpen()}
          aria-label={placeholder}
          //@ts-ignore
          ref={disclosure.triggerRef}
        />
        <button
          className="search-btn"
          type="button"
          onClick={handleSearch}
        >
          <Search size={18} />
        </button>
      </div>

      <DismissableOverlay
        isOpen={disclosure.isOpen}
        onClose={disclosure.onClose}
        ref={disclosure.overlayRef}
        className="search-dropdown"
      >
        <div className="search-results">
          {isLoading && <div className="dropdown-item">Loading...</div>}

          {!isLoading && results.length > 0 && (
            <ul className="dropdown-list">
              {results.map(result => (
                <li
                  key={result.id}
                  className="dropdown-item"
                  onClick={() => handleSelect(result)}
                >
                  {result.label}
                </li>
              ))}
            </ul>
          )}

          {!isLoading && results.length === 0 && debouncedQuery.length >= 2 && (
            <div className="dropdown-item">No results found</div>
          )}

          {!isLoading && debouncedQuery.length < 2 && (
            history.length > 0 ? (
              <ul className="dropdown-list">
                {history.map(item => (
                  <li
                    key={item.id}
                    className="dropdown-item history-item"
                    onClick={() => handleSelect(item)}
                  >
                    <Clock size={14} className="history-icon" />
                    {item.label}
                  </li>
                ))}
              </ul>
            ) : (
              <div className="dropdown-item">No recent searches</div>
            )
          )}
        </div>
      </DismissableOverlay>
    </div>
  );
};

export default SearchInput;