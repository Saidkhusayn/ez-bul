import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useUI } from "../contexts/UIContext";
import Sidebar from "./Sidebar";

const Profile = () => {
  const { username } = useParams();
  const navigate = useNavigate();
  const { userName } = useAuth();
  const { displayChat } = useUI();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  const [profile, setProfile] = useState({  
    _id: "",
    name: "",
    email: "",
    username: "",
    country: { value: "", label: "" },
    province: { value: "", label: "" },
    city: { value: "", label: "" },
    profilePicture: "",
    birthday: "",
    open: "",
    type: "",
    rate: "",
    languages: [],
    bio: "",
  });

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // Use consistent API_URL from environment variables
        const response = await fetch(`${API_URL}/${username}`);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch profile: ${response.status}`);
        }
        
        const data = await response.json();
        console.log("Profile data received:", data);
        
        // Handle both formats - if data is the user object directly or if it's wrapped in a user property
        const userData = data.user || data;
        
        setProfile({
          ...userData,
          // Ensure these fields have default values if they're missing
          languages: userData.languages || [],
          country: userData.country || { value: "", label: "" },
          province: userData.province || { value: "", label: "" },
          city: userData.city || { value: "", label: "" },
        });
      } catch (error) {
        console.error("Error fetching profile:", error);
        //@ts-ignore
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    if (username) {
      fetchProfile();
    }
  }, [username, API_URL]);

  const handleButtonClick = () => {
    if (userName === profile.username) {
      navigate("/profile/edit");
    } else {
      setIsSidebarOpen(true);
      displayChat(profile._id);
    }
  };

  // Show loading state
  if (loading) {
    return <div className="text-center p-5">Loading profile...</div>;
  }

  // Show error state
  if (error) {
    return <div className="text-center p-5 text-danger">Error: {error}</div>;
  }

  // Show not found state
  if (!profile.username) {
    return <div className="text-center p-5">User not found</div>;
  }

  // Helper functions for displaying data
  const getLocationString = () => {
    const parts = [
      profile.city?.label,
      profile.province?.label,
      profile.country?.label
    ].filter(Boolean);
    
    return parts.length > 0 ? parts.join(", ") : "Not set";
  };

  const getLanguagesString = () => {
    if (!profile.languages || profile.languages.length === 0) return "Not specified";
    //@ts-ignore
    return profile.languages.map(lang => lang.label).join(", ");
  };

  return (
    <>
      <div className="profile-header text-center text-white">
        {/* Profile Header */}
        <div className="d-flex flex-column align-items-center">
          <div className="position-relative">
            <img
              src={profile.profilePicture || "https://via.placeholder.com/120"}
              alt="Profile"
              className="rounded-circle border"
              style={{ width: "120px", height: "120px", objectFit: "cover" }}
              onError={(e) => {
                //@ts-ignore
                e.target.src = "https://via.placeholder.com/120";
              }}
            />
          </div>
          <h4 className="mt-2 fw-bold">{profile.name || "Name not set"}</h4>
          <p className="text">@{profile.username}</p>
          <p className="text">{profile.bio || "No bio available"}</p>
        </div>

        {/* Profile Info Section */}
        <div className="mt-3">
          <p>
            <strong>Type:</strong> {profile.type || "Not specified"}
          </p>
          <p>
            <strong>Location:</strong> {getLocationString()}
          </p>
          <p>
            <strong>Languages:</strong> {getLanguagesString()}
          </p>
        </div>

        {/* Action Button */}
        <button onClick={handleButtonClick} className="btn btn-outline-primary mt-2">
          {userName === profile.username ? "Edit" : "Message"}
        </button>
      </div>
      
      {isSidebarOpen && <Sidebar />}
    </>
  );
};

export default Profile;