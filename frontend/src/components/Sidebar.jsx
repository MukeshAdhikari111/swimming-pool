import { NavLink } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { BarChart3, ChevronLeft, FileText, LayoutDashboard, LogIn, LogOut, Settings, SquareCheckBig, Ticket, Users } from 'lucide-react';
import { clearAuth, getAuthUser, isAuthenticated } from '../auth';
import './Sidebar.css';

const Sidebar = () => {
  const [user, setUser] = useState(getAuthUser());
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const syncAuth = () => setUser(getAuthUser());
    window.addEventListener('auth-change', syncAuth);
    window.addEventListener('storage', syncAuth);
    return () => {
      window.removeEventListener('auth-change', syncAuth);
      window.removeEventListener('storage', syncAuth);
    };
  }, []);

  const handleLogout = () => {
    clearAuth();
    window.location.href = '/login';
  };

  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-header">
        <div className="logo-icon">
          <img src="/brand/us-amusement-logo.svg" alt="US Amusement Park" />
        </div>
        <div className="brand-copy">
          <h2>US Amusement</h2>
          <span>Pool desk</span>
        </div>
        <button className="collapse-button" onClick={() => setCollapsed(!collapsed)} aria-label="Collapse sidebar">
          <ChevronLeft size={18} />
        </button>
      </div>
      
      <nav className="sidebar-nav">
        <NavLink to="/app" end className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <LayoutDashboard size={20} />
          <span>Dashboard</span>
        </NavLink>
        <NavLink to="/app/visitors" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <Users size={20} />
          <span>Visitors</span>
        </NavLink>
        <NavLink to="/app/tickets" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <Ticket size={20} />
          <span>Tickets</span>
        </NavLink>
        <NavLink to="/app/tasks" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <SquareCheckBig size={20} />
          <span>Tasks</span>
        </NavLink>
        <NavLink to="/app/analytics" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <BarChart3 size={20} />
          <span>Analytics</span>
        </NavLink>
        <NavLink to="/app/admin" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <FileText size={20} />
          <span>Admin</span>
        </NavLink>
        <NavLink to="/app/settings" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <Settings size={20} />
          <span>Settings</span>
        </NavLink>
        {!isAuthenticated() && (
          <NavLink to="/login" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <LogIn size={20} />
            <span>Login</span>
          </NavLink>
        )}
      </nav>
      
      <div className="sidebar-footer">
        {user && (
          <button className="logout-btn" onClick={handleLogout}>
            <LogOut size={16} />
            <span>{user.name}</span>
          </button>
        )}
        <p>US Amusement Park</p>
      </div>
    </aside>
  );
};

export default Sidebar;
