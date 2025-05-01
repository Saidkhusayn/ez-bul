import React, { useState, useEffect, useRef } from "react";
import FormField from "../sub-components/FormField";
import languages from "../assets/languages.json";
import { fetchWithAuth } from "../utilities/api";
import { Camera } from "lucide-react"
const GEONAMES_ID = import.meta.env.VITE_GEONAMES_ID;

interface Option {
  value: string;
  label: string;
}

interface LocationOption {
  value: string;
  label: string;
}

interface LanguageOption {
  value: string;
  label: string;
}

interface ProfileData {
  name: string;
  email: string;
  username: string;
  country: LocationOption | null;
  province: LocationOption | null;
  city: LocationOption | null;
  profilePicture: string;
  birthday: string;
  open: string;
  type: string;
  rate: string;
  languages: LanguageOption[];
  bio: string;
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
  const [profile, setProfile] = useState<ProfileData>({
    name: "",
    email: "",
    username: "",
    country: null,
    province: null,
    city: null,
    profilePicture: "",
    birthday: "",
    open: "",
    type: "",
    rate: "",
    languages: [],
    bio: "",
  });

  const [dirtyFields, setDirtyFields] = useState<{ [key: string]: boolean }>({});
  const [countryOptions, setCountryOptions] = useState<Option[]>([]);
  const [provinceOptions, setProvinceOptions] = useState<Option[]>([]);
  const [cityOptions, setCityOptions] = useState<Option[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<{ success: boolean; message: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  //@ts-ignore console
  const alertTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleFieldChange = (field: string, newValue: any) => {
    setProfile((prev) => ({ ...prev, [field]: newValue }));
    setDirtyFields((prev) => ({ ...prev, [field]: true }));
    
    // Reset save status when making changes
    if (saveStatus) {
      setSaveStatus(null);
      // Also clear any existing timeout
      if (alertTimeoutRef.current) {
        clearTimeout(alertTimeoutRef.current);
        alertTimeoutRef.current = null;
      }
    }
  };

  // Reset dependent fields when parent field changes
  const resetProvinceAndCity = () => {
    setProfile(prev => ({
      ...prev,
      province: null,
      city: null
    }));
    setDirtyFields(prev => ({
      ...prev,
      province: true,
      city: true
    }));
    setProvinceOptions([]);
    setCityOptions([]);
  };

  const resetCity = () => {
    setProfile(prev => ({
      ...prev,
      city: null
    }));
    setDirtyFields(prev => ({
      ...prev,
      city: true
    }));
    setCityOptions([]);
  };

  // Reset type and rate when "open" changes
  const resetTypeAndRate = () => {
    if (profile.open !== "Yes") {
      setProfile(prev => ({
        ...prev,
        type: "",
        rate: ""
      }));
      setDirtyFields(prev => ({
        ...prev,
        type: true,
        rate: true
      }));
    }
  };

  // Reset rate when type changes
  const resetRate = () => {
    if (profile.type !== "Paid") {
      setProfile(prev => ({
        ...prev,
        rate: ""
      }));
      setDirtyFields(prev => ({
        ...prev,
        rate: true
      }));
    }
  };

  // Handle profile picture file change
  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type and size
      const validTypes = ['image/jpeg', 'image/png', 'image/gif'];
      const maxSize = 5 * 1024 * 1024; // 5MB

      if (!validTypes.includes(file.type)) {
        alert("Please upload a valid image file (JPEG, PNG, or GIF)");
        return;
      }

      if (file.size > maxSize) {
        alert("File size exceeds 5MB limit");
        return;
      }

      const formData = new FormData();
      formData.append("profilePicture", file);

      try {
        setSaveStatus({ success: false, message: "Uploading profile picture..." });
        const data = await fetchWithAuth("/profile/upload", {
          method: "POST",
          body: formData,
        });
        setProfile((prev) => ({ ...prev, profilePicture: data.url }));
        setDirtyFields((prev) => ({ ...prev, profilePicture: true }));
        setSaveStatus({ success: true, message: "Profile picture updated successfully!" });
      } catch (err) {
        console.error("Error uploading file:", err);
        setSaveStatus({ success: false, message: "Failed to upload profile picture. Please try again." });
      }
    }
  };

