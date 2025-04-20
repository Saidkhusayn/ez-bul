import SearchInput from '../sub-components/SearchInput';
import { useUI } from '../contexts/UIContext';
import { useAuth } from '../contexts/AuthContext';
import Sidebar from '../components/Sidebar';
import Login from '../components/LoginBox';
import { useNavigate } from 'react-router-dom';
import { SearchResult } from '../sub-components/SearchInput';

const Home = () => {
  const { showLogin } = useUI();
  const { isLoggedIn } = useAuth();
  const navigate = useNavigate();

  const transformLocation = (data: any) => 
    data.map((location: any) => ({
      id: location.id,
      value: location.value,
      label: location.label,
      name: location.name,
      country: location.country,
      province: location.province
    }));
  
  const handleSearchSelect = (result: SearchResult) => {
    navigate(`/search/${result.label}`); 
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