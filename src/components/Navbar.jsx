import { Link, useLocation, useNavigate } from "react-router-dom";
import { FaHeart, FaShoppingCart, FaUser, FaComments, FaBell, FaBars, FaTimes, FaSignOutAlt } from "react-icons/fa";
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
  const { user, userType, logout } = useAuth();
  const [unread, setUnread] = useState(0);
  const { language, setLanguage } = useLanguage();
  const [menuOpen, setMenuOpen] = useState(false);
  const { wishlist } = useWishlist();

  // Dynamic nav links based on authentication status
  const navLinks = [
    { name: "Home", to: "/" },
    { name: "Contact", to: "/contact" },
    { name: "About", to: "/about" },
    // Only show Sign Up if user is not logged in
    ...(!user ? [{ name: "Sign Up", to: "/signup" }] : [])
  ];

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

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/login");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  return (
    <header className="bg-primary text-white">
      <a href="#main-content" className="sr-only focus:not-sr-only bg-primary text-white px-4 py-2 absolute z-50">Skip to main content</a>
      <div className="bg-primary h-4 w-full" />
      <nav className="bg-white text-black shadow flex items-center justify-between px-4 md:px-8 py-4 relative" aria-label="Main navigation">
        <Link to="/" className="text-2xl font-bold font-mono">SheWorks</Link>
        
        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-8">
          {/* Nav links */}
          <ul className="flex gap-8">
            {navLinks.map(link => (
              <li key={link.name}>
                <Link
                  to={link.to}
                  className={`hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${location.pathname === link.to ? "font-semibold underline" : ""}`}
                >
                  {link.name}
                </Link>
              </li>
            ))}
          </ul>
          
          {/* Desktop User Actions */}
          <div className="flex items-center gap-4">
            <input
              className="bg-gray-100 px-3 py-1 rounded focus:outline-primary"
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
              <div className="relative cursor-pointer" onClick={() => navigate("/notifications")} tabIndex={0} aria-label="Notifications" role="button">
                <FaBell className="text-primary text-xl" />
                {unread > 0 && <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full px-1">{unread}</span>}
              </div>
            )}
            <Link to="/account" aria-label="Account"><FaUser className="text-primary text-xl cursor-pointer" /></Link>
            {userType === 'vendor' && (
              <Link to="/vendor-dashboard" className="nav-link" aria-label="Vendor Dashboard">Vendor Dashboard</Link>
            )}
            {userType === 'admin' && (
              <Link to="/admin-dashboard" className="nav-link" aria-label="Admin Dashboard">Admin Dashboard</Link>
            )}
            <select
              className="bg-gray-100 px-2 py-1 rounded border border-gray-300 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              value={language}
              onChange={e => setLanguage(e.target.value)}
              aria-label="Select language"
            >
              <option value="en">English</option>
              <option value="ur">اردو</option>
            </select>
            {user ? (
              <button
                onClick={handleLogout}
                className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600 transition-colors"
                aria-label="Logout"
              >
                <FaSignOutAlt className="inline mr-1" />
                Logout
              </button>
            ) : (
              <Link
                to="/login"
                className="bg-primary text-white px-3 py-1 rounded hover:bg-primary-dark transition-colors"
              >
                Login
              </Link>
            )}
          </div>
        </div>

        {/* Mobile Hamburger */}
        <button className="md:hidden text-2xl ml-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary" onClick={() => setMenuOpen(m => !m)} aria-label={menuOpen ? "Close menu" : "Open menu"}>
          {menuOpen ? <FaTimes /> : <FaBars />}
        </button>
      </nav>

      {/* Mobile Navigation Menu */}
      {menuOpen && (
        <div className="md:hidden absolute top-full left-0 w-full bg-white shadow-lg z-50 border-t border-gray-200">
          <div className="p-4 space-y-4">
            {/* Mobile Nav Links */}
            <div className="space-y-2">
              {navLinks.map(link => (
                <Link
                  key={link.name}
                  to={link.to}
                  className={`block py-2 px-4 rounded hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${location.pathname === link.to ? "font-semibold bg-gray-100" : ""}`}
                  onClick={() => setMenuOpen(false)}
                >
                  {link.name}
                </Link>
              ))}
            </div>

            {/* Mobile Search */}
            <input
              className="bg-gray-100 px-3 py-2 rounded w-full focus:outline-primary"
              placeholder="What are you looking for?"
              aria-label="Search products"
            />

            {/* Mobile User Actions */}
            <div className="flex items-center justify-between">
              <div className="flex gap-4">
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
              </div>
              
              <select
                className="bg-gray-100 px-2 py-1 rounded border border-gray-300 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                value={language}
                onChange={e => setLanguage(e.target.value)}
                aria-label="Select language"
              >
                <option value="en">English</option>
                <option value="ur">اردو</option>
              </select>
            </div>

            {/* Mobile Vendor/Admin Links */}
            {userType === 'vendor' && (
              <Link to="/vendor-dashboard" className="block py-2 px-4 rounded hover:bg-gray-100" onClick={() => setMenuOpen(false)}>
                Vendor Dashboard
              </Link>
            )}
            {userType === 'admin' && (
              <Link to="/admin-dashboard" className="block py-2 px-4 rounded hover:bg-gray-100" onClick={() => setMenuOpen(false)}>
                Admin Dashboard
              </Link>
            )}

            {/* Mobile Login/Logout */}
            {user ? (
              <button
                onClick={handleLogout}
                className="w-full bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition-colors"
                aria-label="Logout"
              >
                <FaSignOutAlt className="inline mr-2" />
                Logout
              </button>
            ) : (
              <Link
                to="/login"
                className="block w-full bg-primary text-white px-4 py-2 rounded hover:bg-primary-dark transition-colors text-center"
                onClick={() => setMenuOpen(false)}
              >
                Login
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}