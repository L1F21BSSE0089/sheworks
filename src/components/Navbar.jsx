import { Link, useLocation, useNavigate } from "react-router-dom";
import { FaHeart, FaShoppingCart, FaUser, FaComments, FaBell, FaBars, FaTimes, FaSignOutAlt } from "react-icons/fa";
import { useEffect, useState, useRef } from "react";
import apiService from "../services/api";
import { useAuth } from "../context/AuthContext";
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
  const [menuOpen, setMenuOpen] = useState(false);
  const { wishlist } = useWishlist();
  const menuRef = useRef(null);
  const [touchStart, setTouchStart] = useState(null);

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

  // Prevent background scrolling when mobile menu is open
  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [menuOpen]);

  // Handle touch gestures for mobile menu
  const handleTouchStart = (e) => {
    setTouchStart(e.touches[0].clientX);
  };

  const handleTouchMove = (e) => {
    if (!touchStart) return;
    
    const currentTouch = e.touches[0].clientX;
    const diff = touchStart - currentTouch;
    
    // If swiping left (closing gesture) and we're at the right edge
    if (diff > 50 && currentTouch < 100) {
      setMenuOpen(false);
      setTouchStart(null);
    }
  };

  const handleTouchEnd = () => {
    setTouchStart(null);
  };

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
        <div className={`absolute top-0 right-0 w-80 sm:w-96 h-full bg-white shadow-xl transform transition-transform duration-300 ease-in-out ${menuOpen ? 'translate-x-0' : 'translate-x-full'}`} 
          onClick={(e) => e.stopPropagation()} 
          ref={menuRef}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <div className="p-6">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-xl font-bold">Menu</h2>
              <button 
                onClick={() => setMenuOpen(false)}
                className="p-2 rounded-lg hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary transition-colors"
                aria-label="Close menu"
              >
                <FaTimes className="text-xl" />
              </button>
            </div>

            {/* Mobile Nav Links */}
            <nav className="mb-8">
              <ul className="space-y-4">
                {navLinks.map(link => (
                  <li key={link.name}>
                    <Link
                      to={link.to}
                      onClick={() => setMenuOpen(false)}
                      className={`block py-2 px-4 rounded-lg hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary transition-colors ${location.pathname === link.to ? "bg-primary text-white" : ""}`}
                    >
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>

            {/* Mobile User Actions */}
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <Link to="/wishlist" onClick={() => setMenuOpen(false)} className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors">
                  <FaHeart className="text-primary text-xl" />
                  {wishlist.length > 0 && <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full px-1">{wishlist.length}</span>}
                </Link>
                <Link to="/cart" onClick={() => setMenuOpen(false)} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
                  <FaShoppingCart className="text-primary text-xl" />
                </Link>
                <Link to="/messages" onClick={() => setMenuOpen(false)} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
                  <FaComments className="text-primary text-xl" />
                </Link>
                {user && (
                  <button 
                    onClick={() => { navigate("/notifications"); setMenuOpen(false); }}
                    className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <FaBell className="text-primary text-xl" />
                    {unread > 0 && <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full px-1">{unread}</span>}
                  </button>
                )}
                <Link to="/account" onClick={() => setMenuOpen(false)} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
                  <FaUser className="text-primary text-xl" />
                </Link>
              </div>

              {userType === 'vendor' && (
                <Link 
                  to="/vendor-dashboard" 
                  onClick={() => setMenuOpen(false)}
                  className="block w-full text-center bg-primary text-white py-2 px-4 rounded-lg hover:bg-primary-dark transition-colors"
                >
                  Vendor Dashboard
                </Link>
              )}
              
              {userType === 'admin' && (
                <Link 
                  to="/admin-dashboard" 
                  onClick={() => setMenuOpen(false)}
                  className="block w-full text-center bg-primary text-white py-2 px-4 rounded-lg hover:bg-primary-dark transition-colors"
                >
                  Admin Dashboard
                </Link>
              )}

              {user ? (
                <button
                  onClick={() => { handleLogout(); setMenuOpen(false); }}
                  className="w-full bg-red-500 text-white py-2 px-4 rounded-lg hover:bg-red-600 transition-colors flex items-center justify-center gap-2"
                >
                  <FaSignOutAlt />
                  Logout
                </button>
              ) : (
                <Link
                  to="/login"
                  onClick={() => setMenuOpen(false)}
                  className="block w-full text-center bg-primary text-white py-2 px-4 rounded-lg hover:bg-primary-dark transition-colors"
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