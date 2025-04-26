import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import AdvancedLocationSearch from '../sub-components/AdvancedLocationSearch';
import Select from 'react-select';
import languages from "../assets/languages.json";

// Language options for multi-select dropdown
const languageOptions = languages.map((lang) => ({
  value: lang.code,
  label: lang.name,
}));

interface LocationOption {
  value: string;
  label: string;
}

interface Location {
  country: LocationOption | undefined;
  province: LocationOption | undefined;
  city:LocationOption | undefined;
}

interface Filter {
  country: LocationOption | undefined;
  province: LocationOption | undefined;
  city:LocationOption | undefined;
  languages: LocationOption[],
  type: 'Volunteer' | 'Paid' | undefined,
}

interface Host {
  _id: string;
  name: string;
  profilePicture: string;
  type: 'Volunteer' | 'Paid';
  rate: number;
  languages: { value: string; label: string }[];
  open: 'Yes' | 'No';
  bio: string;
  country?: { value: string; label: string };
  province?: { value: string; label: string };
  city?: { value: string; label: string };
}

interface HostCardProps {
  host: Host;
}

const HostCard: React.FC<HostCardProps> = ({ host }) => (
  <div className="host-card">
    <div className="host-header">
      <div className="host-avatar">      
        {host.profilePicture ? (     
            <img 
              src={host.profilePicture} 
              alt={host.name} 
            />                     
        ) : (
          <div className="avatar-placeholder">
            {(host.name || host.name).charAt(0).toUpperCase()}
          </div>
        )}
      </div>
      <div className="host-info">
        <h3 className="host-name">{host.name}</h3>
        <span className="response-time">{host.type === "Paid" ? ("$" + host.rate + " p/h") : (host.type) }</span>
      </div>
    </div>
    
    <div className="host-stats">
     
      <div className="stat-item">
        <span className="stat-label">Speaks:</span>
        <span className="stat-value">
          {host.languages?.length > 0 
            ? host.languages.map(lang => lang.label).join(', ') 
            : 'No languages specified'}
        </span>
      </div>
      {host.country && (
        <div className="stat-item">
          <span className="stat-label">Location:</span>
          <span className="stat-value">
            {host.city?.label ? `${host.city.label}, ` : ''}
            {host.province?.label ? `${host.province.label}, ` : ''}
            {host.country.label}
          </span>
        </div>
      )}
    </div>

    <p className="host-description">{host.bio || 'No description available'}</p>
    
    {host.open === 'Yes' && (
      <button className="status-badge accepting">Accepting Guests</button>
    )}
  </div>
);

