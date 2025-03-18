import { AuthProvider } from './contexts/AuthContext';
import { UIProvider } from "./contexts/UIContext";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import ProfileEdit from './components/ProfileEdit';
import Profile from "./components/Profile"
import Header from "./components/Header";
import Home from "./components/Home";
//import Login from './components/Login';

const App = () => {
 
  return ( 
    <AuthProvider>
      <UIProvider>
        <Router>
          <Header></Header>
          <Routes>
            <Route path="/" element={<Home />} />    
            <Route path="/profile/edit" element={<ProfileEdit />} />
            <Route path="/profile/:username" element={<Profile />} />
          </Routes>
        </Router>
      </UIProvider>
    </AuthProvider>
  );
};

export default App;
