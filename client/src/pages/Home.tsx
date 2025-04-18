import { useState } from 'react';
import Sidebar from "../components/Sidebar";
import Login from "../components/LoginBox";
import LocationSearch from '../sub-components/LocationSearch';
import { useUI } from "../contexts/UIContext";
import { useAuth } from "../contexts/AuthContext";

interface Location {
  id: string;
  value: string;
  label: string;
  name: string;
  country: { value: string; label: string };
  province: { value: string; label: string };
}

const Home = () => {
  const { showLogin } = useUI();
  const { isLoggedIn } = useAuth();
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);

  const handleLocationSelect = (location: Location) => {
    setSelectedLocation(location);
    // You could redirect to hosts listing with this location as a parameter
    // or update state in a parent component
    console.log('Selected location:', location);
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
            flexibility and compliance. Get our all-in-one Global People Platform that simplifies
            the way you onboard, offboard, and everything else in between.
          </p>
          <div className="hero-search">
            <form className="search-form-hero" onSubmit={(e) => e.preventDefault()}>
              <LocationSearch onLocationSelect={handleLocationSelect} />
            </form>
          </div>
        </div>
      </div>
      {isLoggedIn && <Sidebar />}
      {showLogin && <Login />}
    </main>
  );
};

export default Home;