  // Fetch the user profile when username is available
  useEffect(() => {
    const getUser = async () => {
      setIsLoading(true);
      try {
        const data = await fetchWithAuth(`/profile/me`);
        
        // Convert string values to object format if needed
        const processedData = {
          ...data.user,
          // Convert country string to object format if it's a string
          country: typeof data.user.country === 'string' ? 
            { value: data.user.country, label: findLabelForValue(data.user.country, countryOptions) } : 
            data.user.country,
          // Convert province string to object format if it's a string
          province: typeof data.user.province === 'string' ? 
            { value: data.user.province, label: findLabelForValue(data.user.province, provinceOptions) } : 
            data.user.province,
          // Convert city string to object format if it's a string
          city: typeof data.user.city === 'string' ? 
            { value: data.user.city, label: data.user.city } : 
            data.user.city,
          // Convert languages array of strings to array of objects if needed
          languages: Array.isArray(data.user.languages) ? 
            data.user.languages.map((lang: string | LanguageOption) => 
              typeof lang === 'string' ? 
                { value: lang, label: findLabelForValue(lang, languageOptions) } : 
                lang
            ) : 
            [],
        };
        
        setProfile(processedData);
        setIsLoading(false);
      } catch (error) {
        console.error("Error fetching profile:", error);
        setIsLoading(false);
        setSaveStatus({ success: false, message: "Failed to load profile data." });
      }
    };

    getUser();
  }, []);

  // Helper function to find label for a value
  const findLabelForValue = (value: string, options: Option[]): string => {
    const option = options.find(opt => opt.value === value);
    return option ? option.label : value;
  };

