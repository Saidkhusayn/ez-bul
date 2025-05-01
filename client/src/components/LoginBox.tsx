import React, { useState, useEffect } from "react";
import { useUI } from "../contexts/UIContext";
import { useAuth } from "../contexts/AuthContext";
import { debounce } from "lodash";
import languages from "../assets/languages.json";
const API_URL = import.meta.env.VITE_API_URL;
const GEONAMES_ID = import.meta.env.VITE_GEONAMES_ID;

interface LoginProps {
  isStandalone?: boolean;
  onLoginSuccess?: () => void;
}

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

interface ProfileData {
  name: string;
  email: string;
  username: string;
  country: LocationOption | null;
  province: LocationOption | null;
  city: LocationOption | null;
  birthday: string;
  open: string;
  type: string;
  rate: string;
  languages: LanguageOption[];
  bio: string;
  [key: string]: any;
}

const Login: React.FC<LoginProps> = ({ isStandalone = false, onLoginSuccess }) => {
  const { setShowLogin } = useUI();
  const { login } = useAuth();
  const [isRegistering, setIsRegistering] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successRedirect, setSuccessRedirect] = useState(false);

  const [usernameAvailability, setUsernameAvailability] = useState<{
    available: boolean | null;
    message: string;
  } | null>(null);
  
  // Signup process tracking console
  const [signupStep, setSignupStep] = useState(1);
  const [signupData, setSignupData] = useState<ProfileData>({
    username: "",
    email: "",
    password: "",
    name: "",
    birthday: "",
    bio: "",
    country: null as LocationOption | null,
    province: null as LocationOption | null,
    city: null as LocationOption | null,
    languages: [] as LanguageOption[],
    open: "",
    type: "",
    rate: "",
  });
  
  // Location options
  const [countryOptions, setCountryOptions] = useState<Option[]>([]);
  const [provinceOptions, setProvinceOptions] = useState<Option[]>([]);
  const [cityOptions, setCityOptions] = useState<Option[]>([]);
  
  // Form validation states
  const [formErrors, setFormErrors] = useState<{[key: string]: string}>({});
  
  // check Username Availability
  const checkUsernameAvailability = async (username: string) => {
    if (!username || username.length < 3) {
      setUsernameAvailability(null);
      return;
    }
    
    try {
      const response = await fetch(`${API_URL}/auth/check-username/${username}`);
      const data = await response.json();
      
      setUsernameAvailability({
        available: data.available,
        message: data.message
      });
    } catch (error) {
      console.error("Error checking username availability:", error);
      setUsernameAvailability(null);
    }
  };
  
  // Create a debounced version to avoid too many API calls
  const debouncedCheckUsername = debounce(checkUsernameAvailability, 500);


  // Handle login form submission
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);

    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        if (!isStandalone) {
          setShowLogin(false);
        }
        
        if (data.token) {
          login(data.token);
          localStorage.setItem("User", JSON.stringify(data));
          
          if (isStandalone) {
            setSuccessRedirect(true);
            if (onLoginSuccess) {
              onLoginSuccess();
            }
          }
          
          console.log("Login successful!");
        } else {
          console.error("Didn't get token");
        }
      } else {
        setError(data.message || "An error occurred. Please try again.");
        console.error("Login failed", data.message);
      }
    } catch (err) {
      setError("Network error. Please try again.");
      console.error("Error:", err);
    }
  };

  // Handle signup process
  const handleSignupStepChange = (e: React.FormEvent, direction: 'next' | 'prev') => {
    e.preventDefault();
    
    // Validate current step before proceeding
    const currentStepValid = validateCurrentStep();
    
    if (direction === 'next' && !currentStepValid) {
      return; // Don't proceed if validation failed
    }
    
    if (direction === 'next') {
      setSignupStep(prev => prev + 1);
    } else {
      setSignupStep(prev => prev - 1);
    }
  };
  
  const validateCurrentStep = (): boolean => {
    const errors: {[key: string]: string} = {};
    
    switch (signupStep) {
      case 1:
        // Validate username
        if (!signupData.username) {
          errors.username = "Username is required";
        } else if (signupData.username !== signupData.username.toLowerCase()) {
          errors.username = "Username must be lowercase";
        } else if (signupData.username.length < 3) {
          errors.username = "Username must be at least 3 characters";
        } else if (signupData.username.length > 30) {
          errors.username = "Username cannot exceed 30 characters";
        }

        // Also check username availability if we have that info
        if (usernameAvailability && !usernameAvailability.available) {
          errors.username = usernameAvailability.message;
        }

        
        // Validate email
        if (!signupData.email) {
          errors.email = "Email is required";
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(signupData.email)) {
          errors.email = "Enter a valid email address";
        }
        
        // Validate password
        if (!signupData.password) {
          errors.password = "Password is required";
        } else if (signupData.password.length < 6) {
          errors.password = "Password must be at least 6 characters";
        }
        break;
        
      case 2:
        // Validate name
        if (!signupData.name) {
          errors.name = "Name is required";
        } else if (signupData.name.length < 2) {
          errors.name = "Name must be at least 2 characters";
        } else if (signupData.name.length > 50) {
          errors.name = "Name cannot exceed 50 characters";
        }
        
        // Validate birthday
        if (!signupData.birthday) {
          errors.birthday = "Birthday is required";
        } else {
          const birthDate = new Date(signupData.birthday);
          const today = new Date();
          
          if (birthDate > today) {
            errors.birthday = "Birthday cannot be in the future";
          }
          
          // Check if user is at least 13 years old
          const thirteenYearsAgo = new Date();
          thirteenYearsAgo.setFullYear(today.getFullYear() - 13);
          
          if (birthDate > thirteenYearsAgo) {
            errors.birthday = "You must be at least 13 years old";
          }
        }
        
        // Validate bio
        if (signupData.bio && signupData.bio.length > 50) {
          errors.bio = "Bio cannot exceed 50 characters";
        }
        break;
        
      case 3:
        // Validate country
        if (!signupData.country) {
          errors.country = "Country is required";
        }
        
        break;
        
      case 4:
        // Validate "open" status
        if (!signupData.open) {
          errors.open = "Please select if you're open to questions";
        }
        
        // Validate type if open is "Yes"
        if (signupData.open === "Yes" && !signupData.type) {
          errors.type = "Please select host type";
        }
        
        // Validate rate if type is "Paid"
        if (signupData.open === "Yes" && signupData.type === "Paid") {
          if (!signupData.rate) {
            errors.rate = "Hourly rate is required";
          } else if (parseFloat(signupData.rate) <= 0) {
            errors.rate = "Rate must be greater than 0";
          }
        }
        break;
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };
  
  const handleSignupDataChange = (field: string, value: any) => {
    setSignupData(prev => ({ ...prev, [field]: value }));
    
    // Clear the error for this field when user makes a change
    if (formErrors[field]) {
      setFormErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
    
    // Reset dependent fields when parent field changes
    if (field === "country") {
      setSignupData(prev => ({ ...prev, province: null, city: null }));
      setProvinceOptions([]);
      setCityOptions([]);
    } else if (field === "province") {
      setSignupData(prev => ({ ...prev, city: null }));
      setCityOptions([]);
    } else if (field === "open" && value !== "Yes") {
      setSignupData(prev => ({ ...prev, type: "", rate: "" }));
    } else if (field === "type" && value !== "Paid") {
      setSignupData(prev => ({ ...prev, rate: "" }));
    }
  };
  
  const handleSubmitSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Final validation
    const isValid = validateCurrentStep();
    if (!isValid) return;
    
    // Prepare data for API
    const payload = {
      ...signupData,
      username: signupData.username.toLowerCase(), 
    };
    
    try {
      const response = await fetch(`${API_URL}/auth/register`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (response.ok) {
        if (!isStandalone) {
          setShowLogin(false);
        }
        
        if (data.token) {
          login(data.token);
          localStorage.setItem("User", JSON.stringify(data));
          
          if (isStandalone) {
            setSuccessRedirect(true);
            if (onLoginSuccess) {
              onLoginSuccess();
            }
          }
          
          console.log("Registration successful!");
        } else {
          console.error("Didn't get token");
        }
      } else {
        setError(data.message || "An error occurred. Please try again.");
        console.error("Registration failed", data.message);
      }
    } catch (err) {
      setError("Network error. Please try again.");
      console.error("Error:", err);
    }
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
      }
    };

    if (isRegistering && signupStep === 3) {
      fetchCountries();
    }
  }, [isRegistering, signupStep]);
  
  // Fetch provinces based on selected country
  useEffect(() => {
    if (!signupData.country || !isRegistering) return;
    
    const fetchProvinces = async () => {
      try {
        const countryValue = signupData.country?.value;
        if (!countryValue) return;
        
        const res = await fetch(
          `https://secure.geonames.org/childrenJSON?geonameId=${countryValue}&username=${GEONAMES_ID}`
        );
        
        if (res.ok) {
          const data = await res.json();
          const options: Option[] = data.geonames.map((prov: any) => ({
            value: prov.geonameId.toString(),
            label: prov.adminName1,
          }));

          // Remove duplicates if any
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
  }, [signupData.country, isRegistering]);
  
  // Fetch cities based on selected province
  useEffect(() => {
    if (!signupData.province || !isRegistering) return;
    
    const fetchCities = async () => {
      try {
        const provinceValue = signupData.province?.value;
        if (!provinceValue) return;
        
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
      } catch (error) {
        console.error("Error fetching cities:", error);
      }
    };

    fetchCities();
  }, [signupData.province, isRegistering]);

  // Show success message if login successful on standalone page
  if (isStandalone && successRedirect) {
    return (
      <div className="modal-overlay">
        <div className="login-modal">
          <div className="redirect-container">
            <h1 className="redirect-title">Welcome!</h1>
            <p className="redirect-message">
              You will be redirected back to home shortly.
            </p>
            <p className="redirect-fallback">
              If you are not redirected automatically, follow <a href="/">this link</a>.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="login-overlay"> 
      <div className="login-modal">
        <div className="login-header">
          <h2>{isRegistering ? "Sign Up" : "Log In"}</h2>
          {!isStandalone && (
            <button 
              className="close-btn" 
              onClick={() => setShowLogin(false)}
              aria-label="Close"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="11" stroke="#4C9AFF" strokeWidth="2"/>
                <path d="M8 8L16 16M8 16L16 8" stroke="#4C9AFF" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </button>
          )}
        </div>
        
        <div className="login-terms">
          By continuing, you agree to our <a href="#" className="terms-link">User Agreement</a> and 
          acknowledge that you understand the <a href="#" className="terms-link">Privacy Policy</a>.
        </div>
        
        {!isRegistering ? (
          // LOGIN FORM
          <>
            <div className="login-options">
              <button className="social-login-button phone-button">
                <span className="icon">📱</span>
                Continue With Phone Number
              </button>
              
              <button className="social-login-button google-button">
                <span className="icon">
                  <svg viewBox="0 0 24 24" width="18" height="18">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                </span>
                Continue with Google
              </button>
              
              <button className="social-login-button apple-button">
                <span className="icon">
                  <svg viewBox="0 0 24 24" width="18" height="18">
                    <path fill="currentColor" d="M17.05 20.28c-.98.95-2.05.94-3.08.42-1.09-.54-2.08-.52-3.19.02-1.42.69-2.13.53-3.04-.41C3.9 16.22 3.98 10.29 8.1 9.98c1.36-.1 2.26.5 3.03.5.78 0 2.26-.62 3.77-.42 1.58.2 2.76.9 3.51 2.28-3.2 1.94-2.35 6.47.64 7.95zM12.03 9.5c-.2-2.23 1.46-4.46 3.67-4.5.27 2-1.8 4.5-3.67 4.5z"/>
                  </svg>
                </span>
                Continue With Apple
              </button>
            </div>
            
            <div className="login-divider">
              <span>OR</span>
            </div>
            
            <form className="login-form" onSubmit={handleLogin}>
              {error && <div className="login-error alert alert-danger">{error}</div>}
              
              <div className="form-group mb-3">
                <label htmlFor="email" className="form-label">Email</label>
                <input 
                  type="text" 
                  id="email"
                  name="email" 
                  className="form-control" 
                  placeholder="Email or username" 
                  required 
                />
              </div>
              
              <div className="form-group mb-3">
                <label htmlFor="password" className="form-label">Password</label>
                <input 
                  type="password"
                  id="password" 
                  name="password" 
                  className="form-control" 
                  placeholder="Password" 
                  required 
                />
              </div>
              
              <div className="login-links mb-3">
                <a href="#" className="forgot-password">Forgot password?</a>
                <div className="signup-prompt">
                  New to our platform? <a href="#" className="signup-link" onClick={(e) => {
                    e.preventDefault();
                    setIsRegistering(true);
                    setSignupStep(1);
                    setError(null);
                    setFormErrors({});
                  }}>Sign Up</a>
                </div>
              </div>
              
              <button type="submit" className="login-button btn btn-primary w-100">
                Log In
              </button>
            </form>
          </>
        ) : (
          // SIGNUP MULTI-STEP FORM
          <div className="signup-container">
            {/* Step indicator */}
            <div className="step-indicator mb-4">
              <div className="progress">
                <div 
                  className="progress-bar" 
                  role="progressbar" 
                  style={{ width: `${(signupStep / 4) * 100}%` }}
                  aria-valuenow={(signupStep / 4) * 100} 
                  aria-valuemin={0} 
                  aria-valuemax={100}
                ></div>
              </div>
              <div className="step-text">
                Step {signupStep} of 4
              </div>
            </div>
            
            {error && <div className="signup-error alert alert-danger">{error}</div>}
            
            {/* Step 1: Account Info */}
            {signupStep === 1 && (
              <form className="signup-form" onSubmit={(e) => handleSignupStepChange(e, 'next')}>
                <div className="form-group mb-3">
                  <label htmlFor="signup-username" className="form-label">Username</label>
                  <input 
                    type="text" 
                    id="signup-username"
                    className={`form-control ${formErrors.username ? 'is-invalid' : usernameAvailability?.available === false ? 'is-invalid' : usernameAvailability?.available === true ? 'is-valid' : ''}`}
                    value={signupData.username} 
                    onChange={(e) => {
                      const newUsername = e.target.value;
                      handleSignupDataChange("username", newUsername);
                      if (newUsername && newUsername.length >= 3) {
                        debouncedCheckUsername(newUsername);
                      } else {
                        setUsernameAvailability(null);
                      }
                    }}
                    placeholder="Username (lowercase)" 
                    required 
                  />
                  {formErrors.username && <div className="invalid-feedback">{formErrors.username}</div>}
                  {!formErrors.username && usernameAvailability && (
                    <div className={`${usernameAvailability.available ? 'valid-feedback' : 'invalid-feedback'}`} style={{display: 'block'}}>
                      {usernameAvailability.message}
                    </div>
                  )}
                </div>
                
                <div className="form-group mb-3">
                  <label htmlFor="signup-email" className="form-label">Email</label>
                  <input 
                    type="email" 
                    id="signup-email"
                    className={`form-control ${formErrors.email ? 'is-invalid' : ''}`}
                    value={signupData.email} 
                    onChange={(e) => handleSignupDataChange("email", e.target.value)}
                    placeholder="Email" 
                    required 
                  />
                  {formErrors.email && <div className="invalid-feedback">{formErrors.email}</div>}
                </div>
                
                <div className="form-group mb-3">
                  <label htmlFor="signup-password" className="form-label">Password</label>
                  <input 
                    type="password" 
                    id="signup-password"
                    className={`form-control ${formErrors.password ? 'is-invalid' : ''}`}
                    value={signupData.password} 
                    onChange={(e) => handleSignupDataChange("password", e.target.value)}
                    placeholder="Password" 
                    required 
                  />
                  {formErrors.password && <div className="invalid-feedback">{formErrors.password}</div>}
                </div>
                
                <div className="form-actions d-flex justify-content-between mt-4">
                  <button 
                    type="button" 
                    className="btn btn-outline-secondary" 
                    onClick={() => {
                      setIsRegistering(false);
                      setError(null);
                      setFormErrors({});
                      setUsernameAvailability(null); // Add this line

                    }}
                  >
                    Back to Login
                  </button>
                  <button type="submit" className="btn btn-primary">Next</button>
                </div>
              </form>
            )}
            
            {/* Step 2: Personal Info */}
            {signupStep === 2 && (
              <form className="signup-form" onSubmit={(e) => handleSignupStepChange(e, 'next')}>
                <div className="form-group mb-3">
                  <label htmlFor="signup-name" className="form-label">Name/Nickname</label>
                  <input 
                    type="text" 
                    id="signup-name"
                    className={`form-control ${formErrors.name ? 'is-invalid' : ''}`}
                    value={signupData.name} 
                    onChange={(e) => handleSignupDataChange("name", e.target.value)}
                    placeholder="Your displayed name" 
                    required 
                  />
                  {formErrors.name && <div className="invalid-feedback">{formErrors.name}</div>}
                </div>
                
                <div className="form-group mb-3">
                  <label htmlFor="signup-birthday" className="form-label">Date of Birth</label>
                  <input 
                    type="date" 
                    id="signup-birthday"
                    className={`form-control ${formErrors.birthday ? 'is-invalid' : ''}`}
                    value={signupData.birthday} 
                    onChange={(e) => handleSignupDataChange("birthday", e.target.value)}
                    required 
                  />
                  {formErrors.birthday && <div className="invalid-feedback">{formErrors.birthday}</div>}
                </div>
                
                <div className="form-group mb-3">
                  <label htmlFor="signup-bio" className="form-label">Bio (max 50 characters)</label>
                  <textarea 
                    id="signup-bio"
                    className={`form-control ${formErrors.bio ? 'is-invalid' : ''}`}
                    value={signupData.bio} 
                    onChange={(e) => handleSignupDataChange("bio", e.target.value)}
                    placeholder="Tell us about yourself" 
                    maxLength={50}
                    rows={2}
                  />
                  <small className="text-muted">{signupData.bio.length}/50 characters</small>
                  {formErrors.bio && <div className="invalid-feedback">{formErrors.bio}</div>}
                </div>
                
                <div className="form-actions d-flex justify-content-between mt-4">
                  <button 
                    type="button" 
                    className="btn btn-outline-secondary" 
                    onClick={(e) => handleSignupStepChange(e, 'prev')}
                  >
                    Back
                  </button>
                  <button type="submit" className="btn btn-primary">Next</button>
                </div>
              </form>
            )}
            
            {/* Step 3: Location & Languages */}
            {signupStep === 3 && (
              <form className="signup-form" onSubmit={(e) => handleSignupStepChange(e, 'next')}>
                <div className="form-group mb-3">
                  <label htmlFor="signup-country" className="form-label">Country</label>
                  <select
                    id="signup-country"
                    className={`form-select ${formErrors.country ? 'is-invalid' : ''}`}
                    value={signupData.country?.value || ""}
                    onChange={(e) => {
                      const selectedOption = countryOptions.find(option => option.value === e.target.value);
                      handleSignupDataChange("country", selectedOption || null);
                    }}
                    required
                  >
                    <option value="">Select a country</option>
                    {countryOptions.map(option => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                  {formErrors.country && <div className="invalid-feedback">{formErrors.country}</div>}
                </div>
                
                {signupData.country && provinceOptions.length > 0 && (
                  <div className="form-group mb-3">
                    <label htmlFor="signup-province" className="form-label">Province/State</label>
                    <select
                      id="signup-province"
                      className="form-select"
                      value={signupData.province?.value || ""}
                      onChange={(e) => {
                        const selectedOption = provinceOptions.find(option => option.value === e.target.value);
                        handleSignupDataChange("province", selectedOption || null);
                      }}
                    >
                      <option value="">Select a province/state</option>
                      {provinceOptions.map(option => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </div>
                )}
                
                {signupData.province && cityOptions.length > 0 && (
                  <div className="form-group mb-3">
                    <label htmlFor="signup-city" className="form-label">City</label>
                    <select
                      id="signup-city"
                      className="form-select"
                      value={signupData.city?.value || ""}
                      onChange={(e) => {
                        const selectedOption = cityOptions.find(option => option.value === e.target.value);
                        handleSignupDataChange("city", selectedOption || null);
                      }}
                    >
                      <option value="">Select a city</option>
                      {cityOptions.map(option => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </div>
                )}
                
                <div className="form-group mb-3">
                  <label htmlFor="signup-languages" className="form-label">Languages</label>
                  <select
                    id="signup-languages"
                    className="form-select"
                    value={signupData.languages.map(lang => lang.value)}
                    onChange={(e) => {
                      const selectedValues = Array.from(e.target.selectedOptions, option => option.value);
                      const selectedLanguages = languageOptions.filter(lang => selectedValues.includes(lang.value));
                      handleSignupDataChange("languages", selectedLanguages)
                    }}
                    multiple
                    size={5}
                  >
                    {languageOptions.map(option => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                  <small className="text-muted">Hold Ctrl (or Cmd) to select multiple languages</small>
                </div>
                
                <div className="form-actions d-flex justify-content-between mt-4">
                  <button 
                    type="button" 
                    className="btn btn-outline-secondary" 
                    onClick={(e) => handleSignupStepChange(e, 'prev')}
                  >
                    Back
                  </button>
                  <button type="submit" className="btn btn-primary">Next</button>
                </div>
              </form>
            )}
            
            {/* Step 4: Host Preferences */}
            {signupStep === 4 && (
              <form className="signup-form" onSubmit={handleSubmitSignup}>
                <div className="form-group mb-3">
                  <label htmlFor="signup-open" className="form-label">Are you open to questions and guests?</label>
                  <select
                    id="signup-open"
                    className={`form-select ${formErrors.open ? 'is-invalid' : ''}`}
                    value={signupData.open}
                    onChange={(e) => handleSignupDataChange("open", e.target.value)}
                    required
                  >
                    <option value="">Select an option</option>
                    {openOptions.map(option => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                  {formErrors.open && <div className="invalid-feedback">{formErrors.open}</div>}
                </div>
                
                {signupData.open === "Yes" && (
                  <div className="form-group mb-3">
                    <label htmlFor="signup-type" className="form-label">Host Type</label>
                    <select
                      id="signup-type"
                      className={`form-select ${formErrors.type ? 'is-invalid' : ''}`}
                      value={signupData.type}
                      onChange={(e) => handleSignupDataChange("type", e.target.value)}
                      required={signupData.open === "Yes"}
                    >
                      <option value="">Select host type</option>
                      {typeOptions.map(option => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                    {formErrors.type && <div className="invalid-feedback">{formErrors.type}</div>}
                  </div>
                )}
                
                {signupData.open === "Yes" && signupData.type === "Paid" && (
                  <div className="form-group mb-3">
                    <label htmlFor="signup-rate" className="form-label">Hourly Rate ($)</label>
                    <input
                      id="signup-rate"
                      type="number"
                      className={`form-control ${formErrors.rate ? 'is-invalid' : ''}`}
                      value={signupData.rate}
                      onChange={(e) => handleSignupDataChange("rate", e.target.value)}
                      min="1"
                      step="0.01"
                      required={signupData.open === "Yes" && signupData.type === "Paid"}
                    />
                    {formErrors.rate && <div className="invalid-feedback">{formErrors.rate}</div>}
                  </div>
                )}
                
                <div className="form-actions d-flex justify-content-between mt-4">
                  <button 
                    type="button" 
                    className="btn btn-outline-secondary" 
                    onClick={(e) => handleSignupStepChange(e, 'prev')}
                  >
                    Back
                  </button>
                  <button type="submit" className="btn btn-primary">Complete Sign Up</button>
                </div>
              </form>
            )}
            
            {/* Back to Login link */}
            <div className="login-links mt-3">
              <div className="login-prompt text-center">
                Already have an account? <a href="#" className="login-link" onClick={(e) => {
                  e.preventDefault();
                  setIsRegistering(false);
                  setError(null);
                  setFormErrors({});
                }}>Log In</a>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Login;