import { useAuth } from "../contexts/AuthContext";
import { useUI } from "../contexts/UIContext";
import { useNavigate } from "react-router-dom";
import { useDisclosure } from "../utilities/useDisclosure";
import DismissableOverlay from '../sub-components/DismissableOverlay';
import SearchInput from "../sub-components/SearchInput";
import { MessageCircleMore, CircleUserRound } from 'lucide-react';
import { SearchResult } from "../sub-components/SearchInput"


const Header = () => {
  const { isLoggedIn, userName, logout } = useAuth();
  const { setShowLogin, toggleSidebar } = useUI();
  const navigate = useNavigate();

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
      // Access username from the result object
      navigate(`/profile/${result.username}`); 
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
          <div className="search-form" >
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