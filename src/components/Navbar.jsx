import { Link, useLocation, useNavigate } from "react-router-dom";
import { FaHeart, FaShoppingCart, FaUser, FaComments, FaBell, FaBars, FaTimes } from "react-icons/fa";
import { useEffect, useState } from "react";
import apiService from "../services/api";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { useWishlist } from "../context/WishlistContext";

const navLinks = [
  { name: "Home", to: "/" },
  { name: "Contact", to: "/contact" },
  { name: "About", to: "/about" },
  { name: "Sign Up", to: "/signup" },
];

export default function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, userType } = useAuth();
  const [unread, setUnread] = useState(0);
  const { language, setLanguage } = useLanguage();
  const [menuOpen, setMenuOpen] = useState(false);
  const { wishlist } = useWishlist();

  useEffect(() => {
    if (user) {
      apiService.request("/notifications").then(res => {
        setUnread((res.notifications || []).filter(n => !n.read).length);
      });
    }
    // Real-time update for vendors
    if (userType === 'vendor' && user) {
      const off = window.socketService?.onOrderPlaced?.(() => {
        setUnread(u => u + 1);
      });
      return () => off && off();
    }
  }, [user, userType]);

  return (
    <header className="bg-primary text-white">
      <a href="#main-content" className="sr-only focus:not-sr-only bg-primary text-white px-4 py-2 absolute z-50">Skip to main content</a>
      <div className="bg-primary h-4 w-full" />
      <nav className="bg-white text-black shadow flex items-center justify-between px-4 md:px-8 py-4 relative" aria-label="Main navigation">
        <Link to="/" className="text-2xl font-bold font-mono">SheWorks</Link>
        {/* Hamburger for mobile */}
        <button className="md:hidden text-2xl ml-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary" onClick={() => setMenuOpen(m => !m)} aria-label={menuOpen ? "Close menu" : "Open menu"}>
          {menuOpen ? <FaTimes /> : <FaBars />}
        </button>
        {/* Nav links */}
        <ul className={`flex-col md:flex-row md:flex gap-8 absolute md:static top-full left-0 w-full md:w-auto bg-white md:bg-transparent z-40 shadow md:shadow-none transition-all duration-200 ${menuOpen ? 'flex' : 'hidden'} md:flex`}>
          {navLinks.map(link => (
            <li key={link.name}>
              <Link
                to={link.to}
                className={`hover:text-primary block py-2 md:py-0 px-4 md:px-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${location.pathname === link.to ? "font-semibold underline" : ""}`}
                onClick={() => setMenuOpen(false)}
              >
                {link.name}
              </Link>
            </li>
          ))}
        </ul>
        {/* User actions */}
        <div className={`gap-4 items-center ${menuOpen ? 'flex flex-col absolute top-full left-0 w-full bg-white z-40 p-4 md:static md:flex-row md:w-auto md:bg-transparent md:p-0' : 'hidden md:flex'} transition-all duration-200`}>
          <input
            className="bg-gray-100 px-3 py-1 rounded focus:outline-primary w-full md:w-auto"
            placeholder="What are you looking for?"
            aria-label="Search products"
          />
          <Link to="/wishlist" aria-label="Wishlist" className="relative">
            <FaHeart className="text-primary text-xl cursor-pointer" />
            {wishlist.length > 0 && <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full px-1">{wishlist.length}</span>}
          </Link>
          <Link to="/cart" aria-label="Cart"><FaShoppingCart className="text-primary text-xl cursor-pointer" /></Link>
          <Link to="/messages" aria-label="Messages"><FaComments className="text-primary text-xl cursor-pointer" /></Link>
          {user && (
            <div className="relative cursor-pointer" onClick={() => { setMenuOpen(false); navigate("/notifications"); }} tabIndex={0} aria-label="Notifications" role="button">
              <FaBell className="text-primary text-xl" />
              {unread > 0 && <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full px-1">{unread}</span>}
            </div>
          )}
          <Link to="/account" aria-label="Account"><FaUser className="text-primary text-xl cursor-pointer" /></Link>
          {userType === 'vendor' && (
            <Link to="/vendor-dashboard" className="nav-link" onClick={() => setMenuOpen(false)} aria-label="Vendor Dashboard">Vendor Dashboard</Link>
          )}
          {userType === 'admin' && (
            <Link to="/admin-dashboard" className="nav-link" onClick={() => setMenuOpen(false)} aria-label="Admin Dashboard">Admin Dashboard</Link>
          )}
          <select
            className="bg-gray-100 px-2 py-1 rounded border border-gray-300 text-sm mr-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            value={language}
            onChange={e => setLanguage(e.target.value)}
            aria-label="Select language"
          >
            <option value="en">English</option>
            <option value="ur">اردو</option>
          </select>
        </div>
      </nav>
    </header>
  );
}