const HostListing: React.FC = () => {

  const routeLocation = useLocation();

  // Filter States
  const [hostType, setHostType] = useState<'Volunteer' | 'Paid' | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [selectedLanguages, setSelectedLanguages] = useState<LocationOption[]>([]);
  //const [hosts, setHosts] = useState<Host[]>([]);

  const [isLoading, setIsLoading] = useState(false);
  const [filteredHosts, setFilteredHosts] = useState<Host[]>([]);
  
  // Store filters that will be applied when the user clicks "Apply Filters"
  const [pendingLocationFilter, setPendingLocationFilter] = useState<Location>({ country: undefined, province: undefined, city: undefined });
  const [activeFilters, setActiveFilters] = useState<Filter>({ country: undefined, province: undefined, city: undefined, languages: [], type: undefined });

  // Parse query params from URL on component mount
  useEffect(() => {
    const result = routeLocation.state?.result;
    if (result) {
      const fullParts = result.label.full || [];
      const len =  fullParts.length? fullParts.length : 1;

    console.log(fullParts, len)

      let country, province, city;
    
      if (len === 1) {
        // only country
        country = fullParts;
      } else if (len === 2) {
        // province + country
        [province, country] = fullParts;
      } else if (len === 3) {
        // city + province + … + country
        city     = fullParts[0];
        province = fullParts[1];
        country  = fullParts[2];
      }

      console.log(country, province, city)
      handleLocationSelect({ country, province, city });
    }
    else {
      // no initial location → just fetch all open hosts
      fetchHosts({
        country:  undefined,
        province: undefined,
        city:     undefined,
        languages: [],
        type:     undefined
      });
    }
  }, [routeLocation]);




  // Fetch hosts with applied filters
  const fetchHosts = async (filters: any) => {
    setIsLoading(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/hosts`, {
        method: 'POST',
        body: JSON.stringify(filters),
        headers: {
          'Content-Type': 'application/json'
        }
      });
  
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data)) {
          setFilteredHosts(data);
          //setHosts(data);
        } else {
          console.error('Unexpected response format:', data);
          setFilteredHosts([]);
        }
      } else {
        console.error('Failed to fetch hosts, server returned:', response.status);
        setFilteredHosts([]);
      }
    } catch (error) {
      console.error('Failed to fetch hosts:', error);
      setFilteredHosts([]);
    } finally {
      setIsLoading(false);
    }
  };


  // Handle host type radio button change
  const handleHostTypeChange = (type: 'Volunteer' | 'Paid' | null) => {
    setHostType(type);
  };

  const handleLocationSelect = (location: {
    country?: LocationOption;
    province?: LocationOption;
    city?: LocationOption;
  }) => {
    // — your existing state updates —
    setSelectedLocation({
      country:  location.country,
      province: location.province  || { value: '', label: '' },
      city:     location.city      || { value: '', label: '' }
    });
  
    setPendingLocationFilter({
      country:  location.country,
      province: location.province,
      city:     location.city
    });
  
    // — NEW: build the full filters object and fetch immediately —
    const newFilters: Filter = {
      country:  location.country,
      province: location.province,
      city:     location.city,
      languages: selectedLanguages,
      type:     hostType || undefined
    };
  
    // update “activeFilters” UI summary if you need it
    setActiveFilters(newFilters);
  
    // fire the query
    fetchHosts(newFilters);
  };
  
  const handleLanguageChange = (selected: any) => {
    setSelectedLanguages(selected || []);
  };


  // At the end, it is taking all states for filters and applying them
  const applyFilters = () => {
    const locationFilters = selectedLocation ? {
      country: selectedLocation.country || undefined,
      province: selectedLocation.province || undefined,
      city: selectedLocation.city || undefined,
    } : pendingLocationFilter;
  
    const newFilters = {
      ...locationFilters,
      languages: selectedLanguages,
      type: hostType || undefined as 'Volunteer' | 'Paid' | undefined
    };
    
    // Update active filters
    setActiveFilters(newFilters);
    
    // Fetch hosts with new filters
    fetchHosts(newFilters);

    //console.log(newFilters)
  };

  const clearFilters = () => {

    setHostType(null);
    setSelectedLocation(null);
    setSelectedLanguages([]);
    setPendingLocationFilter({
      country: undefined,
      province: undefined,
      city: undefined
    });
    
    // Clear active filters
    const emptyFilters = {
      country: undefined,
      province: undefined,
      city: undefined,
      languages: [],
      type: "" as "Volunteer" | "Paid" | undefined
    };

    setActiveFilters(emptyFilters);
    fetchHosts(emptyFilters);
  };

  // Generate a summary of active filters for display
  const getFilterSummary = () => {
    const parts = [];
    
    if (activeFilters.type) {
      parts.push(activeFilters.type === 'Paid' ? 'Paid Hosts' : 'Volunteer Hosts');
    }
    
    if (selectedLocation) {
      parts.push(`in ${selectedLocation.city?.label || selectedLocation.province?.label || selectedLocation.country?.label }`); //update if wrong
    }
    
    if (activeFilters.languages.length > 0) {
      const languageNames = activeFilters.languages.map(code => {
        return code.label;
      });
      
      if (languageNames.length === 1) {
        parts.push(`speaking ${languageNames[0]}`);
      } else if (languageNames.length === 2) {
        parts.push(`speaking ${languageNames[0]} or ${languageNames[1]}`);
      } else {
        parts.push(`speaking ${languageNames.slice(0, -1).join(', ')} or ${languageNames[languageNames.length - 1]}`);
      }
    }
    
    return parts.join(' ');
  };

  return (
    <div className="listing-container">
      {/* Filters Sidebar */}
      <div className="filters-sidebar">
        <div className="filter-section">
          <h3 className="filter-title">Filters</h3>

          <div className="filter-group">
            <div className="filter-header">
              <label className="filter-label">Advanced Location Search</label>
            </div>
            <AdvancedLocationSearch 
              onSelect={handleLocationSelect}
              //initialValue={selectedLocation}
            />
          </div>
          
          <div className="filter-group">
            <label className="filter-label">Host Type</label>
            <div className="radio-group">
              <label className="radio-item">
                <input 
                  type="radio"
                  name="hostType"
                  checked={hostType === 'Volunteer'}
                  onChange={() => handleHostTypeChange('Volunteer')}
                />
                <span className="radio-mark" />
                Volunteer Hosts
              </label>
              <label className="radio-item">
                <input 
                  type="radio"
                  name="hostType"
                  checked={hostType === 'Paid'}
                  onChange={() => handleHostTypeChange('Paid')}
                />
                <span className="radio-mark" />
                Paid Hosts
              </label>
              <label className="radio-item">
                <input 
                  type="radio"
                  name="hostType"
                  checked={hostType === null}
                  onChange={() => handleHostTypeChange(null)}
                />
                <span className="radio-mark" />
                All Types
              </label>
            </div>
          </div>
          
          <div className="filter-group">
            <label className="filter-label">Languages</label>
            <Select
              isMulti
              name="languages"
              options={languageOptions}
              className="language-select"
              classNamePrefix="select"
              value={selectedLanguages}
              onChange={handleLanguageChange}
              placeholder="Select languages..."
            />
          </div>
          
          <div className="filter-actions">
            <button 
              className="apply-filters-btn primary-button" 
              onClick={applyFilters}
            >
              Apply Filters
            </button>
            
            <button 
              className="clear-filters-btn secondary-button" 
              onClick={clearFilters}
            >
              Clear All Filters
            </button>
          </div>
        </div>
      </div>

      {/* Main Listing */}
      <div className="hosts-list">
        <div className="results-header">
          <h2 className="results-count">
            {isLoading 
              ? 'Loading hosts...' 
              : `${filteredHosts.length} results ${getFilterSummary() ? `(${getFilterSummary()})` : ''}`}
          </h2>
        </div>

        {isLoading ? (
          <div className="loading">Loading hosts...</div>
        ) : filteredHosts.length > 0 ? (
          filteredHosts.map(host => (
            <HostCard key={host._id} host={host} />
          ))
        ) : (
          <div className="no-results">
            No hosts found with the current filters. Try adjusting your search criteria.
          </div>
        )}
      </div>
    </div>
  );
};

export default HostListing;