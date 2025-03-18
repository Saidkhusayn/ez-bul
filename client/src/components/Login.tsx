import React, { useState } from "react";
import { useUI } from "../contexts/UIContext";
import { useAuth } from "../contexts/AuthContext";
const API_URL = import.meta.env.VITE_API_URL;

const Login: React.FC = () => {
  const { setShowLogin } = useUI();
  const { login } = useAuth();

  const [isRegistering, setIsRegistering] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

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
        setShowLogin(false);
        if (data.token) {
          login(data.token);
        } else {
          console.error("Didn't get token");
        }
        console.log(`${isRegistering ? "Registration" : "Login"} successful!`, data);

        localStorage.setItem("User", JSON.stringify(data)) //here!
      } else {
        setError(data.message || "An error occurred. Please try again.");
        console.error(`${isRegistering ? "Registration" : "Login"} failed`, data.message);
      }
    } catch (err) {
      setError("Network error. Please try again.");
      console.error("Error:", err);
    }
  };

  return (
      <div className="modal-overlay">
          <div className="login-modal">
          <form onSubmit={handleLogin}>
            <h4>{isRegistering ? "Register" : "Login"}</h4>
            {error && <div className="alert alert-danger">{error}</div>}
            {isRegistering && (
              <div className="mb-2">
                <input
                  type="text"
                  name="username"
                  className="form-control"
                  placeholder="Username"
                  required
                />
              </div>
            )}
            <div className="mb-2">
              <input
                type="email"
                name="email"
                className="form-control"
                placeholder="Email"
                required
              />
            </div>
            <div className="mb-2">
              <input
                type="password"
                name="password"
                className="form-control"
                placeholder="Password"
                required
              />
            </div>
            <button type="submit" className="btn btn-primary w-100 mb-2">
              {isRegistering ? "Register" : "Login"}
            </button>
            <button
              type="button"
              className="btn btn-secondary w-100 mb-2"
              onClick={() => setShowLogin(false)}
            >
              Close
            </button>
            <a
              onClick={() => {
                setIsRegistering(!isRegistering);
                setError(null);
              }}
              style={{ cursor: "pointer", color: "blue", textDecoration: "underline" }}
            >
              {isRegistering
                ? "Already have an account? Login"
                : "Don't have an account? Register"}
            </a>
          </form>
        </div>
    </div>
    
  );
};

export default Login;
