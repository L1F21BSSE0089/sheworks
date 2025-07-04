import { useState, useRef, useEffect } from "react";
import { FaPaperPlane, FaGlobe, FaEllipsisV, FaChevronDown, FaSpinner } from "react-icons/fa";
import apiService from "../services/api";
import socketService from "../services/socket";
import { useAuth } from "../context/AuthContext";
import deeplTranslationService from "../services/deeplTranslation";

// Simple languages object for fallback
const LANGUAGES = {
  en: { name: "English", nativeName: "English", flag: "🇺🇸" },
  ur: { name: "Urdu", nativeName: "اردو", flag: "🇵🇰" },
  ar: { name: "Arabic", nativeName: "العربية", flag: "🇸🇦" },
  es: { name: "Spanish", nativeName: "Español", flag: "🇪🇸" },
  fr: { name: "French", nativeName: "Français", flag: "🇫🇷" },
  de: { name: "German", nativeName: "Deutsch", flag: "🇩🇪" },
  it: { name: "Italian", nativeName: "Italiano", flag: "🇮🇹" },
  pt: { name: "Portuguese", nativeName: "Português", flag: "🇵🇹" },
  ru: { name: "Russian", nativeName: "Русский", flag: "🇷🇺" },
  zh: { name: "Chinese", nativeName: "中文", flag: "🇨🇳" },
  ja: { name: "Japanese", nativeName: "日本語", flag: "🇯🇵" },
  ko: { name: "Korean", nativeName: "한국어", flag: "🇰🇷" },
  hi: { name: "Hindi", nativeName: "हिन्दी", flag: "🇮🇳" },
  bn: { name: "Bengali", nativeName: "বাংলা", flag: "🇧🇩" },
  tr: { name: "Turkish", nativeName: "Türkçe", flag: "🇹🇷" },
  nl: { name: "Dutch", nativeName: "Nederlands", flag: "🇳🇱" }
};

