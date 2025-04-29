import SearchInput from '../sub-components/SearchInput';
import { useUI } from '../contexts/UIContext';
import { useAuth } from '../contexts/AuthContext';
import Sidebar from '../components/Sidebar';
import Login from '../components/LoginBox';
import { useNavigate } from 'react-router-dom';
import { SearchResult } from '../sub-components/SearchInput';

interface RawLocation {
  id: number;
  label: string;
  type: 'country' | 'province' | 'city' | 'other';
  locationArr:  { value: string; label: string }[];
}

interface Transformed {
  id: number;
  label: string;
  type: string;
  country?: { value: string; label: string };
  province?: { value: string; label: string };
  city?: { value: string; label: string };
}

const Home = () => {
  const { showLogin } = useUI();
  const { isLoggedIn } = useAuth();
  const navigate = useNavigate();

  const transformLocation = (data: RawLocation[]): Transformed[] =>
    data.map(loc => {
      const full = loc.locationArr;
      let country, province, city;
  
      if (loc.type === 'country') {
        country = full[0];
      } else if (loc.type === 'province') {
        province = full[0];
        country  = full[1];
      } else {
        city     = full[0];
        province = full.length === 3 ? full[1] : undefined;
        country  = full.length === 3 ? full[2] : undefined;
      }
      
      return {
        id: loc.id,
        label: loc.label,
        type: loc.type,
        country,
        province,
        city,
      };
    });
  
  const handleSearchSelect = (result: SearchResult) => {
    navigate(`/host-listing`, { state: {result} }); 
  };

  return (
    <main className="main-content">
      <div className="hero-section">
        <div className="hero-content">
          <h1 className="hero-title">
            <span className="title-highlight">Payroll</span>
            <br />for global teams
          </h1>
          <p className="hero-description">
            Deel helps tens of thousands of companies expand globally with unmatched speed,
            flexibility and compliance.
          </p>
          <div className="hero-search">
          <SearchInput
              onSelect={handleSearchSelect}
              endpoint="/search/locations"
              placeholder="Search Locations..."
              historyKey="locationSearchHistory"
              searchType="locations"
              transformData={transformLocation}
            />
          </div>
        </div>
      </div>
      {isLoggedIn && <Sidebar />}
      {showLogin && <Login />}
    </main>
  );
};

export default Home;