import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useUI } from "../contexts/UIContext";
import Sidebar from "./Sidebar";

//type LanguageEntry = { value: string, label: string };

const Profile = () => {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();
  const { userName } = useAuth();
  const { displayChat } = useUI();

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
    languages: [] as { value: string, label: string }[],
    bio: "",
  });

  // Sidebar state
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      console.log("You don't have token and you go to public view");
      return;
    }

    const getUser = async () => {
      try {
        const res = await fetch(`http://localhost:3000/${username}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          
          // Process data to handle both object and string formats
          const processedUser = {
            ...data.user,
            // Ensure country is an object
            country: typeof data.user.country === 'string' 
              ? { value: data.user.country, label: data.user.country } 
              : data.user.country || { value: "", label: "" },
            // Ensure province is an object
            province: typeof data.user.province === 'string'
              ? { value: data.user.province, label: data.user.province }
              : data.user.province || { value: "", label: "" },
            // Ensure city is an object
            city: typeof data.user.city === 'string'
              ? { value: data.user.city, label: data.user.city }
              : data.user.city || { value: "", label: "" },
            // Ensure languages is an array of objects
            languages: Array.isArray(data.user.languages)
                                  //@ts-ignore
              ? data.user.languages.map(lang => 
                  typeof lang === 'string' 
                    ? { value: lang, label: lang } 
                    : lang 
                )
              : []
          };
          
          setProfile(processedUser);
        } else {
          console.error("Fetch failed");
        }
      } catch (error) {
        console.error("Error fetching profile:", error);
      }
    };

    if (username) {
      getUser();
    }
  }, [username]);

  const handleButtonClick = () => {
    if (userName === profile.username) {
      navigate("/profile/edit");
    } else {
      setIsSidebarOpen(true); // Open Sidebar
      displayChat(profile._id);
    }
  };

  if (!profile || profile.username === "") {
    return <div>Loading profile...</div>;
  }

  // Function to get location string
  const getLocationString = () => {
    const cityLabel = profile.city?.label || "";
    const provinceLabel = profile.province?.label || "";
    const countryLabel = profile.country?.label || "";
    
    const parts = [cityLabel, provinceLabel, countryLabel].filter(part => part);
    return parts.length > 0 ? parts.join(", ") : "Not set";
  };

  // Function to get languages string
  const getLanguagesString = () => {
    if (!profile.languages || profile.languages.length === 0) return "Not specified";
    return profile.languages.map(lang => lang.label).join(", ");
  };

  return (
    <>
      <div className="profile-header text-center text-white">
        {/* Profile Header */}
        <div className="d-flex flex-column align-items-center">
          <div className="position-relative">
            <img
              src={profile.profilePicture || "#"}
              alt="Profile"
              className="rounded-circle border"
              style={{ width: "120px", height: "120px", objectFit: "cover" }}
            />
          </div>
          <h4 className="mt-2 fw-bold">{profile.name || "Name not set"}</h4>
          <p className="text">@{profile.username || "username"}</p>
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

        {/* Edit Profile Button */}
        <button onClick={handleButtonClick} className="btn btn-outline-primary mt-2">
          {userName === profile.username ? "Edit" : "Message"}
        </button>
      </div>
      {/* Render Sidebar */}
      {isSidebarOpen && <Sidebar />}
    </>
  );
};

export default Profile;