export default function Messages() {
  const { user, userType } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [selectedLanguage, setSelectedLanguage] = useState("en");
  const [showLanguageSelector, setShowLanguageSelector] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const [translatedMessages, setTranslatedMessages] = useState({});
  const [translationLoading, setTranslationLoading] = useState(false);
  const [socketConnected, setSocketConnected] = useState(false);
  const messagesEndRef = useRef(null);
  const [showNewMessageModal, setShowNewMessageModal] = useState(false);
  const [newRecipientEmail, setNewRecipientEmail] = useState("");
  const [newMessageError, setNewMessageError] = useState(null);
  const [typingUsers, setTypingUsers] = useState(new Set());
  const [allUsers, setAllUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showChatOptions, setShowChatOptions] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingChat, setDeletingChat] = useState(false);

  // Connect to socket on mount
  useEffect(() => {
    if (user && user._id && userType) {
      socketService.connect(localStorage.getItem("token"), user._id, userType);
      
      // Check connection status
      const checkConnection = setInterval(() => {
        const isConnected = socketService.getConnectionStatus();
        setSocketConnected(isConnected);
        if (isConnected) {
          clearInterval(checkConnection);
        }
      }, 1000);
      
      return () => {
        clearInterval(checkConnection);
        socketService.disconnect();
      };
    }
  }, [user, userType]);

  // Fetch conversations on mount
  useEffect(() => {
    if (!user) return;
    setLoading(true);
    apiService.getConversations()
      .then(res => {
        setConversations(res.conversations || []);
        if (res.conversations && res.conversations.length > 0) {
          setSelectedConversation(res.conversations[0]);
        }
      })
      .catch(err => {
        console.error('❌ Error loading conversations:', err);
        setError(err.message);
      })
      .finally(() => setLoading(false));
  }, [user]);

  // Load all users and vendors for search
  useEffect(() => {
    const loadAllUsers = async () => {
      try {
        setSearchLoading(true);
        
        // Test API health first
        try {
          await apiService.healthCheck();
        } catch (healthError) {
          console.error('❌ API Health Check Failed:', healthError);
        }
        
        // Test database status
        try {
          await apiService.testDatabase();
        } catch (dbError) {
          console.error('❌ Database Test Failed:', dbError);
        }
        
        const [customersRes, vendorsRes] = await Promise.all([
          apiService.getCustomers().catch(err => {
            console.error('❌ Customers API Error:', err);
            return { customers: [] };
          }),
          apiService.getVendors().catch(err => {
            console.error('❌ Vendors API Error:', err);
            return { vendors: [] };
          })
        ]);
        
        const customers = (customersRes.users || customersRes.customers || customersRes || []).map(user => ({
          id: user._id,
          name: `${user.firstName} ${user.lastName}`.trim(),
          email: user.email,
          type: 'customer',
          displayName: `${user.firstName} ${user.lastName}`.trim()
        }));
        
        const vendors = (vendorsRes.vendors || vendorsRes || []).map(vendor => ({
          id: vendor._id,
          name: vendor.businessName || `${vendor.contactPerson?.firstName} ${vendor.contactPerson?.lastName}`.trim(),
          email: vendor.email,
          type: 'vendor',
          displayName: vendor.businessName || `${vendor.contactPerson?.firstName} ${vendor.contactPerson?.lastName}`.trim()
        }));
        
        const allUsersArray = [...customers, ...vendors];
        setAllUsers(allUsersArray);
        
      } catch (err) {
        console.error('❌ Error loading users:', err);
      } finally {
        setSearchLoading(false);
      }
    };
    
    loadAllUsers();
  }, [user]);

  // Handle clicking outside dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showUserDropdown && !event.target.closest('.user-dropdown-container')) {
        setShowUserDropdown(false);
      }
      if (showChatOptions && !event.target.closest('.chat-options-container')) {
        setShowChatOptions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showUserDropdown, showChatOptions]);

  // Load messages for selected conversation
  useEffect(() => {
    if (!selectedConversation || !user) return;
    
    setLoading(true);
    setError(null);
    // Clear messages and translated messages when switching conversations
    setMessages([]);
    setTranslatedMessages({});
    // Clear typing indicators when switching conversations
    setTypingUsers(new Set());
    
    const recipient = selectedConversation.participants.find(p => p.id !== user._id);
    if (!recipient) {
      setError("Recipient not found");
      setLoading(false);
      return;
    }
    
    apiService.getConversation(recipient.id)
      .then(res => {
        setMessages(res.messages || []);
        // Translate all messages when conversation loads
        if (res.messages && res.messages.length > 0) {
          translateAllMessages(res.messages, selectedLanguage);
        }
      })
      .catch(err => {
        console.error('❌ Error loading messages:', err);
        setError(err.message);
      })
      .finally(() => setLoading(false));
  }, [selectedConversation, user]);

  // Real-time message receiving
  useEffect(() => {
    const unsubscribe = socketService.onMessage((message) => {
      // Check if message belongs to current conversation
      if (selectedConversation && selectedConversation.participants) {
        const currentParticipantIds = selectedConversation.participants.map(p => p.id);
        const messageParticipantIds = [message.sender?.id, message.recipient?.id];
        
        // Check if both sender and recipient are in the current conversation
        const belongsToCurrentConversation = currentParticipantIds.includes(message.sender?.id) && 
                                           currentParticipantIds.includes(message.recipient?.id);
        
        // Additional check: if message has conversationId, verify it matches
        const conversationIdMatches = !message.conversationId || 
                                    message.conversationId === selectedConversation.conversationId;
        
        // Additional check: verify the message involves the current user
        const involvesCurrentUser = message.sender?.id === user._id || message.recipient?.id === user._id;
        
        if (belongsToCurrentConversation && conversationIdMatches && involvesCurrentUser) {
          setMessages((prev) => {
            // Check if message already exists
            const exists = prev.some(m => m._id === message._id);
            if (exists) {
              return prev;
            }
            
            const newMessages = [...prev, message];
            // Translate the new message
            translateMessage(message, selectedLanguage);
            return newMessages;
          });
        }
      }
    });
    return unsubscribe;
  }, [selectedConversation, user, selectedLanguage]);

  // Handle typing indicators
  useEffect(() => {
    const unsubscribe = socketService.onTyping((data) => {
      if (selectedConversation) {
        const recipient = selectedConversation.participants.find(p => p.id !== user._id);
        if (recipient && data.userId === recipient.id) {
          setTypingUsers(prev => {
            const newSet = new Set(prev);
            if (data.isTyping) {
              newSet.add(data.userId);
            } else {
              newSet.delete(data.userId);
            }
            return newSet;
          });
        }
      }
    });
    return unsubscribe;
  }, [selectedConversation, user]);

  // Translate all messages when language changes
  useEffect(() => {
    if (messages.length > 0 && selectedLanguage) {
      translateAllMessages(messages, selectedLanguage);
    }
  }, [selectedLanguage, messages.length]);

  // Translate all messages using DeepL
  const translateAllMessages = async (messagesToTranslate, targetLang) => {
    if (messagesToTranslate.length === 0 || !targetLang) return;
    
    setTranslationLoading(true);
    try {
      const translated = await deeplTranslationService.translateMessages(messagesToTranslate, targetLang);
      setTranslatedMessages(translated);
    } catch (error) {
      console.error('❌ Translation error:', error);
    } finally {
      setTranslationLoading(false);
    }
  };

  // Translate a single message
  const translateMessage = async (message, targetLang) => {
    const messageId = message._id || message.id;
    const originalText = message.content?.text || message.text || '';
    const originalLang = message.content?.language || message.language || 'en';
    
    if (originalLang !== targetLang && originalText) {
      try {
        const translatedText = await deeplTranslationService.translateText(originalText, originalLang, targetLang);
        setTranslatedMessages(prev => ({
          ...prev,
          [messageId]: translatedText
        }));
      } catch (error) {
        console.error('❌ Single message translation error:', error);
      }
    }
  };

  // Scroll to bottom on new messages
  useEffect(() => {
    // Only scroll to bottom when new messages are added, not when switching conversations
    if (messages.length > 0 && !loading) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages.length, loading]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation) return;
    
    setSending(true);
    setError(null);
    const recipient = selectedConversation.participants.find(p => p.id !== user._id);
    
    if (!recipient) {
      setError("Recipient not found");
      setSending(false);
      return;
    }
    
    const messageText = newMessage.trim();
    const messageData = {
      recipientId: recipient.id,
      content: messageText,
      language: selectedLanguage
    };
    
    try {
      // Send via API for persistence
      const apiResponse = await apiService.sendMessage(messageData);
      
      // Send via socket for real-time delivery
      if (socketService && socketService.getConnectionStatus()) {
        socketService.sendMessage(recipient.id, messageText, selectedLanguage, userType);
      } else {
        console.warn('⚠️ Socket not connected, message sent via API only');
      }
      
      // Add message to local state immediately for better UX
      const newMessageObj = {
        _id: apiResponse.message?._id || `temp_${Date.now()}`,
        sender: { id: user._id, type: userType, name: user.firstName || user.businessName },
        recipient: { id: recipient.id, type: recipient.type, name: recipient.name },
        content: { text: messageText, language: selectedLanguage },
        createdAt: new Date().toISOString(),
      };
      
      setMessages((prev) => [...prev, newMessageObj]);
      setNewMessage("");
      
      // Clear typing indicator
      socketService.sendTyping(recipient.id, false, userType);
      
    } catch (err) {
      console.error('❌ Error sending message:', err);
      setError(`Failed to send message: ${err.message}`);
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleTyping = (e) => {
    setNewMessage(e.target.value);
    
    // Send typing indicator
    if (selectedConversation && socketService.getConnectionStatus()) {
      const recipient = selectedConversation.participants.find(p => p.id !== user._id);
      if (recipient) {
        socketService.sendTyping(recipient.id, e.target.value.length > 0, userType);
      }
    }
  };

  const handleLanguageChange = async (newLanguage) => {
    if (newLanguage === selectedLanguage) return;
    
    // Translate the current message if it exists
    if (newMessage.trim()) {
      try {
        const translated = await deeplTranslationService.translateText(newMessage, selectedLanguage, newLanguage);
        setNewMessage(translated);
      } catch (error) {
        // Keep original message if translation fails
      }
    }
    
    // Update the selected language
    setSelectedLanguage(newLanguage);
    setShowLanguageSelector(false);
    
    // Clear existing translations and retranslate all messages
    setTranslatedMessages({});
    
    // Translate all existing messages in the conversation
    if (messages.length > 0) {
      translateAllMessages(messages, newLanguage);
    }
  };

  const getLanguageName = (code) => {
    return LANGUAGES[code]?.name || code;
  };

  const getLanguageFlag = (code) => {
    return LANGUAGES[code]?.flag || "🌐";
  };

  const getDisplayMessage = (message) => {
    const messageId = message._id || message.id;
    const originalText = message.content?.text || message.text || '';
    const originalLang = message.content?.language || message.language || 'en';
    
    // If we have a translated version, show it
    if (translatedMessages[messageId]) {
      return translatedMessages[messageId];
    }
    
    // If message is already in selected language, show original
    if (originalLang === selectedLanguage) {
      return originalText;
    }
    
    // Otherwise show original (will be translated later)
    return originalText;
  };

  // Helper function to check if message is from current user
  const isOwnMessage = (message) => {
    // Handle both string IDs and populated objects
    const senderId = typeof message.sender?.id === 'object' 
      ? message.sender.id._id || message.sender.id.id 
      : message.sender?.id;
    const userId = user._id;
    const isOwn = senderId === userId;
    
    return isOwn;
  };

  // Handler for starting a new conversation
  const handleStartNewConversation = async () => {
    setNewMessageError(null);
    if (!newRecipientEmail.trim()) {
      setNewMessageError("Please select a recipient");
      return;
    }
    
    try {
      // Find the selected user from allUsers array
      const selectedUser = allUsers.find(user => user.email === newRecipientEmail);
      
      if (!selectedUser) {
        setNewMessageError("Selected user not found");
        return;
      }
      
      // Prepare message data
      const messageData = {
        recipientId: selectedUser.id,
        content: "Hi! I'd like to start a conversation.",
        language: selectedLanguage,
      };
      
      // Send a first message to start the conversation
      await apiService.sendMessage(messageData);
      
      setShowNewMessageModal(false);
      setNewRecipientEmail("");
      setSearchQuery("");
      setShowUserDropdown(false);
      
      // Refresh conversations to show the new one
      const conversationsRes = await apiService.getConversations();
      setConversations(conversationsRes.conversations || []);
      
      // Select the new conversation if it exists
      if (conversationsRes.conversations && conversationsRes.conversations.length > 0) {
        setSelectedConversation(conversationsRes.conversations[0]);
      }
      
    } catch (err) {
      console.error('❌ Error starting conversation:', err);
      setNewMessageError(err.message || "Failed to start conversation. Please try again.");
    }
  };

  // Handler for deleting a conversation
  const handleDeleteConversation = async () => {
    if (!selectedConversation) return;
    
    setDeletingChat(true);
    try {
      const recipient = selectedConversation.participants.find(p => p.id !== user._id);
      if (!recipient) {
        throw new Error("Recipient not found");
      }
      
      // Delete all messages in this conversation
      await apiService.deleteConversation(recipient.id);
      
      // Remove conversation from local state
      setConversations(prev => prev.filter(conv => conv.conversationId !== selectedConversation.conversationId));
      
      // Clear current conversation
      setSelectedConversation(null);
      setMessages([]);
      setTranslatedMessages({});
      setShowDeleteConfirm(false);
      setShowChatOptions(false);
      
    } catch (err) {
      console.error('❌ Error deleting conversation:', err);
      setError(err.message || "Failed to delete conversation. Please try again.");
    } finally {
      setDeletingChat(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto p-2 md:p-4">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="flex flex-col md:flex-row h-[80vh] md:h-[600px]">
            {/* Sidebar - Conversation List */}
            <div className="w-full md:w-1/3 border-r border-gray-200 bg-gray-50 max-h-60 md:max-h-full overflow-y-auto">
              <div className="p-4 border-b border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-xl font-semibold text-gray-800">Messages</h2>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setShowLanguageSelector(!showLanguageSelector)}
                      className="flex items-center space-x-2 px-3 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <FaGlobe className="text-gray-600" />
                      <span className="text-sm text-gray-700">{getLanguageFlag(selectedLanguage)} {getLanguageName(selectedLanguage)}</span>
                      <FaChevronDown className="text-gray-500 text-xs" />
                    </button>
                    <button
                      onClick={() => setShowNewMessageModal(true)}
                      className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                    >
                      New Message
                    </button>
                  </div>
                </div>
                <p className="text-sm text-gray-600">Chat with our vendors</p>
                <div className="flex items-center space-x-2 mt-1">
                  <div className={`w-2 h-2 rounded-full ${socketService.getConnectionStatus() ? 'bg-green-500' : 'bg-red-500'}`}></div>
                  <span className="text-xs text-gray-500">
                    {socketService.getConnectionStatus() ? 'Connected' : 'Disconnected'}
                  </span>
                </div>
              </div>
              <div className="overflow-y-auto h-48 md:h-full">
                {loading ? (
                  <div className="p-4 text-center text-gray-400">Loading...</div>
                ) : conversations.length === 0 ? (
                  <div className="p-4 text-center text-gray-400">No conversations yet.</div>
                ) : conversations.map((conv) => {
                  const other = conv.participants.find(p => p.id !== user._id);
                  return (
                    <div
                      key={conv.conversationId}
                      onClick={() => setSelectedConversation(conv)}
                      className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-100 transition-colors ${
                        selectedConversation?.conversationId === conv.conversationId ? "bg-blue-50 border-l-4 border-l-blue-500" : ""
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full flex items-center justify-center text-white text-xl">
                          {other?.name?.charAt(0) || "?"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-gray-900 truncate">{other?.name}</h3>
                          <p className="text-sm text-gray-600 truncate">{conv.lastMessage?.content?.text || "No messages yet."}</p>
                          <p className="text-xs text-gray-400">{conv.lastMessage?.createdAt ? new Date(conv.lastMessage.createdAt).toLocaleString() : ""}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Chat Area */}
            <div className="flex-1 flex flex-col max-h-[60vh] md:max-h-full">
              {/* Chat Header */}
              <div className="p-4 border-b border-gray-200 bg-white">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full flex items-center justify-center text-white text-lg">
                      {selectedConversation && selectedConversation.participants.find(p => p.id !== user._id)?.name?.charAt(0)}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{selectedConversation && selectedConversation.participants.find(p => p.id !== user._id)?.name}</h3>
                      {typingUsers.size > 0 && (
                        <p className="text-xs text-gray-500 italic">typing...</p>
                      )}
                      <div className="text-xs text-gray-400">
                        Lang: {selectedLanguage} | Translations: {Object.keys(translatedMessages).length}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 relative chat-options-container">
                    <button 
                      className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                      onClick={() => setShowChatOptions(!showChatOptions)}
                    >
                      <FaEllipsisV className="text-gray-600" />
                    </button>
                    
                    {/* Chat Options Dropdown */}
                    {showChatOptions && (
                      <div className="absolute right-0 top-10 bg-white border border-gray-200 rounded-lg shadow-lg z-10 min-w-[150px]">
                        <button
                          onClick={() => {
                            setShowDeleteConfirm(true);
                            setShowChatOptions(false);
                          }}
                          className="w-full px-4 py-2 text-left text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          Delete Chat
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {loading ? (
                  <div className="text-center text-gray-400">Loading messages...</div>
                ) : messages.length === 0 ? (
                  <div className="text-center text-gray-400">No messages yet.</div>
                ) : (
                  <>
                    {translationLoading && (
                      <div className="text-center text-gray-400 flex items-center justify-center space-x-2">
                        <FaSpinner className="animate-spin" />
                        <span>Translating messages...</span>
                      </div>
                    )}
                    {messages.map((message, idx) => {
                      const ownMessage = isOwnMessage(message);
                      return (
                        <div
                          key={message._id || idx}
                          className={`flex ${ownMessage ? "justify-end" : "justify-start"}`}
                        >
                          <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                            ownMessage
                              ? "bg-blue-500 text-white"
                              : "bg-gray-200 text-gray-800"
                          }`}>
                            <div className="flex items-center space-x-2 mb-1">
                              <span className="text-xs opacity-75">{getLanguageFlag(message.content.language)}</span>
                              <span className="text-xs opacity-75">{getLanguageName(message.content.language)}</span>
                            </div>
                            <p className="text-sm">{getDisplayMessage(message)}</p>
                            <p className={`text-xs mt-1 ${
                              ownMessage ? "text-blue-100" : "text-gray-500"
                            }`}>
                              {message.createdAt ? new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ""}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input */}
              <div className="p-4 border-t border-gray-200 bg-white">
                <div className="flex items-center space-x-3">
                  <div className="flex-1 relative">
                    <textarea
                      value={newMessage}
                      onChange={handleTyping}
                      onKeyPress={handleKeyPress}
                      placeholder={`Type your message in ${getLanguageName(selectedLanguage)}...`}
                      className="w-full px-4 py-2 pr-20 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                      rows="1"
                      disabled={!selectedConversation || sending}
                    />
                    <div className="absolute right-2 top-2">
                      <button
                        onClick={() => setShowLanguageSelector(!showLanguageSelector)}
                        className="flex items-center space-x-1 text-xs bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded transition-colors"
                        title="Select DeepL translation language"
                      >
                        <span>{getLanguageFlag(selectedLanguage)}</span>
                        <span>{getLanguageName(selectedLanguage)}</span>
                        <FaChevronDown className="text-xs" />
                      </button>
                    </div>
                  </div>
                  <button
                    onClick={handleSendMessage}
                    disabled={!newMessage.trim() || !selectedConversation || sending}
                    className="p-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                  >
                    {sending ? <FaSpinner className="animate-spin" /> : <FaPaperPlane />}
                  </button>
                </div>
                
                {/* Language Selector Dropdown */}
                {showLanguageSelector && (
                  <div className="mt-2 p-3 border border-gray-200 rounded-lg bg-gray-50">
                    <div className="mb-2 text-xs text-gray-600">
                      Select language for translation:
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-40 overflow-y-auto">
                      {Object.entries(LANGUAGES).map(([code, lang]) => (
                        <button
                          key={code}
                          onClick={() => handleLanguageChange(code)}
                          className={`p-2 rounded-lg text-sm flex items-center space-x-2 transition-colors ${
                            selectedLanguage === code
                              ? "bg-blue-500 text-white"
                              : "bg-white hover:bg-gray-100 text-gray-700"
                          }`}
                        >
                          <span>{lang.flag}</span>
                          <span>{lang.nativeName}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                
                {error && <div className="text-red-500 text-sm text-center mt-2">{error}</div>}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* New Message Modal */}
      {showNewMessageModal && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md relative">
            <button
              className="absolute top-2 right-2 text-gray-500 hover:text-gray-700 text-xl font-bold"
              onClick={() => {
                setShowNewMessageModal(false);
                setNewRecipientEmail("");
                setNewMessageError(null);
                setSearchQuery("");
                setShowUserDropdown(false);
              }}
              aria-label="Close"
            >
              &times;
            </button>
            <h3 className="text-lg font-semibold mb-4 text-gray-800">Start New Conversation</h3>
            <p className="text-sm text-gray-600 mb-4">
              Search for a person or shop to start chatting with.
            </p>
            <div className="space-y-3">
              <div className="relative user-dropdown-container">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Search Recipient
                </label>
                <div className="relative">
                  <input
                    type="text"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Search by name or shop name..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setShowUserDropdown(true);
                      setNewRecipientEmail("");
                    }}
                    onFocus={() => setShowUserDropdown(true)}
                  />
                  {searchLoading && (
                    <div className="absolute right-3 top-2">
                      <FaSpinner className="animate-spin text-gray-400" />
                    </div>
                  )}
                </div>
                
                {/* User Dropdown */}
                {showUserDropdown && searchQuery && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {(() => {
                      const filteredUsers = allUsers.filter(user => 
                        user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        user.email.toLowerCase().includes(searchQuery.toLowerCase())
                      );
                      
                      return filteredUsers
                        .slice(0, 10) // Limit to 10 results
                        .map((user) => (
                          <button
                            key={user.id}
                            className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0 flex items-center space-x-3"
                            onClick={() => {
                              setNewRecipientEmail(user.email);
                              setSearchQuery(user.name);
                              setShowUserDropdown(false);
                            }}
                          >
                            <div className="w-8 h-8 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full flex items-center justify-center text-white text-sm">
                              {user.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1">
                              <div className="font-medium text-gray-900">{user.name}</div>
                              <div className="text-sm text-gray-500">{user.email}</div>
                              <div className="text-xs text-gray-400 capitalize">{user.type}</div>
                            </div>
                          </button>
                        ));
                    })()}
                    {allUsers.filter(user => 
                      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      user.email.toLowerCase().includes(searchQuery.toLowerCase())
                    ).length === 0 && (
                      <div className="px-4 py-3 text-gray-500 text-sm">
                        No users found matching "{searchQuery}"
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              {newRecipientEmail && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <div className="text-sm text-blue-800">
                    <strong>Selected:</strong> {searchQuery}
                  </div>
                  <div className="text-xs text-blue-600">{newRecipientEmail}</div>
                </div>
              )}
              
              {newMessageError && (
                <div className="text-red-500 text-sm bg-red-50 p-2 rounded-lg border border-red-200">
                  {newMessageError}
                </div>
              )}
              
              <div className="flex space-x-2 pt-2">
                <button
                  className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-400 transition-colors"
                  onClick={() => {
                    setShowNewMessageModal(false);
                    setNewRecipientEmail("");
                    setNewMessageError(null);
                    setSearchQuery("");
                    setShowUserDropdown(false);
                  }}
                >
                  Cancel
                </button>
                <button
                  className="flex-1 bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                  onClick={handleStartNewConversation}
                  disabled={!newRecipientEmail.trim()}
                >
                  Start Chat
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4 text-gray-800">Delete Conversation</h3>
            <p className="text-sm text-gray-600 mb-6">
              Are you sure you want to delete this conversation? This action cannot be undone and all messages will be permanently removed.
            </p>
            <div className="flex space-x-3">
              <button
                className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-400 transition-colors"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deletingChat}
              >
                Cancel
              </button>
              <button
                className="flex-1 bg-red-500 text-white py-2 px-4 rounded-lg hover:bg-red-600 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                onClick={handleDeleteConversation}
                disabled={deletingChat}
              >
                {deletingChat ? (
                  <div className="flex items-center justify-center space-x-2">
                    <FaSpinner className="animate-spin" />
                    <span>Deleting...</span>
                  </div>
                ) : (
                  'Delete'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
