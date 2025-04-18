import React, { useState, useEffect, useRef } from 'react';
import { useDebounce } from '../utilities/useDebounce';
import { useDisclosure } from '../utilities/useDisclosure';
import { fetchWithAuth } from '../utilities/api';

interface Location {
  id: string;
  value: string;
  label: string;
  name: string;
  country: { value: string; label: string };
  province: { value: string; label: string };
}

interface LocationSearchProps {
  onLocationSelect?: (location: Location) => void;
}

const LocationSearch: React.FC<LocationSearchProps> = ({ onLocationSelect }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [locations, setLocations] = useState<Location[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const debouncedSearchQuery = useDebounce(searchQuery, 500);
  const { isOpen, onOpen, onClose, overlayRef } = useDisclosure();
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch locations when debounced search query changes
  useEffect(() => {
    const fetchLocations = async () => {
      if (debouncedSearchQuery.length < 2) {
        setLocations([]);
        return;
      }

      setIsLoading(true);
      try {
        // Use fetch without auth for public endpoints
        const response = await fetch(`${import.meta.env.VITE_API_URL}/search/locations?query=${encodeURIComponent(debouncedSearchQuery)}`);
        if (!response.ok) throw new Error('Failed to fetch locations');
        
        const data = await response.json();
        setLocations(data);
        if (data.length > 0) onOpen();
      } catch (error) {
        console.error('Error fetching locations:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (debouncedSearchQuery) {
      fetchLocations();
    } else {
      setLocations([]);
      onClose();
    }
  }, [debouncedSearchQuery, onOpen, onClose]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    if (e.target.value.length > 0) {
      onOpen();
    } else {
      onClose();
    }
  };

  const handleLocationSelect = (location: Location) => {
    setSearchQuery(location.label);
    if (onLocationSelect) {
      onLocationSelect(location);
    }
    onClose();
  };

  return (
    <div className="location-search-container">
      <div className="search-input-wrapper">
        <input
          ref={inputRef}
          className="search-input-hero"
          type="search"
          placeholder="Search a location..."
          value={searchQuery}
          onChange={handleInputChange}
          aria-label="Search for a location"
          onClick={() => searchQuery.length > 0 && onOpen()}
        />
        <button className="search-btn-hero" type="submit">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
        </button>
      </div>

      {isOpen && (
        <div ref={overlayRef} className="location-results-dropdown">
          {isLoading ? (
            <div className="loading-indicator">Loading...</div>
          ) : locations.length > 0 ? (
            <ul className="location-results-list">
              {locations.map((location) => (
                <li 
                  key={location.id} 
                  className="location-result-item"
                  onClick={() => handleLocationSelect(location)}
                >
                  {location.label}
                </li>
              ))}
            </ul>
          ) : debouncedSearchQuery.length >= 2 ? (
            <div className="no-results">No locations found</div>
          ) : null}
        </div>
      )}
    </div>
  );
};

export default LocationSearch;