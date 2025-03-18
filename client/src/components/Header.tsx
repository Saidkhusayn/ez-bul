import { useState, useEffect, useRef } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useUI } from "../contexts/UIContext";
import { useNavigate } from "react-router-dom";
const API_URL = import.meta.env.VITE_API_URL;


const Header = () => {
  const { isLoggedIn, userName, logout, } = useAuth();
  const { setShowLogin } = useUI();
  const [showProfile, setShowProfile] = useState(false);
  const navigate = useNavigate();

  const profilePopupRef = useRef<HTMLDivElement>(null);
  const profileIconRef = useRef<HTMLButtonElement>(null);

  //Search Users input states
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
      if(res.ok){
        const data = await res.json()
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
    }, 300); // Delay API call by 300ms

    return () => clearTimeout(delayDebounce); // Cleanup previous timer
  }, [query]);



  // Clicks inside/outside the popup box
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        profilePopupRef.current &&
        profilePopupRef.current.contains(target)
      ) {
        return;
      }
      if (
        profileIconRef.current &&
        profileIconRef.current.contains(target)
      ) {
        return;
      }
      setShowProfile(false);
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <nav className="navbar navbar-light bg-light">
      <form className="form-inline d-flex">
        <input //here
          className="form-control mr-sm-2"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search People"
          aria-label="Search"
        />
        <div className="card search-popup">
            <ul className="list-group">
              {loading && <p>Loading...</p>}
              {users.map((user) => (
            <li className="list-group-item user-select-none" 
              key={user._id}
              onClick={() => {
                navigate(`profile/${user.username}`)
              }}
              >
              {user.name} @{user.username}
              </li>
          ))}
            </ul>
        </div>
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
      <button className="icon-btn" onClick={() => {navigate("/")}}>
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
          className="lucide lucide-house"
        >
          <path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8" />
          <path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        </svg>
      </button>
      <div className="auth-div d-flex">
        {!isLoggedIn ? (
          <button className="btn btn-dark" onClick={() => {setShowLogin(true)}}>
            Login
          </button>
        ) : null}
        <button
          className="icon-btn"
          id="profile-icon"
          ref={profileIconRef}
          onClick={() => setShowProfile((prev) => !prev)}
        >
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
            className="lucide lucide-circle-user"
          >
            <circle cx="12" cy="12" r="10" />
            <circle cx="12" cy="10" r="3" />
            <path d="M7 20.662V19a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v1.662" />
          </svg>
          <label htmlFor="profile-icon">{isLoggedIn ? userName : "Guest"}</label>
        </button>
        {showProfile && (
          <div className="card profile-popup" ref={profilePopupRef}>
            <ul className="list-group">
              <li
                className="list-group-item user-select-none"
                onClick={() => {
                  setShowProfile(false);
                  navigate(`/profile/${userName}`) //look here and fix that to include edit
                }}
              >
                {userName}
              </li>
              <li
                className="list-group-item user-select-none"
                onClick={() => {
                  setShowProfile(false);
                  logout();
                }}
              >
                Logout
              </li>
            </ul>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Header;
