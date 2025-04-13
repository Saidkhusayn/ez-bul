import { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useUI } from "../contexts/UIContext";
import { useNavigate } from "react-router-dom";
import DismissableOverlay from '../sub-components/DismissableOverlay';
import { useDisclosure } from "../utilities/useDisclosure";
import { useDebounce } from "../utilities/useDebounce";
import { MessageCircleMore, CircleUserRound, Search } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL;

const Header = () => {
  const { isLoggedIn, userName, logout } = useAuth();
  const { setShowLogin } = useUI();
  const { toggleSidebar } = useUI();
  const navigate = useNavigate();
  
  // Profile dropdown handling
  const profileDisclosure = useDisclosure();
  
  // Search functionality
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState<{ _id: string; name: string; username: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const debouncedQuery = useDebounce(query, 300);
  const searchDisclosure = useDisclosure();

  const fetchUsers = async (searchTerm: string) => {
    if (!searchTerm) {
      setUsers([]);
      searchDisclosure.onClose();
      return;
    }
    
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/search?query=${searchTerm}`);
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
        data.length > 0 ? searchDisclosure.onOpen() : searchDisclosure.onClose();
      }
    } catch (error) {
      console.error("Error fetching users:", error);
      searchDisclosure.onClose();
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchUsers(debouncedQuery);
  }, [debouncedQuery]);

  const handleSearchItemClick = (username: string) => {
    setQuery("");
    searchDisclosure.onClose();
    navigate(`profile/${username}`);
  };

  return (
    <header className="site-header">
      <div className="header-container">
      <div className="logo">
          <span className="logo-text">ez bu!</span>
        </div>

        <div className="nav-menu">
          <ul className="nav-list">
            <li className="nav-item" onClick={() => navigate("/")}>Home</li>
            <li className="nav-item">Platform</li>
            <li className="nav-item">Resources</li>
          </ul>
        </div>

        <div className="header-right">
          <div className="search-form" ref={searchDisclosure.overlayRef}>
              <input
                className="search-input"
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onFocus={searchDisclosure.onOpen}
                placeholder="Search People"
                aria-label="Search"
                //@ts-ignore
                ref={searchDisclosure.triggerRef}
              />

              <button 
                className="search-btn" 
                type="button"
                onClick={() => searchDisclosure.onToggle()}
              >
                < Search size={18}/>
              </button>
              
              <DismissableOverlay
                isOpen={searchDisclosure.isOpen}
                onClose={searchDisclosure.onClose}
                className="search-dropdown"
              >
                <ul className="dropdown-list">
                  {loading && <li className="dropdown-item">Loading...</li>}
                  {users.map((user) => (
                    <li
                      className="dropdown-item"
                      key={user._id}
                      onClick={() => handleSearchItemClick(user.username)}
                    >
                      {user.username}
                    </li>
                  ))}
                </ul>
              </DismissableOverlay> 
          </div>



          <div className="user-icons">
            {!isLoggedIn ? (
              <button className="sign-btn" onClick={() => setShowLogin(true)}>
                Log in
              </button>
            ) : (
              <>
                <div className="chat-icon">
                  <button className="icon-btn">
                    < MessageCircleMore 
                      strokeWidth={1.7}
                      onClick={toggleSidebar}
                    />
                  </button>
                </div>

                  <button
                  className="profile-btn"
                  ref={profileDisclosure.triggerRef}
                  onClick={profileDisclosure.onToggle}
                  aria-expanded={profileDisclosure.isOpen}
                >
                  <CircleUserRound strokeWidth={1.7}/>
                  <span className="profile-name">
                    {userName}
                  </span>
                </button>
              </>
            )}

            <DismissableOverlay
              isOpen={profileDisclosure.isOpen}
              onClose={profileDisclosure.onClose}
              ref={profileDisclosure.overlayRef}
              className="profile-dropdown"
            >
              <ul className="dropdown-list">
                <li
                  className="dropdown-item"
                  onClick={() => {
                    profileDisclosure.onClose();
                    navigate(`/profile/${userName}`);
                  }}
                >
                  {userName}
                </li>
                <li
                  className="dropdown-item"
                  onClick={() => {
                    profileDisclosure.onClose();
                    logout();
                    navigate("/");
                  }}
                >
                  Logout
                </li>
              </ul>
            </DismissableOverlay>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;