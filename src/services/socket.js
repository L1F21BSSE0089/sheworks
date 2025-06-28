import io from 'socket.io-client';

class SocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.messageHandlers = new Map();
    this.typingHandlers = new Map();
    this.orderPlacedHandlers = new Map();
  }

  connect(token, userId, userType) {
    if (this.socket) {
      this.disconnect();
    }

    const socketUrl = import.meta.env.VITE_API_URL?.replace('/api', '') || 'https://sheworks-production.up.railway.app';
    
    this.socket = io(socketUrl, {
      auth: {
        token
      }
    });

    this.socket.on('connect', () => {
      console.log('🔌 Connected to server');
      this.isConnected = true;
      
      // Authenticate with the server
      this.socket.emit('authenticate', {
        userId,
        userType
      });
    });

    this.socket.on('disconnect', () => {
      console.log('🔌 Disconnected from server');
      this.isConnected = false;
    });

    this.socket.on('new_message', (message) => {
      console.log('📨 New message received:', message);
      this.messageHandlers.forEach(handler => handler(message));
    });

    this.socket.on('message_sent', (message) => {
      console.log('✅ Message sent:', message);
    });

    this.socket.on('user_typing', (data) => {
      console.log('⌨️ User typing:', data);
      this.typingHandlers.forEach(handler => handler(data));
    });

    this.socket.on('message_error', (error) => {
      console.error('❌ Message error:', error);
    });

    this.socket.on('connect_error', (error) => {
      console.error('❌ Connection error:', error);
    });

    this.socket.on('order_placed', (data) => {
      console.log('🔔 Order placed notification:', data);
      this.orderPlacedHandlers.forEach(handler => handler(data));
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }

  // Send a message
  sendMessage(recipientId, content, language, senderType) {
    if (!this.socket || !this.isConnected) {
      throw new Error('Socket not connected');
    }

    this.socket.emit('send_message', {
      recipientId,
      message: content,
      language,
      senderType
    });
  }

  // Send typing indicator
  sendTyping(recipientId, isTyping, senderType) {
    if (!this.socket || !this.isConnected) {
      return;
    }

    this.socket.emit('typing', {
      recipientId,
      isTyping,
      senderType
    });
  }

  // Add message handler
  onMessage(handler) {
    const id = Date.now().toString();
    this.messageHandlers.set(id, handler);
    return () => this.messageHandlers.delete(id);
  }

  // Add typing handler
  onTyping(handler) {
    const id = Date.now().toString();
    this.typingHandlers.set(id, handler);
    return () => this.typingHandlers.delete(id);
  }

  // Add order placed handler
  onOrderPlaced(handler) {
    const id = Date.now().toString();
    this.orderPlacedHandlers.set(id, handler);
    return () => this.orderPlacedHandlers.delete(id);
  }

  // Get connection status
  getConnectionStatus() {
    return this.isConnected;
  }
}

// Create and export a singleton instance
const socketService = new SocketService();
export default socketService; 