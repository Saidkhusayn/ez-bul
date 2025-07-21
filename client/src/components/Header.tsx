import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useUI } from "../contexts/UIContext";
import { useNavigate } from "react-router-dom";
import { useDisclosure } from "../utilities/useDisclosure";
import DismissableOverlay from '../sub-components/DismissableOverlay';
import SearchInput from "../sub-components/SearchInput";
import { MessageCircleMore, CircleUserRound, X } from 'lucide-react';
import { SearchResult } from "../sub-components/SearchInput";

const Header = () => {
  const { isLoggedIn, userName, logout } = useAuth();
  const { setShowLogin, toggleSidebar } = useUI();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Profile dropdown handling
  const profileDisclosure = useDisclosure();

  const transformUser = (data: any) => 
    data.map((user: any) => ({
      id: user._id,
      value: user.username,
      label: user.username,
      name: user.name,
      username: user.username
    }));

  const handleSearchSelect = (result: SearchResult) => {
    navigate(`/profile/${result.username}`);
    setIsMobileMenuOpen(false); // Close mobile menu after navigation
  };

  const handleNavigation = (path: string) => {
    navigate(path);
    setIsMobileMenuOpen(false); // Close mobile menu after navigation
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  return (
    <header className="site-header">
      <div className="header-container">
        <div className="logo" onClick={() => navigate("/")}>
          <span className="logo-text">ez bu!</span>
        </div>

        <div className="nav-menu">
          <ul className="nav-list">
            <li className="nav-item" onClick={() => navigate("/")}>Home</li>
            <li className="nav-item" onClick={() => navigate("/host-listing")}>Locals</li>
          </ul>
        </div>

        <div className="header-right">
          <div className="search-form">
            <SearchInput
              endpoint="/search"
              placeholder="Search users..."
              historyKey="userSearchHistory"
              searchType="users"
              transformData={transformUser}
              onSelect={handleSearchSelect}
            />
          </div>

          <div className="user-icons">
            {!isLoggedIn ? (
              <button className="sign-btn" onClick={() => setShowLogin(true)}>
                Log in
              </button>
            ) : (
              <>
                <div className="chat-icon">
                  <button className="icon-btn" onClick={toggleSidebar}>
                    <MessageCircleMore strokeWidth={1.7} />
                  </button>
                </div>

                <button
                  className="profile-btn"
                  ref={profileDisclosure.triggerRef}
                  onClick={profileDisclosure.onToggle}
                  aria-expanded={profileDisclosure.isOpen}
                >
                  <CircleUserRound strokeWidth={1.7} />
                  <span className="profile-name">{userName}</span>
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

          {/* Mobile menu toggle */}
          <button 
            className={`mobile-menu-toggle ${isMobileMenuOpen ? 'active' : ''}`}
            onClick={toggleMobileMenu}
            aria-label="Toggle menu"
          >
            <span></span>
            <span></span>
            <span></span>
          </button>
        </div>
      </div>

      {/* Mobile navigation overlay */}
      <div 
        className={`mobile-nav-overlay ${isMobileMenuOpen ? 'active' : ''}`}
        onClick={closeMobileMenu}
      />

      {/* Mobile navigation */}
      <nav className={`mobile-nav ${isMobileMenuOpen ? 'active' : ''}`}>
        <div className="mobile-nav-header">
          <div className="mobile-nav-title">Menu</div>
          <button className="mobile-nav-close" onClick={closeMobileMenu}>
            <X strokeWidth={1.5} />
          </button>
        </div>

        <div className="mobile-nav-content">

        {/* Navigation links */}
        <ul className="mobile-nav-list">
          <li className="mobile-nav-item" onClick={() => handleNavigation("/")}>
            Home
          </li>
          <li className="mobile-nav-item" onClick={() => handleNavigation("/host-listing")}>
            Locals
          </li>
        </ul>

        </div>
      </nav>
    </header>
  );
};

export default Header;