import React, { createContext, useContext, useState, useEffect } from "react";
const API_URL = import.meta.env.VITE_API_URL;

interface AuthContextType {
  isLoggedIn: boolean;
  userId: string | null;
  userName: string | null;
  login: (token: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(localStorage.getItem("token"));
  const [userId, setUserId] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn ] = useState<boolean>(false)

   
  // Set token and userId 
  useEffect(() => {
    if (token) {
      try {
        const storedUser = localStorage.getItem("User");
        if (storedUser) {
          const userObject = JSON.parse(storedUser);
          setUserId(userObject.userId);
          setUserName(userObject.username) 
          setIsLoggedIn(true);
        }
      } catch (error) {
        console.error("Invalid token", error);
      }
    } else {
      logout()
    }
  }, [token]); 

  // Login function
  const login = (newToken: string) => {
    localStorage.setItem("token", newToken);
    setToken(newToken);
  };

  // Logout function
  const logout = async () => {
    localStorage.clear();  //removeItem("token");
    setIsLoggedIn(false);
    setToken(null);
    setUserId(null)
    setUserName(null);
    await fetch(`${API_URL}/auth/logout`, { method: "POST", credentials: "include" });
  };

  return (
    <AuthContext.Provider value={{ isLoggedIn, userId, userName, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

// Hook to use AuthContext
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

