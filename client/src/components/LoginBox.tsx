import React, { useState } from "react";
import { useUI } from "../contexts/UIContext";
import { useAuth } from "../contexts/AuthContext";
const API_URL = import.meta.env.VITE_API_URL;

interface LoginProps {
  isStandalone?: boolean;
  onLoginSuccess?: () => void;
}

const Login: React.FC<LoginProps> = ({ isStandalone = false, onLoginSuccess }) => {
  const { setShowLogin } = useUI();
  const { login } = useAuth();
  const [isRegistering, setIsRegistering] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successRedirect, setSuccessRedirect] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);

    const username = formData.get("username") as string;
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    const url = isRegistering
      ? `${API_URL}/auth/register`
      : `${API_URL}/auth/login`;

    try {
      const response = await fetch(url, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, email, password }),
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
          
          console.log(`${isRegistering ? "Registration" : "Login"} successful!`, data);
        } else {
          console.error("Didn't get token");
        }
      } else {
        setError(data.message || "An error occurred. Please try again.");
        console.error(`${isRegistering ? "Registration" : "Login"} failed`, data.message);
      }
    } catch (err) {
      setError("Network error. Please try again.");
      console.error("Error:", err);
    }
  };

    // Show success message if login successful on standalone page btn
  if (isStandalone && successRedirect) {
    return (
      <div className="modal-overlay">
        <div className="login-modal">
        <div className="redirect-container">
            <h1 className="redirect-title">Welcome back!</h1>
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
        
        {/* Rest of your component remains the same */}
        {isRegistering ? (
          <div className="login-terms">
            By continuing, you agree to our <a href="#" className="terms-link">User Agreement</a> and 
            acknowledge that you understand the <a href="#" className="terms-link">Privacy Policy</a>.
          </div>
        ) : (
          <div className="login-terms">
            By continuing, you agree to our <a href="#" className="terms-link">User Agreement</a> and 
            acknowledge that you understand the <a href="#" className="terms-link">Privacy Policy</a>.
          </div>
        )}
        
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
          {error && <div className="login-error">{error}</div>}
          
          <div className="form-group">
            <input 
              type="text" 
              name={isRegistering ? "username" : "email"} 
              className="form-control" 
              placeholder={isRegistering ? "Username" : "Email or username"} 
              required 
            />
          </div>
          
          {isRegistering && (
            <div className="form-group">
              <input 
                type="email" 
                name="email" 
                className="form-control" 
                placeholder="Email" 
                required 
              />
            </div>
          )}
          
          <div className="form-group">
            <input 
              type="password" 
              name="password" 
              className="form-control" 
              placeholder="Password" 
              required 
            />
          </div>
          
          <div className="login-links">
            <a href="#" className="forgot-password">Forgot password?</a>
            {!isRegistering && (
              <div className="signup-prompt">
                New to Reddit? <a href="#" className="signup-link" onClick={(e) => {
                  e.preventDefault();
                  setIsRegistering(true);
                  setError(null);
                }}>Sign Up</a>
              </div>
            )}
          </div>
          
          <button type="submit" className="login-button">
            {isRegistering ? "Sign Up" : "Log In"}
          </button>
          
          {isRegistering && (
            <div className="login-links">
              <div className="login-prompt">
                Already have an account? <a href="#" className="login-link" onClick={(e) => {
                  e.preventDefault();
                  setIsRegistering(false);
                  setError(null);
                }}>Log In</a>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default Login;
