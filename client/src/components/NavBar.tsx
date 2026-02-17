import { NavLink } from 'react-router-dom';

export function NavBar() {
  return (
    <nav className="nav-bar">
      <NavLink to="/" className={({ isActive }) => (isActive ? 'active' : '')} end>
        Home
      </NavLink>
      <NavLink to="/handover" className={({ isActive }) => (isActive ? 'active' : '')}>
        Handover
      </NavLink>
      <NavLink to="/trip/start" className={({ isActive }) => (isActive ? 'active' : '')}>
        Trip
      </NavLink>
      <NavLink to="/log" className={({ isActive }) => (isActive ? 'active' : '')}>
        Log
      </NavLink>
      <NavLink to="/admin/export" className={({ isActive }) => (isActive ? 'active' : '')}>
        Admin
      </NavLink>
    </nav>
  );
}
