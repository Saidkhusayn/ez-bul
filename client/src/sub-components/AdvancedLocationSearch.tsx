import React, { useState, useEffect } from 'react';
import { LocationOption } from '../utilities/props';
const GEONAMES_ID = import.meta.env.VITE_GEONAMES_ID;

interface AdvancedLocationSearchProps {
  onSelect: (location: {
    country?: LocationOption;
    province?: LocationOption;
    city?: LocationOption;
  }) => void;
}

const AdvancedLocationSearch: React.FC<AdvancedLocationSearchProps> = ({
  onSelect,
}) => {

  // Location Options States
  const [countryOptions, setCountryOptions] = useState<LocationOption[]>([]);
  const [provinceOptions, setProvinceOptions] = useState<LocationOption[]>([]);
  const [cityOptions, setCityOptions] = useState<LocationOption[]>([]);

  // Location Loading States
  const [isLoadingCountries, setIsLoadingCountries] = useState(false);
  const [isLoadingProvinces, setIsLoadingProvinces] = useState(false);
  const [isLoadingCities, setIsLoadingCities] = useState(false);
  
  // Selected Locations States
  const [selectedCountry, setSelectedCountry] = useState<LocationOption | null>(null);
  const [selectedProvince, setSelectedProvince] = useState<LocationOption | null>(null);
  const [selectedCity, setSelectedCity] = useState<LocationOption | null>(null);

  // Fetch countries from GeoNames when component mounts
  useEffect(() => {
    const fetchCountries = async () => {
      setIsLoadingCountries(true);
      try {
        const res = await fetch(`http://api.geonames.org/countryInfoJSON?username=${GEONAMES_ID}`);
        if (res.ok) {
          const data = await res.json();
          const options: LocationOption[] = data.geonames.map((country: any) => ({
            value: country.geonameId.toString(),
            label: country.countryName,
          }));
          options.sort((a, b) => a.label.localeCompare(b.label));
          setCountryOptions(options);
        }
      } catch (error) {
        console.error("Error fetching countries:", error);
      } finally {
        setIsLoadingCountries(false);
      }
    };

    fetchCountries();
  }, []);

  // Fetch provinces based on selected country
  useEffect(() => {
    if (!selectedCountry) {
      setProvinceOptions([]);
      setSelectedProvince(null);
      setSelectedCity(null);
      return;
    }
    
    const fetchProvinces = async () => {
      setIsLoadingProvinces(true);
      try {
        const countryValue = selectedCountry.value;
        const res = await fetch(
          `http://api.geonames.org/childrenJSON?geonameId=${countryValue}&username=${GEONAMES_ID}`
        );
        if (res.ok) {
          const data = await res.json();
          const options: LocationOption[] = data.geonames.map((prov: any) => ({
            value: prov.geonameId.toString(),
            label: prov.name || prov.adminName1,
          }));

          // Remove duplicates if any
          const uniqueOptions = Array.from(
            new Map(options.map((opt) => [opt.value, opt])).values()
          );
          uniqueOptions.sort((a, b) => a.label.localeCompare(b.label));
          setProvinceOptions(uniqueOptions);
        }
      } catch (error) {
        console.error("Error fetching provinces:", error);
      } finally {
        setIsLoadingProvinces(false);
      }
    };

    fetchProvinces();
  }, [selectedCountry]);

  // Fetch cities based on selected province
  useEffect(() => {
    if (!selectedProvince) {
      setCityOptions([]);
      setSelectedCity(null);
      return;
    }
    
    const fetchCities = async () => {
      setIsLoadingCities(true);
      try {
        const provinceValue = selectedProvince.value;
        const res = await fetch(
          `http://api.geonames.org/childrenJSON?geonameId=${provinceValue}&username=${GEONAMES_ID}`
        );
        if (res.ok) {
          const data = await res.json();
          const options: LocationOption[] = data.geonames.map((city: any) => ({
            value: city.geonameId.toString(),
            label: city.name,
          }));

          // Remove duplicates if any
          const uniqueOptions = Array.from(
            new Map(options.map((opt) => [opt.value, opt])).values()
          );
          uniqueOptions.sort((a, b) => a.label.localeCompare(b.label));
          setCityOptions(uniqueOptions);
        }
      } catch (error) {
        console.error("Error fetching cities:", error);
      } finally {
        setIsLoadingCities(false);
      }
    };

    fetchCities();
  }, [selectedProvince]);

  // Only logic here
  useEffect(() => {
    onSelect({
      country: selectedCountry || undefined,
      province: selectedProvince || undefined,
      city: selectedCity || undefined,
    });
  }, [ selectedCountry, selectedProvince, selectedCity ]); // The filters are updating whenever the dropdown value changes

  return (
    <div className="advanced-search">
      <div className="dropdown-group">
        <div className="select-container">
          <select
            value={selectedCountry?.value || ''}
            onChange={(e) => {
              const country = countryOptions.find(c => c.value === e.target.value);
              setSelectedCountry(country || null);
              setSelectedProvince(null);
              setSelectedCity(null);
            }}
            disabled={isLoadingCountries}
            className="location-select"
          >
            <option value="">Select Country</option>
            {isLoadingCountries ? (
              <option value="" disabled>Loading countries...</option>
            ) : (
              countryOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))
            )}
          </select>
          {isLoadingCountries && <div className="loading-indicator">Loading...</div>}
        </div>

        <div className="select-container">
          <select
            value={selectedProvince?.value || ''}
            onChange={(e) => {
              const province = provinceOptions.find(p => p.value === e.target.value);
              setSelectedProvince(province || null);
              setSelectedCity(null);
            }}
            disabled={!selectedCountry || isLoadingProvinces}
            className="location-select"
          >
            <option value="">Select Province/State</option>
            {isLoadingProvinces ? (
              <option value="" disabled>Loading provinces...</option>
            ) : (
              provinceOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))
            )}
          </select>
          {isLoadingProvinces && <div className="loading-indicator">Loading...</div>}
        </div>

        <div className="select-container">
          <select
            value={selectedCity?.value || ''}
            onChange={(e) => {
              const city = cityOptions.find(c => c.value === e.target.value);
              setSelectedCity(city || null);
            }}
            disabled={!selectedProvince || isLoadingCities}
            className="location-select"
          >
            <option value="">Select City</option>
            {isLoadingCities ? (
              <option value="" disabled>Loading cities...</option>
            ) : (
              cityOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))
            )}
          </select>
          {isLoadingCities && <div className="loading-indicator">Loading...</div>}
        </div>
      </div>
    </div>
  );
};

export default AdvancedLocationSearch;