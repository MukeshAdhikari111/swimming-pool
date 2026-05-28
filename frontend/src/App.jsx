import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Entry from './pages/Entry';
import Visitors from './pages/Visitors';
import Admin from './pages/Admin';
import SettingsPage from './pages/Settings';
import Tasks from './pages/Tasks';
import Auth from './pages/Auth';
import Home from './pages/Home';
import { isAuthenticated } from './auth';
import { Bell, Menu, Search, Sun } from 'lucide-react';

const Topbar = () => (
  <header className="topbar">
    <button className="icon-button mobile-menu" aria-label="Open navigation">
      <Menu size={20} />
    </button>
    <div>
      <p className="topbar-kicker">Pool operations</p>
      <h1>US Amusement Park Manager</h1>
    </div>
    <div className="topbar-actions">
      <div className="topbar-search">
        <Search size={16} />
        <input placeholder="Search visitors and tickets" />
      </div>
      <button className="icon-button" aria-label="Toggle theme" title="Theme">
        <Sun size={18} />
      </button>
      <button className="icon-button" aria-label="Notifications" title="Notifications">
        <Bell size={18} />
      </button>
    </div>
  </header>
);

const AppShell = () => {
  const location = useLocation();
  const authRoute = location.pathname === '/login';
  const publicRoute = location.pathname === '/';
  const managementRoute = location.pathname.startsWith('/app');
  const authed = isAuthenticated();

  if (!authed && managementRoute) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (authed && authRoute) {
    return <Navigate to="/app" replace />;
  }

  if (publicRoute || authRoute) {
    return (
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Auth mode="login" />} />
      </Routes>
    );
  }

  return (
    <div className="app-container">
      <Sidebar />
      <main className="main-content">
        <Topbar />
        <Routes>
          <Route path="/app" element={<Dashboard />} />
          <Route path="/app/entry" element={<Entry />} />
          <Route path="/app/tickets" element={<Entry />} />
          <Route path="/app/visitors" element={<Visitors />} />
          <Route path="/app/tasks" element={<Tasks />} />
          <Route path="/app/analytics" element={<Dashboard analyticsOnly />} />
          <Route path="/app/settings" element={<SettingsPage />} />
          <Route path="/app/admin" element={<Admin />} />
          <Route path="*" element={<Navigate to={authed ? '/app' : '/'} replace />} />
        </Routes>
      </main>
    </div>
  );
};

function App() {
  return (
    <Router>
      <AppShell />
    </Router>
  );
}

export default App;
