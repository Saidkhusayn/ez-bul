
import Sidebar from "./Sidebar";
import Login from "./Login";
import { useUI } from "../contexts/UIContext";
import { useAuth } from "../contexts/AuthContext";

const Home = () => {
  const { showLogin } = useUI();
  const { isLoggedIn } = useAuth();

  return (
    <main>
      <div className="home-content">
      <div className="search-container">
        <form className="form-inline d-flex">
          <input
            className="form-control mr-sm-2"
            type="search"
            placeholder="Search"
            aria-label="Search"
          />
          <button className="icon-btn" type="submit">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="lucide lucide-search"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
          </button>
        </form>
      </div>
      <div className="logedin-content">
        {isLoggedIn && <Sidebar/>}
        {showLogin && <Login />}
      </div>
    </div>
    </main>
    
  );
};

export default Home;
