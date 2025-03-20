import { AuthProvider } from './contexts/AuthContext';
import { UIProvider } from "./contexts/UIContext";
import { BrowserRouter as Router, Routes, Route, useLocation } from "react-router-dom";
import ProfileEdit from './components/ProfileEdit';
import Profile from "./components/Profile"
import Header from "./components/Header";
import Home from "./components/Home";
import LoginPage from './components/LoginPage';

// Create a wrapper component to conditionally render the header
const AppContent = () => {
  const location = useLocation();
  
  // Add paths where you don't want the header to appear
  const hideHeaderPaths = ['/login'];
  const shouldShowHeader = !hideHeaderPaths.includes(location.pathname);

  return (
    <>
      {shouldShowHeader && <Header />}
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<LoginPage />} />    
        <Route path="/profile/edit" element={<ProfileEdit />} />
        <Route path="/profile/:username" element={<Profile />} />
      </Routes>
    </>
  );
};

const App = () => {
  return ( 
    <AuthProvider>
      <UIProvider>
        <Router>
          <AppContent />
        </Router>
      </UIProvider>
    </AuthProvider>
  );
};

export default App;
