import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import Login from "./Login";

const LoginPage = () => {
  const { isLoggedIn } = useAuth();
  const navigate = useNavigate();
  const [redirectPending, setRedirectPending] = useState(true);

  useEffect(() => {
    if (isLoggedIn && redirectPending) {
      const timer = setTimeout(() => {
        navigate("/");
      }, 4000); // 4 seconds
      
      return () => clearTimeout(timer);
    }
  }, [isLoggedIn, navigate, redirectPending]);

  // If user is already logged in, show redirect message
  if (isLoggedIn) {
    return (
    <div className="modal-overlay">
        <div className="login-modal">
        <div className="redirect-container">
            <h1 className="redirect-title">Welcome back!</h1>
            <p className="redirect-message">
            You are already logged in and will be redirected back to home shortly.
            </p>
            <p className="redirect-fallback">
            If you are not redirected automatically, follow <Link to="/">this link</Link>.
            </p>
        </div>
        </div>
    </div>

    );
  }

  // If user is not logged in, show the login component
  return (
    <div className="login-modal">
      <Login 
        isStandalone={true} 
        onLoginSuccess={() => {
          setRedirectPending(true);
        }} 
      />
    </div>
  );
};

export default LoginPage;