import React, { createContext, useContext, useState, useEffect } from "react";

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
          setIsLoggedIn(true);
          setUserName(userObject.username) //seting the username in each reload
        }
      } catch (error) {
        console.error("Invalid token", error);
        setUserId(null);
      }
    } else {
      logout()
      //setUserId(null);
      //setIsLoggedIn(false);
    }
  }, [token]); 

  // Login function
  const login = (newToken: string) => {
    localStorage.setItem("token", newToken);
    setToken(newToken);
    setIsLoggedIn(true); // wrong here
  };

  // Logout function
  const logout = () => {
    localStorage.clear() //removeItem("token");
    setIsLoggedIn(false);
    setToken(null);
    setUserId(null)
    setUserName(null);
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

