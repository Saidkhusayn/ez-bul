import Sidebar from "./Sidebar";
import Login from "./Login";
import { useUI } from "../contexts/UIContext";
import { useAuth } from "../contexts/AuthContext";

const Home = () => {
  const { showLogin } = useUI();
  const { isLoggedIn } = useAuth();

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
            <form className="search-form-hero">
              <input
                className="search-input-hero"
                type="search"
                placeholder="Search People"
                aria-label="Search"
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
            </form>
          </div>
        </div>
        <div className="logedin-content">
          {isLoggedIn && <Sidebar />}
          {showLogin && <Login />}
        </div>
      </div>
    </main>
  );
};

export default Home;