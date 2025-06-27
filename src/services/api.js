const baseURL = import.meta.env.VITE_API_URL || 'https://sheworks-production.up.railway.app';
const API_URL = baseURL.endsWith('/api') ? baseURL : baseURL + '/api';

class ApiService {
  constructor() {
    this.baseURL = API_URL;
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

  async testDatabase() {
    return this.request('/messages/test-db');
  }

  async findRecipientByEmail(email) {
    return this.request('/messages/find-recipient', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  // Health check
  async healthCheck() {
    return this.request('/health');
  }

  // Product APIs
  async getProducts() {
    return this.request('/products');
  }

  async getVendorProducts() {
    return this.request('/products/vendor/my');
  }

  async getProduct(id) {
    return this.request(`/products/${id}`);
  }

  async createProduct(productData) {
    return this.request('/products', {
      method: 'POST',
      body: JSON.stringify(productData),
    });
  }

  async updateProduct(id, productData) {
    return this.request(`/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(productData),
    });
  }

  async deleteProduct(id) {
    return this.request(`/products/${id}`, {
      method: 'DELETE',
    });
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

  async getOrders() {
    return this.request('/orders');
  }

  async getOrder(id) {
    return this.request(`/orders/${id}`);
  }

  // Wishlist APIs
  async getWishlist() {
    return this.request('/auth/users/me/wishlist');
  }

  async addToWishlist(productId) {
    return this.request('/auth/users/me/wishlist', {
      method: 'POST',
      body: JSON.stringify({ productId }),
    });
  }

  async removeFromWishlist(productId) {
    return this.request(`/auth/users/me/wishlist/${productId}`, {
      method: 'DELETE',
    });
  }

  // AI Recommendation APIs
  async getRecommendations(userId = null, limit = 8) {
    const params = new URLSearchParams();
    if (userId) params.append('userId', userId);
    if (limit) params.append('limit', limit);
    return this.request(`/products/recommendations?${params}`);
  }

  async getPersonalizedRecommendations(limit = 8) {
    const params = new URLSearchParams();
    if (limit) params.append('limit', limit);
    return this.request(`/products/recommendations/personalized?${params}`);
  }

  async getTrendingProducts(limit = 8) {
    const params = new URLSearchParams();
    if (limit) params.append('limit', limit);
    return this.request(`/products/trending?${params}`);
  }

  async getSimilarProducts(productId, limit = 4) {
    const params = new URLSearchParams();
    if (limit) params.append('limit', limit);
    return this.request(`/products/${productId}/similar?${params}`);
  }

  async googleSignup(googleData) {
    return this.request('/auth/google', {
      method: 'POST',
      body: JSON.stringify(googleData),
    });
  }

  // Translation methods
  async translateText(text, fromLang, toLang, context = 'general') {
    return this.request("/messages/translate", {
      method: "POST",
      body: JSON.stringify({ text, fromLang, toLang, context }),
    });
  }

  async translateBatch(messages, targetLang) {
    return this.request("/messages/translate-batch", {
      method: "POST",
      body: JSON.stringify({ messages, targetLang }),
    });
  }
}

// Create and export a singleton instance
const apiService = new ApiService();
export default apiService; 