import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useUI } from "../contexts/UIContext";
import Sidebar from "./Sidebar";

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
    country: "",
    province: "",
    city: "",
    profilePicture: "",
    birthday: "",
    open: "",
    type: "",
    rate: "",
    languages: [] as string[],
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
        const res = await fetch(`http://localhost:3000/profile/${username}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setProfile(data.user);
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
      displayChat(profile._id)
    }
  };

  if (!profile || profile.username === "") {
    return <div>Loading profile...</div>;
  }

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
            <strong>Location:</strong>{" "}
            {profile.city || profile.province || profile.country || "Not set"}
          </p>
          <p>
            <strong>Languages:</strong>{" "}
            {profile.languages ? profile.languages.join(", ") : "Not specified"}
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
