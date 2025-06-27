import { useState, useRef, useEffect } from "react";
import { FaPaperPlane, FaGlobe, FaEllipsisV, FaChevronDown } from "react-icons/fa";
import apiService from "../services/api";
import socketService from "../services/socket";
import { useAuth } from "../context/AuthContext";
import { useLanguage, LANGUAGES } from "../context/LanguageContext";

export default function Messages() {
  const { user, userType } = useAuth();
  const { language: userLanguage, translate, translateMessage, translateBatch, isTranslating } = useLanguage();
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
  const [translationError, setTranslationError] = useState(null);
  const messagesEndRef = useRef(null);
  const [showNewMessageModal, setShowNewMessageModal] = useState(false);
  const [newRecipientEmail, setNewRecipientEmail] = useState("");
  const [newMessageError, setNewMessageError] = useState(null);

  // Connect to socket on mount
  useEffect(() => {
    if (user && user._id && userType) {
      socketService.connect(localStorage.getItem("token"), user._id, userType);
    }
    return () => socketService.disconnect();
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
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [user]);

  // Fetch messages when conversation changes
  useEffect(() => {
    if (!selectedConversation) return;
    setLoading(true);
    apiService.getConversation(selectedConversation.participants.find(p => p.id !== user._id)?.id)
      .then(res => setMessages(res.messages || []))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [selectedConversation, user]);

  // Real-time message receiving
  useEffect(() => {
    const unsubscribe = socketService.onMessage((message) => {
      if (
        selectedConversation &&
        (message.sender.id === user._id || message.recipient.id === user._id)
      ) {
        setMessages((prev) => [...prev, message]);
      }
    });
    return unsubscribe;
  }, [selectedConversation, user]);

  // Translate messages when user language changes
  useEffect(() => {
    const translateAllMessages = async () => {
      if (messages.length === 0) return;
      
      try {
        setTranslationError(null);
        const translatedResults = await translateBatch(messages, userLanguage);
        
        const newTranslatedMessages = {};
        translatedResults.forEach(result => {
          newTranslatedMessages[result.messageId] = result.translatedText;
        });
        
        setTranslatedMessages(newTranslatedMessages);
      } catch (error) {
        console.error('Translation error:', error);
        setTranslationError('Translation failed. Showing original messages.');
      }
    };

    translateAllMessages();
  }, [messages, userLanguage, translateBatch]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation) return;
    
    console.log('Sending message:', {
      message: newMessage,
      recipient: selectedConversation.participants.find(p => p.id !== user._id),
      language: selectedLanguage
    });
    
    setSending(true);
    setError(null);
    const recipient = selectedConversation.participants.find(p => p.id !== user._id);
    
    try {
      // Send via API for persistence
      console.log('Sending via API...');
      const apiResponse = await apiService.sendMessage({
        recipientId: recipient.id,
        content: newMessage,
        language: selectedLanguage
      });
      console.log('API response:', apiResponse);
      
      // Send via socket for real-time
      console.log('Sending via socket...');
      if (socketService && socketService.sendMessage) {
        socketService.sendMessage(recipient.id, newMessage, selectedLanguage, userType);
      } else {
        console.warn('Socket service not available');
      }
      
      // Add message to local state
      const newMessageObj = {
        sender: { id: user._id, type: userType },
        recipient: { id: recipient.id, type: recipient.type },
        content: { text: newMessage, language: selectedLanguage },
        createdAt: new Date().toISOString(),
      };
      
      console.log('Adding message to local state:', newMessageObj);
      setMessages((prev) => [...prev, newMessageObj]);
      setNewMessage("");
      
    } catch (err) {
      console.error('Error sending message:', err);
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

  const handleLanguageChange = async (newLanguage) => {
    if (newLanguage === selectedLanguage) return;
    
    // Translate the current message if it exists
    if (newMessage.trim()) {
      try {
        const translated = await translate(newMessage, selectedLanguage, newLanguage, 'conversation');
        setNewMessage(translated);
      } catch (error) {
        console.error('Translation error:', error);
        // Keep original message if translation fails
      }
    }
    
    setSelectedLanguage(newLanguage);
    setShowLanguageSelector(false);
  };

  const getLanguageName = (code) => {
    return LANGUAGES[code]?.name || code;
  };

  const getLanguageFlag = (code) => {
    return LANGUAGES[code]?.flag || "🌐";
  };

  const getDisplayMessage = (message) => {
    const messageId = message._id || message.id;
    if (message.content.language === userLanguage) {
      return message.content.text;
    }
    return translatedMessages[messageId] || message.content.text;
  };

  // Handler for starting a new conversation
  const handleStartNewConversation = async () => {
    setNewMessageError(null);
    if (!newRecipientEmail.trim()) {
      setNewMessageError("Please enter recipient email");
      return;
    }
    
    try {
      console.log('Finding recipient by email:', newRecipientEmail);
      
      // Find recipient by email
      const res = await apiService.findRecipientByEmail(newRecipientEmail.trim());
      console.log('Recipient found:', res);
      
      if (!res.id || !res.type) {
        setNewMessageError("Recipient not found");
        return;
      }
      
      // Send a first message to start the conversation
      console.log('Sending initial message to:', res.id);
      await apiService.sendMessage({
        recipientId: res.id,
        content: "Hi! I'd like to start a conversation.",
        language: selectedLanguage,
      });
      
      setShowNewMessageModal(false);
      setNewRecipientEmail("");
      
      // Refresh conversations to show the new one
      const conversationsRes = await apiService.getConversations();
      setConversations(conversationsRes.conversations || []);
      
      // Select the new conversation if it exists
      if (conversationsRes.conversations && conversationsRes.conversations.length > 0) {
        setSelectedConversation(conversationsRes.conversations[0]);
      }
      
    } catch (err) {
      console.error('Error starting conversation:', err);
      setNewMessageError(err.message || "Failed to start conversation. Please check the email address.");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto p-2 md:p-4">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="flex flex-col md:flex-row h-[80vh] md:h-[600px]">
            {/* Sidebar - Conversation List */}
            <div className="w-full md:w-1/3 border-r border-gray-200 bg-gray-50 max-h-60 md:max-h-full overflow-y-auto">
              <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-gray-800">Messages</h2>
                  <p className="text-sm text-gray-600">Chat with our vendors</p>
                </div>
                <button
                  className="ml-2 p-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-colors"
                  title="New Message"
                  onClick={() => setShowNewMessageModal(true)}
                >
                  +
                </button>
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
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                      <FaEllipsisV className="text-gray-600" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {loading ? (
                  <div className="text-center text-gray-400">Loading messages...</div>
                ) : isTranslating ? (
                  <div className="text-center text-gray-400">
                    <div className="flex items-center justify-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                      <span>AI is translating messages...</span>
                    </div>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="text-center text-gray-400">No messages yet.</div>
                ) : (
                  <>
                    {translationError && (
                      <div className="text-center text-orange-500 text-sm bg-orange-50 p-2 rounded-lg">
                        {translationError}
                      </div>
                    )}
                    {messages.map((message, idx) => (
                      <div
                        key={idx}
                        className={`flex ${message.sender.id === user._id ? "justify-end" : "justify-start"}`}
                      >
                        <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                          message.sender.id === user._id
                            ? "bg-blue-500 text-white"
                            : "bg-gray-200 text-gray-800"
                        }`}>
                          <div className="flex items-center space-x-2 mb-1">
                            <span className="text-xs opacity-75">{getLanguageFlag(message.content.language)}</span>
                            <span className="text-xs opacity-75">{getLanguageName(message.content.language)}</span>
                            {message.content.language !== userLanguage && (
                              <span className="text-xs opacity-50">(AI translated)</span>
                            )}
                          </div>
                          <p className="text-sm">{getDisplayMessage(message)}</p>
                          <p className={`text-xs mt-1 ${
                            message.sender.id === user._id ? "text-blue-100" : "text-gray-500"
                          }`}>
                            {message.createdAt ? new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ""}
                          </p>
                        </div>
                      </div>
                    ))}
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
                      onChange={(e) => setNewMessage(e.target.value)}
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
                        title="Select AI translation language"
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
                    <FaPaperPlane />
                  </button>
                </div>
                
                {/* Language Selector Dropdown */}
                {showLanguageSelector && (
                  <div className="mt-2 p-3 border border-gray-200 rounded-lg bg-gray-50">
                    <div className="mb-2 text-xs text-gray-600">
                      Select language for AI-powered translation:
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
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-sm relative">
            <button
              className="absolute top-2 right-2 text-gray-500 hover:text-gray-700 text-xl font-bold"
              onClick={() => {
                setShowNewMessageModal(false);
                setNewRecipientEmail("");
                setNewMessageError(null);
              }}
              aria-label="Close"
            >
              &times;
            </button>
            <h3 className="text-lg font-semibold mb-4 text-gray-800">Start New Conversation</h3>
            <p className="text-sm text-gray-600 mb-4">
              Enter the email address of the person you want to chat with.
            </p>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Recipient Email
                </label>
                <input
                  type="email"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="example@email.com"
                  value={newRecipientEmail}
                  onChange={e => setNewRecipientEmail(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleStartNewConversation();
                    }
                  }}
                />
              </div>
              
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
    </div>
  );
}
