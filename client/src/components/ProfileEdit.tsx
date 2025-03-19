import React, { useState, useEffect, useRef } from "react";
import FormField from "../sub-components/FormField";
//import { useAuth } from "../contexts/AuthContext";
import languages from "../assets/languages.json";
import { fetchWithAuth } from "../api";
const GEONAMES_ID = import.meta.env.VITE_GEONAMES_ID;

interface Option {
  value: string;
  label: string;
}

const languageOptions = languages.map((lang) => ({
  value: lang.code,
  label: lang.name,
}));

const openOptions: Option[] = [
  { value: "Yes", label: "Yes" },
  { value: "No", label: "No" },
];

const typeOptions: Option[] = [
  { value: "Volunteer", label: "Volunteer" },
  { value: "Paid", label: "Paid" },
];

const ProfileEdit: React.FC = () => {
  //const {userName} = useAuth();
  const [profile, setProfile] = useState({
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

  const [dirtyFields, setDirtyFields] = useState<{ [key: string]: boolean }>({});
  const [countryOptions, setCountryOptions] = useState<Option[]>([]);
  const [provinceOptions, setProvinceOptions] = useState<Option[]>([]);
  const [cityOptions, setCityOptions] = useState<Option[]>([]);

  const fileInputRef = useRef(null);

  const handleFieldChange = (field: string, newValue: any) => {
    setProfile((prev) => ({ ...prev, [field]: newValue }));
    setDirtyFields((prev) => ({ ...prev, [field]: true }));
    console.log(dirtyFields)
  };

  
  // Handle profile picture file change
  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const formData = new FormData();
      formData.append("profilePicture", file);

      try {
        const data = await fetchWithAuth("/profile/upload", {
          method: "POST",
          body: formData,
        });
        console.log(data.url);
        setProfile((prev) => ({ ...prev, profilePicture: data.url }));
      } catch (err) {
        console.error("Error uploading file:", err);
      }
    }
  }

  // Fetch the user profile when username is available
  useEffect(() => {
    //const token = localStorage.getItem("token");
    //if(!token){
    //  console.log("You don't have token and you go to public view");
    //  return;
    //}

    const getUser = async () => {
      try {
        const data = await fetchWithAuth(`/profile/me`);
        setProfile(data.user);

      } catch (error) {
        console.error("Error fetching profile:", error);
      }
    };

    //if (userName) {
      getUser();
   // }
  }, []);

  // Fetch countries from Geonames when component mounts
  useEffect(() => {
    const fetchCountries = async () => {
      try {
        const res = await fetch(`http://api.geonames.org/countryInfoJSON?username=${GEONAMES_ID}`);
        if (res.ok) {
          const data = await res.json();
          //console.log("Fetched data:", data);
          const options: Option[] = data.geonames.map((country: any) => ({
            value: country.geonameId.toString(), // use geonameId as a string
            label: country.countryName,
          }));
          options.sort((a, b) => a.label.localeCompare(b.label));
          setCountryOptions(options);
        }
      } catch (error) {
        console.error("Error fetching countries:", error);
      }
    };

    fetchCountries();
  }, []);

  // Fetch provinces (states) based on selected country using GeoNames
  useEffect(() => {
    if (!profile.country) {
      setProvinceOptions([]);
      return;
    }
    const fetchProvinces = async () => {
      try {
        const res = await fetch(
         `http://api.geonames.org/childrenJSON?geonameId=${profile.country}&username=${GEONAMES_ID}` //make it hidden
        );
        if (res.ok) {
          const data = await res.json();
          const options: Option[] = data.geonames.map((prov: any) => ({
            value: prov.geonameId.toString(),
            label: prov.adminName1,
          }));

          // Remove duplicates if any (GeoNames might return redundant names)
          const uniqueOptions = Array.from(
            new Map(options.map((opt) => [opt.value, opt])).values()
          );
          uniqueOptions.sort((a, b) => a.label.localeCompare(b.label));
          setProvinceOptions(uniqueOptions);
        }
      } catch (error) {
        console.error("Error fetching provinces:", error);
      }
    };

    fetchProvinces();
    //console.log(profile.country)
  }, [profile.country]);

  // Fetch cities based on selected country and province using GeoNames
  useEffect(() => {
    if (!profile.country || !profile.province) {
      setCityOptions([]);
      return;
    }
    const fetchCities = async () => {
      try {
        const res = await fetch(
          `http://api.geonames.org/childrenJSON?geonameId=${profile.province}&username=${GEONAMES_ID}`
        );
        if (res.ok) {
          const data = await res.json();
          const options: Option[] = data.geonames.map((city: any) => ({
            value: city.name,
            label: city.name,
          }));

          // Remove duplicates if needed
          const uniqueOptions = Array.from(
            new Map(options.map((opt) => [opt.value, opt])).values()
          );
          uniqueOptions.sort((a, b) => a.label.localeCompare(b.label));
          setCityOptions(uniqueOptions);
        }
      } catch (error) {
        console.error("Error fetching cities:", error);
      }
    };

    fetchCities();
  }, [profile.country, profile.province]);

  

  // Save profile: Only send the dirty fields to the server
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();

    const payload: any = {};
    for (const key in dirtyFields) {
      if (key.includes(".")) {
        const [parent] = key.split(".");
        if (!payload[parent]) payload[parent] = {};
      } else {
        payload[key] = profile[key as keyof typeof profile];
      }
    }

    console.log("Dirty Payload:", payload);

    const token = localStorage.getItem("token");
    if(!token){
        console.log("You don't have token and you go to public view"); //do some stuff to prevent it in the server
        return;
    }
    if(Object.keys(payload).length > 0){
      try {
        const data = await fetchWithAuth(`/profile/edit`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });

        console.log("Updated Profile:", data);
        console.log(payload);
        setDirtyFields({})

      } catch (error) {
        console.error("Error saving profile:", error);
      }
    } else{
      console.log("You didn't make any changes")
    }
  };
    

  const handlePictureClick = () => {
    // @ts-ignore
    fileInputRef.current.click();
  };

  if (!profile || profile.username === "") {
    return <div>Loading profile...</div>;
  }

  return (
    <div className="profile-page">
      {/* Header Section */}
      <div className="profile-header text-center text-white">
        <div className="profile-picture-container">
          <img
            src={profile.profilePicture}
            alt="Profile"
            className="profile-picture"
            onClick={handlePictureClick}
          />
          <input 
            type="file" 
            style={{ display: "none" }}
            accept="image/*"
            ref={fileInputRef}
            onChange={handleFileChange}
          />
        </div>
        <h2 className="mt-3">{profile.name}</h2>
        <p className="text">Username: {profile.username}</p>
        <p className="text">Type: {profile.type}</p>
      </div>

      {/* Profile Form */}
      <div className="container mt-4">
        <div className="card p-4 shadow-lg">
          <h5 className="mb-3">Basic Info</h5>
          <form onSubmit={handleSaveProfile} className="d-flex flex-column">
            <>
              <FormField
                label="Name"
                type="text"
                value={profile.name}
                onChange={(val) => handleFieldChange("name", val)}
              />
              <FormField
                label="Email"
                type="text"
                value={profile.email}
                onChange={(val) => handleFieldChange("email", val)}
              />
              <FormField
                label="Birthday"
                type="date"
                value={profile.birthday}
                onChange={(val) => handleFieldChange("birthday", val)}
              />

              <FormField
                label="Country"
                type="select"
                options={countryOptions}
                value={profile.country}
                onChange={(val) => handleFieldChange("country", val)}
              />

              {profile.country && ( //look provinceOptions.length > 0 &&
                <FormField
                  label="Province/State"
                  type="select"
                  options={provinceOptions}
                  value={profile.province}
                  onChange={(val) => handleFieldChange("province", val)}
                />
              )}

              {profile.province && cityOptions.length > 0 && (
                <FormField
                  label="City"
                  type="select"
                  options={cityOptions}
                  value={profile.city}
                  onChange={(val) => handleFieldChange("city", val)}
                />
              )}

              <FormField
                label="Bio"
                type="text"
                value={profile.bio}
                onChange={(val) => handleFieldChange("bio", val)}
              />

              <FormField
                label="Are you open"
                type="select"
                options={openOptions}
                value={profile.open}
                onChange={(val) => handleFieldChange("open", val)}
              />
              {profile.open === "Yes" && (
                <FormField
                  label="Type"
                  type="select"
                  options={typeOptions}
                  value={profile.type}
                  onChange={(val) => handleFieldChange("type", val)}
                />
              )}
              {profile.open === "Yes" && profile.type === "Paid" && (
                <FormField
                  label="Hourly Rate $"
                  type="number"
                  value={profile.rate}
                  onChange={(val) => handleFieldChange("rate", val)}
                />
              )}

              <FormField
                label="Languages"
                type="multiselect"
                options={languageOptions}
                value={profile.languages}
                onChange={(val) => handleFieldChange("languages", val)}
              />
            </>
            <div className="d-flex justify-content-center mt-3">
              <button 
                type="submit" 
                disabled={Object.keys(dirtyFields).length === 0} 
                className="btn btn-primary"
              >
                Save Profile
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ProfileEdit;


