import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import AdvancedLocationSearch from '../sub-components/AdvancedLocationSearch';
import Select from 'react-select';
import languages from "../assets/languages.json";
import { Host, Filter, LocationOption } from '../utilities/props';
import HostCard from '../sub-components/HostCard';
import { ArrowBigLeftDash, ArrowBigRightDash } from 'lucide-react'

const languageOptions = languages.map((lang) => ({
  value: lang.code,
  label: lang.name,
}));

interface Location {
  country: LocationOption | undefined;
  province: LocationOption | undefined;
  city: LocationOption | undefined;
  [key: string]: any;
}

interface HostsResponse {
  hosts: Host[];
  totalCount: number;
}

const HostListing: React.FC = () => {
  const routeLocation = useLocation();

  const [hostType, setHostType] = useState<'Volunteer' | 'Paid' | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [selectedLanguages, setSelectedLanguages] = useState<LocationOption[]>([]);

  const [isLoading, setIsLoading] = useState(false);
  const [filteredHosts, setFilteredHosts] = useState<Host[]>([]);
  const [totalHostsCount, setTotalHostsCount] = useState(0);

  const [page, setPage] = useState(1);
  const limit = 5; 
  
  // Store filters that will be applied when the user clicks "Apply Filters"
  const [pendingLocationFilter, setPendingLocationFilter] = useState<Location>({ 
    country: undefined, 
    province: undefined, 
    city: undefined 
  });
  
  const [activeFilters, setActiveFilters] = useState<Filter>({ 
    country: undefined, 
    province: undefined, 
    city: undefined, 
    languages: [], 
    type: undefined 
  });

  // Parse query params from URL on component mount
  useEffect(() => {
    const { result, newHistoryItem } = routeLocation.state || {};
    const incoming = newHistoryItem ?? result;
  
    if (incoming) {
      const {
        country,
        province,
        city,
        value,
        label,
        isManualSearch
      } = incoming;

      handleLocationSelect({
        country,
        province,
        city,
        value,
        label,
        isManualSearch
      });

      fetchHosts({
        country,
        province,
        city,
        value,
        label,
        isManualSearch
      });
    } else {
      // no incoming filters
      fetchHosts(activeFilters);
    }
  }, [routeLocation]);
  
  // Fetch hosts with applied filters
  const fetchHosts = async (filters: any, currentPage: number = 1) => {
    setIsLoading(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/hosts`, {
        method: 'POST',
        body: JSON.stringify({ ...filters, page: currentPage, limit }),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data: HostsResponse = await response.json();
        
        if (data && data.hosts) {
          setFilteredHosts(data.hosts);
          setTotalHostsCount(data.totalCount);
        } else {
          console.error('Unexpected response format:', data);
          setFilteredHosts([]);
          setTotalHostsCount(0);
        }
      } else {
        console.error('Failed to fetch hosts, server returned:', response.status);
        setFilteredHosts([]);
        setTotalHostsCount(0);
      }
    } catch (error) {
      console.error('Failed to fetch hosts:', error);
      setFilteredHosts([]);
      setTotalHostsCount(0);
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate if there are more pages available
  const hasNextPage = () => {
    const totalPages = Math.ceil(totalHostsCount / limit);
    return page < totalPages;
  };

  // Handle host type radio button change
  const handleHostTypeChange = (type: 'Volunteer' | 'Paid' | null) => {
    setHostType(type);
  };

  const handleLocationSelect = (location: {
    country?: LocationOption;
    province?: LocationOption;
    city?: LocationOption;
    [key: string]: any;
  }) => {
    setSelectedLocation({
      country: location.country,
      province: location.province || { value: '', label: '' },
      city: location.city || { value: '', label: '' }
    });
  
    setPendingLocationFilter({
      country: location.country,
      province: location.province,
      city: location.city
    });
  
    // Build the full filters object for state update
    const newFilters: Filter = {
      country: location.country,
      province: location.province,
      city: location.city,
      languages: selectedLanguages,
      type: hostType || undefined,
      value: location.value,
      label: location.label,
      isManualSearch: location.isManualSearch,
    };
  
    // Update active filters UI summary
    setActiveFilters(newFilters);
  };
  
  const handleLanguageChange = (selected: any) => {
    setSelectedLanguages(selected || []);
  };

  // Apply all filters and fetch hosts
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

    // Reset to page 1 when applying new filters
    setPage(1);
    
    // Update active filters
    setActiveFilters(newFilters);
    
    // Fetch hosts with new filters
    fetchHosts(newFilters, 1);
  };

  const clearFilters = () => {
    setHostType(null);
    setPage(1);
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
      type: undefined as "Volunteer" | "Paid" | undefined
    };

    setActiveFilters(emptyFilters);
    fetchHosts(emptyFilters, 1);
  };

  // Generate a summary of active filters for display
  const getFilterSummary = () => {
    const parts = [];

    if (activeFilters.isManualSearch && activeFilters.label) {
      return `in ${activeFilters.label}`;
    }
    
    if (activeFilters.type) {
      parts.push(activeFilters.type === 'Paid' ? 'Paid Hosts' : 'Volunteer Hosts');
    }
    
    if (
      selectedLocation &&
      (selectedLocation.country?.label || selectedLocation.province?.label || selectedLocation.city?.label)
    ) {
      parts.push(`in ${selectedLocation.city?.label || selectedLocation.province?.label || selectedLocation.country?.label}`);
    }
    
    if (activeFilters.languages && activeFilters.languages.length > 0) {
      const languageNames = activeFilters.languages.map(lang => lang.label);
      
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
              : `${totalHostsCount} ${totalHostsCount === 1 ? 'result' : 'results'} ${getFilterSummary() ? `(${getFilterSummary()})` : ''}`}
          </h2>
          <button 
            className="clear-filters-btn primary-button" 
            onClick={clearFilters}
          >
            Clear All Filters
          </button>
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

        {/* Only show pagination if there are results */}
        {filteredHosts.length > 0 && (
          <div className="pagination-controls">
            <button 
              className='arrow-icon-btn'
              disabled={page === 1} 
              onClick={() => {
                const newPage = page - 1;
                setPage(newPage);
                fetchHosts(activeFilters, newPage);
              }}
            >
             <ArrowBigLeftDash size={27}/>
            </button>

            <span>Page {page}</span>

            <button 
              className='arrow-icon-btn'
              disabled={!hasNextPage()} 
              onClick={() => {
                const newPage = page + 1;
                setPage(newPage);
                fetchHosts(activeFilters, newPage);
              }}
            >
              <ArrowBigRightDash size={27}/>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default HostListing;