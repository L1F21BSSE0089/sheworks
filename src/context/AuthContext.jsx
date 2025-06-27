import { createContext, useContext, useState, useEffect } from 'react';
import apiService from '../services/api';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userType, setUserType] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Check if user is logged in on app start
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      apiService.setToken(token);
      checkAuthStatus();
    } else {
      setLoading(false);
    }
  }, []);

  const checkAuthStatus = async () => {
    try {
      const response = await apiService.getCurrentUser();
      if (response.user) {
        setUser(response.user);
        setUserType('customer');
      } else if (response.vendor) {
        setUser(response.vendor);
        setUserType('vendor');
      } else if (response.admin) {
        setUser(response.admin);
        setUserType('admin');
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      apiService.removeToken();
    } finally {
      setLoading(false);
    }
  };

  const login = async (credentials, type) => {
    try {
      setError(null);
      let response;
      
      if (type === 'customer') {
        response = await apiService.loginUser(credentials);
        setUser(response.user);
        setUserType('customer');
      } else {
        response = await apiService.loginVendor(credentials);
        setUser(response.vendor);
        setUserType('vendor');
      }
      
      apiService.setToken(response.token);
      return response;
    } catch (error) {
      setError(error.message);
      throw error;
    }
  };

  const register = async (userData, type) => {
    try {
      setError(null);
      let response;
      
      if (type === 'customer') {
        response = await apiService.registerUser(userData);
        setUser(response.user);
        setUserType('customer');
      } else {
        response = await apiService.registerVendor(userData);
        setUser(response.vendor);
        setUserType('vendor');
      }
      
      apiService.setToken(response.token);
      return response;
    } catch (error) {
      setError(error.message);
      throw error;
    }
  };

  const googleSignup = async (googleData) => {
    try {
      setError(null);
      const response = await apiService.googleSignup(googleData);
      
      if (googleData.userType === 'vendor') {
        setUser(response.vendor);
        setUserType('vendor');
      } else {
        setUser(response.user);
        setUserType('customer');
      }
      
      apiService.setToken(response.token);
      return response;
    } catch (error) {
      setError(error.message);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await apiService.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
      setUserType(null);
      apiService.removeToken();
    }
  };

  const updateUser = (updatedUser) => {
    setUser(updatedUser);
  };

  const value = {
    user,
    userType,
    loading,
    error,
    login,
    register,
    googleSignup,
    logout,
    updateUser,
    isAuthenticated: !!user,
    isCustomer: userType === 'customer',
    isVendor: userType === 'vendor',
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 