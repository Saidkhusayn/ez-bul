import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { fetchWithAuth } from "../utilities/api";
import LocationSearch from '../sub-components/SearchInput';

interface Location {
  id: string;
  value: string;
  label: string;
  name: string;
  country: { value: string; label: string };
  province: { value: string; label: string };
}

interface Host {
  id: string;
  name: string;
  type: 'Volunteer' | 'Paid';
  responseTime: string;
  references: number;
  friends: number;
  languages: { value: string; label: string }[];
  open: 'Yes' | 'No';
  description: string;
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
        <div className="avatar-placeholder">{host.name[0]}</div>
        <div className={`status-indicator ${host.open === 'Yes' ? 'online' : ''}`} />
      </div>
      <div className="host-info">
        <h3 className="host-name">{host.name}</h3>
        <span className="response-time">{host.responseTime || 'No response time data'}</span>
      </div>
    </div>
    
    <div className="host-stats">
      <div className="stat-item">
        <span className="stat-label">References:</span>
        <span className="stat-value">{host.references || 0}</span>
      </div>
      <div className="stat-item">
        <span className="stat-label">Friends:</span>
        <span className="stat-value">{host.friends || 0}</span>
      </div>
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

    <p className="host-description">{host.description || 'No description available'}</p>
    
    {host.open === 'Yes' && (
      <button className="status-badge accepting">Accepting Guests</button>
    )}
  </div>
);

const HostListing: React.FC = () => {
  const routeLocation = useLocation();
  const [selectedType, setSelectedType] = useState<'Volunteer' | 'Paid' | 'all'>('all');
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [travelerCount, setTravelerCount] = useState('Any');
  const [hosts, setHosts] = useState<Host[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [filteredHosts, setFilteredHosts] = useState<Host[]>([]);
  
  // Parse query params from URL on component mount
  useEffect(() => {
    const params = new URLSearchParams(routeLocation.search);
    const locationId = params.get('locationId');
    const locationName = params.get('locationName');
    const country = params.get('country');
    const province = params.get('province');
    
    if (locationId && locationName && country) {
      setSelectedLocation({
        id: locationId,
        value: locationId,
        label: locationName,
        name: locationName,
        country: { 
          value: country.split(':')[0] || '', 
          label: country.split(':')[1] || '' 
        },
        province: { 
          value: province?.split(':')[0] || '', 
          label: province?.split(':')[1] || '' 
        }
      });
    }
  }, [routeLocation]);

  // Fetch hosts
  useEffect(() => {
    const fetchHosts = async () => {
      setIsLoading(true);
      try {
        // We'll fetch all users and filter them locally
        const response = await fetchWithAuth('/profile/hosts');
        if (response && Array.isArray(response)) {
          setHosts(response);
        }
      } catch (error) {
        console.error('Failed to fetch hosts:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchHosts();
  }, []);

  // Filter hosts based on selected filters
  useEffect(() => {
    let filtered = [...hosts];

    // Filter by type
    if (selectedType !== 'all') {
      filtered = filtered.filter(host => host.type === selectedType);
    }

    // Filter by location
    if (selectedLocation) {
      filtered = filtered.filter(host => {
        // Match by country
        if (host.country?.value === selectedLocation.country.value) {
          // If province is specified, match by province too
          if (selectedLocation.province.value && host.province?.value) {
            return host.province.value === selectedLocation.province.value;
          }
          return true; // Match by country if province not specified
        }
        return false;
      });
    }

    // Filter by status (only showing accepting hosts)
    filtered = filtered.filter(host => host.open === 'Yes');

    setFilteredHosts(filtered);
  }, [hosts, selectedType, selectedLocation]);

  const clearFilters = () => {
    setSelectedType('all');
    setSelectedLocation(null);
    setTravelerCount('Any');
  };

  const handleLocationSelect = (location: Location) => {
    setSelectedLocation(location);
  };

  return (
    <div className="listing-container">
      {/* Filters Sidebar */}
      <div className="filters-sidebar">
        <div className="filter-section">
          <h3 className="filter-title">Filters</h3>
          
          <div className="filter-group">
            <label className="filter-label">Type</label>
            <div className="checkbox-group">
              <label className="checkbox-item">
                <input 
                  type="checkbox"
                  checked={selectedType === 'Volunteer'}
                  onChange={() => setSelectedType('Volunteer')}
                />
                <span className="checkmark" />
                Volunteer Hosts
              </label>
              <label className="checkbox-item">
                <input 
                  type="checkbox"
                  checked={selectedType === 'Paid'}
                  onChange={() => setSelectedType('Paid')}
                />
                <span className="checkmark" />
                Paid Hosts
              </label>
            </div>
          </div>

          <div className="filter-group">
            <label className="filter-label">Location</label>
            <LocationSearch 
              //onLocationSelect={handleLocationSelect}
              endpoint="/search/locations"
              placeholder="Search cities..."
              historyKey="citySearchHistory"
              //@ts-ignore
              transformData={(data) => data.cities.map(transformCity)}
            />
          </div>

          <div className="filter-group">
            <label className="filter-label">Travelers</label>
            <select
              className="traveler-select"
              value={travelerCount}
              onChange={(e) => setTravelerCount(e.target.value)}
            >
              <option value="Any">Any</option>
              <option value="1">1</option>
              <option value="2">2</option>
              <option value="3+">3+</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Listing */}
      <div className="hosts-list">
        <div className="results-header">
          <h2 className="results-count">
            {isLoading 
              ? 'Loading hosts...' 
              : `${filteredHosts.length} results ${selectedLocation ? `in ${selectedLocation.label}` : ''}`}
          </h2>
          <button className="clear-filters" onClick={clearFilters}>
            Clear Filters
          </button>
        </div>

        {isLoading ? (
          <div className="loading">Loading hosts...</div>
        ) : filteredHosts.length > 0 ? (
          filteredHosts.map(host => (
            <HostCard key={host.id} host={host} />
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