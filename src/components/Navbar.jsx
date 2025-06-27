import { Link, useLocation, useNavigate } from "react-router-dom";
import { FaHeart, FaShoppingCart, FaUser, FaComments, FaBell, FaBars, FaTimes, FaSignOutAlt } from "react-icons/fa";
import { useEffect, useState, useRef } from "react";
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
  const menuRef = useRef(null);

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

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, []);

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
        <button 
          className="md:hidden p-2 rounded-lg hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary transition-colors" 
          onClick={() => setMenuOpen(m => !m)} 
          aria-label={menuOpen ? "Close menu" : "Open menu"}
        >
          {menuOpen ? <FaTimes className="text-2xl" /> : <FaBars className="text-2xl" />}
        </button>
      </nav>

      {/* Mobile Navigation Menu */}
      <div className={`md:hidden fixed inset-0 bg-black bg-opacity-50 z-50 transition-opacity duration-300 ${menuOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={() => setMenuOpen(false)}>
        <div className={`absolute top-0 right-0 w-80 h-full bg-white shadow-xl transform transition-transform duration-300 ease-in-out ${menuOpen ? 'translate-x-0' : 'translate-x-full'}`} onClick={(e) => e.stopPropagation()} ref={menuRef}>
          <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-200 pb-4">
              <h2 className="text-xl font-bold text-gray-800">Menu</h2>
              <button 
                onClick={() => setMenuOpen(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
                aria-label="Close menu"
              >
                <FaTimes />
              </button>
            </div>

            {/* User Info */}
            {user && (
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-white font-bold">
                    {user.username?.charAt(0).toUpperCase() || 'U'}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-800">{user.username || 'User'}</p>
                    <p className="text-sm text-gray-600 capitalize">{userType || 'Customer'}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Mobile Search */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Search Products</label>
              <input
                className="bg-gray-100 px-4 py-3 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white transition-colors"
                placeholder="What are you looking for?"
                aria-label="Search products"
              />
            </div>

            {/* Navigation Links */}
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-3">Navigation</h3>
              {navLinks.map(link => (
                <Link
                  key={link.name}
                  to={link.to}
                  className={`flex items-center py-3 px-4 rounded-lg transition-colors ${
                    location.pathname === link.to 
                      ? "bg-primary text-white font-semibold" 
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                  onClick={() => setMenuOpen(false)}
                >
                  {link.name}
                </Link>
              ))}
            </div>

            {/* Quick Actions */}
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-3">Quick Actions</h3>
              <div className="grid grid-cols-2 gap-3">
                <Link 
                  to="/wishlist" 
                  className="flex flex-col items-center py-3 px-4 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
                  onClick={() => setMenuOpen(false)}
                >
                  <div className="relative">
                    <FaHeart className="text-primary text-xl mb-1" />
                    {wishlist.length > 0 && (
                      <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                        {wishlist.length}
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-gray-600">Wishlist</span>
                </Link>
                
                <Link 
                  to="/cart" 
                  className="flex flex-col items-center py-3 px-4 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
                  onClick={() => setMenuOpen(false)}
                >
                  <FaShoppingCart className="text-primary text-xl mb-1" />
                  <span className="text-xs text-gray-600">Cart</span>
                </Link>
                
                <Link 
                  to="/messages" 
                  className="flex flex-col items-center py-3 px-4 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
                  onClick={() => setMenuOpen(false)}
                >
                  <FaComments className="text-primary text-xl mb-1" />
                  <span className="text-xs text-gray-600">Messages</span>
                </Link>
                
                <Link 
                  to="/account" 
                  className="flex flex-col items-center py-3 px-4 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
                  onClick={() => setMenuOpen(false)}
                >
                  <FaUser className="text-primary text-xl mb-1" />
                  <span className="text-xs text-gray-600">Account</span>
                </Link>
              </div>
            </div>

            {/* Notifications */}
            {user && (
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-3">Notifications</h3>
                <button
                  onClick={() => { setMenuOpen(false); navigate("/notifications"); }}
                  className="flex items-center justify-between w-full py-3 px-4 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <FaBell className="text-primary text-xl" />
                      {unread > 0 && (
                        <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                          {unread}
                        </span>
                      )}
                    </div>
                    <span className="text-gray-700">Notifications</span>
                  </div>
                  {unread > 0 && (
                    <span className="bg-red-500 text-white text-xs rounded-full px-2 py-1">
                      {unread} new
                    </span>
                  )}
                </button>
              </div>
            )}

            {/* Dashboard Links */}
            {(userType === 'vendor' || userType === 'admin') && (
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-3">Dashboard</h3>
                {userType === 'vendor' && (
                  <Link 
                    to="/vendor-dashboard" 
                    className="flex items-center py-3 px-4 rounded-lg bg-blue-50 hover:bg-blue-100 transition-colors text-blue-700"
                    onClick={() => setMenuOpen(false)}
                  >
                    <span className="font-medium">Vendor Dashboard</span>
                  </Link>
                )}
                {userType === 'admin' && (
                  <Link 
                    to="/admin-dashboard" 
                    className="flex items-center py-3 px-4 rounded-lg bg-purple-50 hover:bg-purple-100 transition-colors text-purple-700"
                    onClick={() => setMenuOpen(false)}
                  >
                    <span className="font-medium">Admin Dashboard</span>
                  </Link>
                )}
              </div>
            )}

            {/* Language Selector */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Language</label>
              <select
                className="bg-gray-100 px-4 py-3 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white transition-colors"
                value={language}
                onChange={e => setLanguage(e.target.value)}
                aria-label="Select language"
              >
                <option value="en">English</option>
                <option value="ur">اردو</option>
              </select>
            </div>

            {/* Login/Logout */}
            <div className="pt-4 border-t border-gray-200">
              {user ? (
                <button
                  onClick={handleLogout}
                  className="w-full bg-red-500 text-white px-4 py-3 rounded-lg hover:bg-red-600 transition-colors flex items-center justify-center gap-2"
                  aria-label="Logout"
                >
                  <FaSignOutAlt />
                  <span>Logout</span>
                </button>
              ) : (
                <Link
                  to="/login"
                  className="block w-full bg-primary text-white px-4 py-3 rounded-lg hover:bg-primary-dark transition-colors text-center"
                  onClick={() => setMenuOpen(false)}
                >
                  Login
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}