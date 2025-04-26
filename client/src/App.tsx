import { AuthProvider } from './contexts/AuthContext';
import { UIProvider } from "./contexts/UIContext";
import { BrowserRouter as Router, Routes, Route, useLocation } from "react-router-dom";
import ProfileEdit from './pages/ProfileEdit';
import Profile from "./pages/ProfilePage"
import Header from "./components/Header";
import Home from "./pages/Home";
import LoginPage from './pages/LoginPage';
import SearchLocation from './pages/HostListing'

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
        <Route path="/host-listing" element={<SearchLocation />} />
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
