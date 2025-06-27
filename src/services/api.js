const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

class ApiService {
  constructor() {
    this.baseURL = API_BASE_URL;
    this.token = localStorage.getItem('token');
  }

  // Set auth token
  setToken(token) {
    this.token = token;
    localStorage.setItem('token', token);
  }

  // Remove auth token
  removeToken() {
    this.token = null;
    localStorage.removeItem('token');
  }

  // Get auth headers
  getHeaders() {
    const headers = {
      'Content-Type': 'application/json',
    };
    
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    
    return headers;
  }

  // Generic request method
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      headers: this.getHeaders(),
      ...options,
    };

    console.log('=== API REQUEST ===');
    console.log('URL:', url);
    console.log('Method:', options.method || 'GET');
    console.log('Headers:', config.headers);
    if (options.body) {
      try {
        const parsedBody = JSON.parse(options.body);
        console.log('Body (parsed):', parsedBody);
      } catch (e) {
        console.log('Body (raw):', options.body);
      }
    } else {
      console.log('Body:', 'No body');
    }

    try {
      const response = await fetch(url, config);
      
      console.log('=== API RESPONSE ===');
      console.log('Status:', response.status);
      console.log('Status Text:', response.statusText);
      console.log('Headers:', Object.fromEntries(response.headers.entries()));
      
      // Check if response is JSON
      const contentType = response.headers.get('content-type');
      console.log('Content-Type:', contentType);
      
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('Non-JSON response received:', text.substring(0, 200));
        throw new Error(`Expected JSON but received ${contentType || 'unknown content type'}`);
      }
      
      const data = await response.json();
      console.log('Response data:', data);

      if (!response.ok) {
        console.error('Response not OK:', data);
        
        // Handle validation errors specifically
        if (data.errors && Array.isArray(data.errors)) {
          const errorMessages = data.errors.map(err => err.msg || err.message).join(', ');
          throw new Error(errorMessages);
        }
        
        // Handle other error types
        if (data.error) {
          throw new Error(data.error);
        }
        
        throw new Error('Something went wrong');
      }

      console.log('=== API REQUEST SUCCESS ===');
      return data;
    } catch (error) {
      console.error('=== API REQUEST ERROR ===');
      console.error('Error:', error);
      console.error('Error message:', error.message);
      throw error;
    }
  }

  // Authentication APIs
  async registerUser(userData) {
    return this.request('/auth/register/user', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async registerVendor(vendorData) {
    return this.request('/auth/register/vendor', {
      method: 'POST',
      body: JSON.stringify(vendorData),
    });
  }

  async loginUser(credentials) {
    return this.request('/auth/login/user', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  }

  async loginVendor(credentials) {
    return this.request('/auth/login/vendor', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  }

  async getCurrentUser() {
    return this.request('/auth/me');
  }

  async logout() {
    const result = await this.request('/auth/logout', {
      method: 'POST',
    });
    this.removeToken();
    return result;
  }

  // Messaging APIs
  async getConversations() {
    return this.request('/messages/conversations');
  }

  async getConversation(participantId, limit = 50, skip = 0) {
    return this.request(`/messages/conversation/${participantId}?limit=${limit}&skip=${skip}`);
  }

  async sendMessage(messageData) {
    return this.request('/messages/send', {
      method: 'POST',
      body: JSON.stringify(messageData),
    });
  }

  async markMessagesAsRead(conversationId) {
    return this.request(`/messages/read/${conversationId}`, {
      method: 'PUT',
    });
  }

  async getUnreadCount() {
    return this.request('/messages/unread-count');
  }

  async getVendors() {
    return this.request('/messages/vendors');
  }

  async getCustomers() {
    return this.request('/messages/customers');
  }

  // Health check
  async healthCheck() {
    return this.request('/health');
  }

  // Product APIs
  async getProducts() {
    return this.request('/products');
  }

  async getProduct(id) {
    return this.request(`/products/${id}`);
  }

  // Order APIs
  async placeOrder(orderData) {
    return this.request('/orders', {
      method: 'POST',
      body: JSON.stringify(orderData),
    });
  }

  async getMyOrders() {
    return this.request('/orders/my');
  }

  async getVendorOrders() {
    return this.request('/orders/vendor');
  }

  async getOrder(id) {
    return this.request(`/orders/${id}`);
  }

  // Wishlist APIs
  async getWishlist() {
    return this.request('/auth/users/me/wishlist');
  }

  async addToWishlist(productId) {
    return this.request(`/auth/users/me/wishlist/${productId}`, {
      method: 'POST',
    });
  }

  async removeFromWishlist(productId) {
    return this.request(`/auth/users/me/wishlist/${productId}`, {
      method: 'DELETE',
    });
  }

  async googleSignup(googleData) {
    return this.request('/auth/google', {
      method: 'POST',
      body: JSON.stringify(googleData),
    });
  }
}

// Create and export a singleton instance
const apiService = new ApiService();
export default apiService; 