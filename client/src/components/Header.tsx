import { useState, useEffect, useRef } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useUI } from "../contexts/UIContext";
import { useNavigate } from "react-router-dom";
const API_URL = import.meta.env.VITE_API_URL;
//btn

const Header = () => {
  const { isLoggedIn, userName, logout } = useAuth();
  const { setShowLogin } = useUI();
  const [showProfile, setShowProfile] = useState(false);
  const navigate = useNavigate();

  const profilePopupRef = useRef<HTMLDivElement>(null);
  const profileIconRef = useRef<HTMLButtonElement>(null);

  // Search Users input states
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState<{ _id: string; name: string; username: string }[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchUsers = async (searchTerm: String) => {
    if (!searchTerm) {
      setUsers([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/search?query=${searchTerm}`);
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (error) {
      console.error("Error fetching users:", error);
    }
    setLoading(false);
  };

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      fetchUsers(query);
    }, 300); 

    return () => clearTimeout(delayDebounce); // Cleanup previous timer
  }, [query]);

  // Clicks inside/outside the popup box
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (profilePopupRef.current && profilePopupRef.current.contains(target)) {
        return;
      }
      if (profileIconRef.current && profileIconRef.current.contains(target)) {
        return;
      }
      setShowProfile(false);
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside); //profile
    };
  }, []);

  return (
    <header className="site-header">
      <div className="header-container">
        <div className="logo">
          <span className="logo-text">ez bu!</span>
        </ div>
        <div className="nav-menu">
          <ul className="nav-list">
            <li className="nav-item" onClick={() => {navigate("/")}}>Home</li>
            <li className="nav-item">Platform</li>
            <li className="nav-item">Resources</li>
          </ul>
        </div>
        <div className="header-right">
          <form className="search-form">
            <input
              className="search-input"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search People"
              aria-label="Search"
            />
            <button className="search-btn" type="submit">
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
            {users.length > 0 && (
              <div className="search-results">
                <ul className="results-list">
                  {loading && <p>Loading...</p>}
                  {users.map((user) => (
                    <li
                      className="result-item"
                      key={user._id}
                      onClick={() => {
                        setQuery("");
                        navigate(`profile/${user.username}`);
                        
                      }}
                    >
                      {user.username}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </form>
          <div className="auth-controls">
            {!isLoggedIn ? (
              <button className="black-btn" onClick={() => {setShowLogin(true)}}>
                Log in
              </button>
            ) : null}
            <button
              className="profile-btn"
              id="profile-icon"
              ref={profileIconRef}
              onClick={() => setShowProfile((prev) => !prev)}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <circle cx="12" cy="10" r="3" />
                <path d="M7 20.662V19a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v1.662" />
              </svg>
              <span className="profile-name">{isLoggedIn ? userName : "Guest"}</span>
            </button>
            {showProfile && (
              <div className="profile-dropdown" ref={profilePopupRef}>
                <ul className="dropdown-list">
                  <li
                    className="dropdown-item"
                    onClick={() => {
                      setShowProfile(false);
                      navigate(`/profile/${userName}`);
                    }}
                  >
                    {userName}
                  </li>
                  <li
                    className="dropdown-item"
                    onClick={() => {
                      setShowProfile(false);
                      logout();
                      navigate("/");
                    }}
                  >
                    Logout
                  </li>
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