  // Fetch countries from Geonames when component mounts
  useEffect(() => {
    const fetchCountries = async () => {
      try {
        const res = await fetch(`https://secure.geonames.org/countryInfoJSON?username=${GEONAMES_ID}`);
        if (res.ok) {
          const data = await res.json();
          const options: Option[] = data.geonames.map((country: any) => ({
            value: country.geonameId.toString(),
            label: country.countryName,
          }));
          options.sort((a, b) => a.label.localeCompare(b.label));
          setCountryOptions(options);
        }
      } catch (error) {
        console.error("Error fetching countries:", error);
        setSaveStatus({ success: false, message: "Failed to load country data." });
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
        if(profile.country?.value){
          const countryValue = profile.country.value;
          const res = await fetch(
           `https://secure.geonames.org/childrenJSON?geonameId=${countryValue}&username=${GEONAMES_ID}`
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
        }
      } catch (error) {
        console.error("Error fetching provinces:", error);
      }
    };

    fetchProvinces();
  }, [profile.country]);

  // Fetch cities based on selected country and province using GeoNames
  useEffect(() => {
    if (!profile.country || !profile.province) {
      setCityOptions([]);
      return;
    }
    
    const fetchCities = async () => {
      try {
        if(profile.province?.value){
          const provinceValue = profile.province.value;
          const res = await fetch(
            `https://secure.geonames.org/childrenJSON?geonameId=${provinceValue}&username=${GEONAMES_ID}`
          );
          if (res.ok) {
            const data = await res.json();
            const options: Option[] = data.geonames.map((city: any) => ({
              value: city.geonameId.toString(),
              label: city.name,
            }));

            // Remove duplicates if needed
            const uniqueOptions = Array.from(
              new Map(options.map((opt) => [opt.value, opt])).values()
            );
            uniqueOptions.sort((a, b) => a.label.localeCompare(b.label));
            setCityOptions(uniqueOptions);
          }
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
      if (dirtyFields[key]) {
        if (key.includes(".")) {
          const [parent] = key.split(".");
          if (!payload[parent]) payload[parent] = {};
        } else {
          payload[key] = profile[key as keyof typeof profile];
        }
      }
    }

    //console.log("Dirty Payload:", payload);

    const token = localStorage.getItem("token");
    if(!token){
        //console.log("You don't have token and you go to public view");
        setSaveStatus({ success: false, message: "Authentication failed. Please log in again." });
        return;
    }
    
    if(Object.keys(payload).length > 0){
      try {
        setSaveStatus({ success: false, message: "Saving profile changes..." });
        
        const data = await fetchWithAuth(`/profile/edit`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });

        console.log("Updated Profile:", data);
        setDirtyFields({});
        setSaveStatus({ success: true, message: "Profile updated successfully!" });

        if (alertTimeoutRef.current) {
          clearTimeout(alertTimeoutRef.current);
        }
        
        // Auto-dismiss success message after 3 seconds
        alertTimeoutRef.current = setTimeout(() => {
          setSaveStatus(null);
          alertTimeoutRef.current = null;
        }, 3000);
      } catch (error) {
        console.error("Error saving profile:", error);
        setSaveStatus({ success: false, message: "Failed to save profile changes. Please try again." });
      }
    } else{
      console.log("You didn't make any changes");
      setSaveStatus({ success: false, message: "No changes to save." });
    }
  };
    
  const handlePictureClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  if (isLoading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: "100vh" }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
        <span className="ms-2">Loading profile...</span>
      </div>
    );
  }

  return (
    <div className="profile-page">
      {/* Header Section */}
      <div className="profile-header">
        <div className="user-info-main">
          <div className="chat-avatar position-relative">
            {profile.profilePicture ? (
              <>
                <img
                src={profile.profilePicture}
                alt="Profile"
                className="rounded-circle border"
                onClick={handlePictureClick}
                onError={(e) => {
                //@ts-ignore
                e.target.src = "https://via.placeholder.com/120";
                }}
                />
                <div 
                className="overlay"
                onClick={handlePictureClick}
                >
                  <i className="icon">< Camera /></i>
                </div>
              </>
            ) : (
            <div className="avatar-placeholder">
              {(profile.name || profile.username).charAt(0).toUpperCase()}
            </div>
            )}
          </div>

          <input 
            type="file" 
            style={{ display: "none" }}
            accept="image/*"
            ref={fileInputRef}
            onChange={handleFileChange}
          />

          <h4 className="mt-2 fw-bold">{profile.name || "Name not set"}</h4>
          <p className="text">@{profile.username}</p>
          <p className="text">{profile.bio || "No bio available"}</p>
        </div>
      </div>

      {/* Save Status Alert */}
      {saveStatus && (
        <div className={`alert ${saveStatus.success ? 'alert-success' : 'alert-warning'} alert-dismissible fade show mx-auto my-3`}>
          {saveStatus.message}
          <button type="button" className="btn-close" onClick={() => {
            setSaveStatus(null);
            if (alertTimeoutRef.current) {
              clearTimeout(alertTimeoutRef.current);
              alertTimeoutRef.current = null;
            }
          }}></button>
        </div>
      )}

      {/* Profile Form */}
      <div className="container mt-4">
        <div className="card p-4 shadow-lg">
          <h5 className="mb-3">Basic Info</h5>
          <form onSubmit={handleSaveProfile} className="d-flex flex-column">
            <FormField
              label="Name"
              type="text"
              value={profile.name}
              onChange={(val) => handleFieldChange("name", val)}
              required
              minLength={2}
              maxLength={50}
            />
            
            <FormField
              label="Email"
              type="email"
              value={profile.email}
              onChange={(val) => handleFieldChange("email", val)}
              required
            />
            
            <FormField
              label="Username"
              type="text"
              value={profile.username}
              onChange={(val) => handleFieldChange("username", val)}
              required
              minLength={3}
              maxLength={30}
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
              resetDependentFields={resetProvinceAndCity}
            />

            {profile.country && (
              <FormField
                label="Province/State"
                type="select"
                options={provinceOptions}
                value={profile.province}
                onChange={(val) => handleFieldChange("province", val)}
                resetDependentFields={resetCity}
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
              maxLength={500}
            />

            <FormField
              label="Are you open"
              type="select"
              options={openOptions}
              value={profile.open}
              onChange={(val) => {
                handleFieldChange("open", val);
                resetTypeAndRate();
              }}
              returnRawValue={true} 
            />
            
            {profile.open === "Yes" && (
              <FormField
                label="Type"
                type="select"
                options={typeOptions}
                value={profile.type}
                onChange={(val) => {
                  handleFieldChange("type", val);
                  resetRate();
                }}
                required={profile.open === "Yes"}
                returnRawValue={true} 
              />
            )}
            
            {profile.open === "Yes" && profile.type === "Paid" && (
              <FormField
                label="Hourly Rate $"
                type="number"
                value={profile.rate}
                onChange={(val) => handleFieldChange("rate", val)}
                min={1}
                required={profile.open === "Yes" && profile.type === "Paid"}
              />
            )}

            <FormField
              label="Languages"
              type="multiselect"
              options={languageOptions}
              value={profile.languages}
              onChange={(selectedLanguages) => handleFieldChange("languages", selectedLanguages)}
            />

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
