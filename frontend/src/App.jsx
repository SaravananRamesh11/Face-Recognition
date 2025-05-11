import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import './App.css';
import { Registration } from "./components/register.jsx";
import { Live } from "./components/Live.jsx";

function NavigationButtons() {
  const navigate = useNavigate();
  
  return (
    <nav className="navbar">
      <div className="nav-container">
        <button className="nav-button" onClick={() => navigate("/")}>Register</button>
        <button className="nav-button" onClick={() => navigate("/live")}>Live</button>
      </div>
    </nav>
  );
}

function App() {
  return (
    <Router>
      <NavigationButtons />
      <main className="main-content">
        <Routes>
          <Route path="/" element={<Registration />} /> 
          <Route path="/live" element={<Live />} /> 
        </Routes>
      </main>
    </Router>
  );
}

export default App;