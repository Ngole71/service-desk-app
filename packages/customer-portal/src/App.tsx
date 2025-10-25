import { useState, useEffect } from 'react';
import axios from 'axios';
import EmailSimulator from './pages/EmailSimulator';

const API_URL = 'http://localhost:3000';

interface Customer {
  id: string;
  name: string;
}

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  customer?: Customer | null;
}

interface Attachment {
  id: string;
  filename: string;
  filepath: string;
  mimetype: string;
  size: number;
  createdAt: string;
}

interface Ticket {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  createdAt: string;
  comments?: Comment[];
  attachments?: Attachment[];
  assignee?: User;
}

interface Comment {
  id: string;
  content: string;
  createdAt: string;
  isInternal: boolean;
  author?: User;
}

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Dashboard state
  const [activeView, setActiveView] = useState<'tickets' | 'faqs' | 'email-simulator'>('tickets');
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newPriority, setNewPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'>('MEDIUM');
  const [isCreating, setIsCreating] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [isAddingComment, setIsAddingComment] = useState(false);
  const [hasUpdates, setHasUpdates] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploadingFile, setIsUploadingFile] = useState(false);

  // FAQ state
  const [faqs, setFaqs] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [expandedFaqId, setExpandedFaqId] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');

    if (token && savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (e) {
        localStorage.clear();
      }
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (user) {
      loadTickets();
      loadFaqs();
    }
  }, [user]);

  // Auto-refresh tickets every 5 seconds
  useEffect(() => {
    if (!user) return;

    const interval = setInterval(async () => {
      try {
        setIsRefreshing(true);
        const token = localStorage.getItem('token');
        const response = await axios.get(`${API_URL}/tickets`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const newTickets = response.data.data || [];

        // Update tickets state
        setTickets((prevTickets) => {
          const hasChanges = JSON.stringify(newTickets) !== JSON.stringify(prevTickets);
          if (hasChanges) {
            setHasUpdates(true);
          }
          return newTickets;
        });

        // Auto-refresh selected ticket if viewing one
        setSelectedTicket((prevSelected) => {
          if (prevSelected) {
            const updatedTicket = newTickets.find((t: Ticket) => t.id === prevSelected.id);
            if (updatedTicket && JSON.stringify(updatedTicket) !== JSON.stringify(prevSelected)) {
              // Fetch full ticket details
              axios.get(`${API_URL}/tickets/${prevSelected.id}`, {
                headers: { Authorization: `Bearer ${token}` },
              }).then(res => setSelectedTicket(res.data)).catch(console.error);
            }
          }
          return prevSelected;
        });
      } catch (error) {
        console.error('Auto-refresh failed:', error);
      } finally {
        setIsRefreshing(false);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [user]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setIsLoggingIn(true);

    try {
      const response = await axios.post(`${API_URL}/auth/login`, {
        email: loginEmail,
        password: loginPassword,
      });

      const { access_token, user: userData } = response.data;

      if (userData.role !== 'CUSTOMER') {
        throw new Error('Only customers can access this portal');
      }

      localStorage.setItem('token', access_token);
      localStorage.setItem('user', JSON.stringify(userData));
      setUser(userData);
    } catch (err: any) {
      setLoginError(err.response?.data?.message || err.message || 'Login failed');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    setUser(null);
    setTickets([]);
    setSelectedTicket(null);
  };

  const loadTickets = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/tickets`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setTickets(response.data.data || []);
    } catch (error) {
      console.error('Failed to load tickets:', error);
    }
  };

  const loadFaqs = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/faqs`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setFaqs(response.data || []);
    } catch (error) {
      console.error('Failed to load FAQs:', error);
    }
  };

  const handleTicketClick = async (ticketId: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/tickets/${ticketId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSelectedTicket(response.data);
    } catch (error) {
      console.error('Failed to load ticket:', error);
    }
  };

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);

    console.log('Creating ticket:', { title: newTitle, description: newDescription, priority: newPriority });

    try {
      const token = localStorage.getItem('token');
      console.log('Token exists:', !!token);

      const response = await axios.post(
        `${API_URL}/tickets`,
        { title: newTitle, description: newDescription, priority: newPriority },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      console.log('Ticket created successfully:', response.data);

      setShowCreateModal(false);
      setNewTitle('');
      setNewDescription('');
      setNewPriority('MEDIUM');
      await loadTickets();
    } catch (error: any) {
      console.error('Failed to create ticket:', error);
      console.error('Error response:', error.response?.data);
      alert('Failed to create ticket: ' + (error.response?.data?.message || error.message));
    } finally {
      setIsCreating(false);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !newComment.trim()) return;

    setIsAddingComment(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API_URL}/tickets/${selectedTicket.id}/comments`,
        { content: newComment, isInternal: false },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setNewComment('');
      handleTicketClick(selectedTicket.id);
    } catch (error) {
      console.error('Failed to add comment:', error);
    } finally {
      setIsAddingComment(false);
    }
  };

  const handleFileUpload = async () => {
    if (!selectedFile || !selectedTicket) return;

    setIsUploadingFile(true);
    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('file', selectedFile);

      await axios.post(
        `${API_URL}/tickets/${selectedTicket.id}/attachments`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      setSelectedFile(null);
      handleTicketClick(selectedTicket.id);
    } catch (error: any) {
      console.error('Failed to upload file:', error);
      alert('Failed to upload file: ' + (error.response?.data?.message || error.message));
    } finally {
      setIsUploadingFile(false);
    }
  };

  const handleDownloadAttachment = async (attachmentId: string, filename: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${API_URL}/tickets/attachments/${attachmentId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
          responseType: 'blob',
        }
      );

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Failed to download attachment:', error);
      alert('Failed to download file');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'URGENT': return 'bg-red-100 text-red-700';
      case 'HIGH': return 'bg-orange-100 text-orange-700';
      case 'MEDIUM': return 'bg-yellow-100 text-yellow-700';
      case 'LOW': return 'bg-green-100 text-green-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'OPEN': return 'bg-blue-100 text-blue-700';
      case 'IN_PROGRESS': return 'bg-purple-100 text-purple-700';
      case 'WAITING': return 'bg-yellow-100 text-yellow-700';
      case 'CLOSED': return 'bg-gray-100 text-gray-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const formatDate = (date: string) => {
    const d = new Date(date);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  // Login Page
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
          <h1 className="text-3xl font-bold text-gray-900 mb-6 text-center">
            Customer Portal
          </h1>

          {loginError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {loginError}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
              <input
                type="email"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                placeholder="testcustomer@demo.com"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
              <input
                type="password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                placeholder="password123"
                required
              />
            </div>

            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full bg-indigo-600 text-white py-3 rounded-lg hover:bg-indigo-700 transition disabled:opacity-50 font-medium"
            >
              {isLoggingIn ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-gray-200 text-center">
            <p className="text-xs text-gray-500 mb-2">Test credentials:</p>
            <p className="text-sm text-gray-700 font-mono">
              testcustomer@demo.com / password123
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Dashboard
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 sm:space-x-4 flex-1 min-w-0">
              <h1 className="text-lg sm:text-2xl font-bold text-gray-900 truncate">
                {activeView === 'tickets' ? 'My Tickets' : activeView === 'faqs' ? 'FAQs' : 'Email Simulator'}
              </h1>
              {isRefreshing && (
                <div className="hidden sm:flex items-center text-sm text-gray-500">
                  <svg className="animate-spin h-4 w-4 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Syncing...
                </div>
              )}
              {hasUpdates && !isRefreshing && (
                <button
                  onClick={() => setHasUpdates(false)}
                  className="hidden sm:flex items-center text-xs sm:text-sm bg-green-100 text-green-700 px-2 sm:px-3 py-1 rounded-full hover:bg-green-200 transition"
                >
                  <span className="w-2 h-2 bg-green-600 rounded-full mr-2 animate-pulse"></span>
                  <span className="hidden sm:inline">Updates available</span>
                  <span className="sm:hidden">New</span>
                </button>
              )}
            </div>
            <div className="flex items-center space-x-2 sm:space-x-4">
              {activeView === 'tickets' && (
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="px-3 sm:px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition text-xs sm:text-sm font-medium whitespace-nowrap"
                >
                  <span className="hidden sm:inline">+ New Ticket</span>
                  <span className="sm:hidden">+ New</span>
                </button>
              )}
              <div className="hidden md:flex flex-col items-end">
                {user.customer && (
                  <span className="text-xs text-gray-500">{user.customer.name}</span>
                )}
                <span className="text-sm text-gray-600 truncate max-w-[150px]">{user.name}</span>
              </div>
              <button
                onClick={handleLogout}
                className="px-2 sm:px-4 py-2 text-xs sm:text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition"
              >
                Logout
              </button>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-4 sm:space-x-8">
              <button
                onClick={() => {
                  setActiveView('tickets');
                  setSelectedTicket(null);
                }}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeView === 'tickets'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                My Tickets
              </button>
              <button
                onClick={() => {
                  setActiveView('faqs');
                  setSelectedTicket(null);
                }}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeView === 'faqs'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Help & FAQs
              </button>
              <button
                onClick={() => {
                  setActiveView('email-simulator');
                  setSelectedTicket(null);
                }}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeView === 'email-simulator'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                📧 Email Test
              </button>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8 py-3 sm:py-6">
        {activeView === 'tickets' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-6">
          {/* Ticket List */}
          <div className={`lg:col-span-1 bg-white rounded-lg shadow ${selectedTicket ? 'hidden lg:block' : ''}`}>
            <div className="p-4 border-b">
              <h2 className="text-lg font-semibold text-gray-900">Your Tickets</h2>
            </div>

            <div className="max-h-[600px] overflow-y-auto">
              {tickets.map((ticket) => (
                <div
                  key={ticket.id}
                  onClick={() => handleTicketClick(ticket.id)}
                  className={`p-4 border-b cursor-pointer hover:bg-gray-50 transition ${
                    selectedTicket?.id === ticket.id ? 'bg-indigo-50' : ''
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-medium text-gray-900 text-sm flex-1">{ticket.title}</h3>
                    <span className={`text-xs px-2 py-1 rounded ml-2 ${getPriorityColor(ticket.priority)}`}>
                      {ticket.priority}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className={`text-xs px-2 py-1 rounded ${getStatusColor(ticket.status)}`}>
                      {ticket.status.replace('_', ' ')}
                    </span>
                    <span className="text-xs text-gray-500">{formatDate(ticket.createdAt)}</span>
                  </div>
                </div>
              ))}

              {tickets.length === 0 && (
                <div className="p-8 text-center text-gray-500">
                  <p className="mb-4">No tickets yet</p>
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="text-indigo-600 hover:text-indigo-700 text-sm font-medium"
                  >
                    Create your first ticket
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Ticket Detail */}
          <div className={`lg:col-span-2 bg-white rounded-lg shadow ${!selectedTicket ? 'hidden lg:block' : ''}`}>
            {selectedTicket ? (
              <div className="p-4 sm:p-6">
                {/* Mobile Back Button */}
                <button
                  onClick={() => setSelectedTicket(null)}
                  className="lg:hidden flex items-center text-indigo-600 mb-4 hover:text-indigo-700"
                >
                  <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Back to tickets
                </button>
                <div className="mb-6">
                  <div className="flex-1 mb-3">
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-900 break-words">{selectedTicket.title}</h2>
                    <p className="text-xs sm:text-sm text-gray-600 mt-1">
                      Created {formatDate(selectedTicket.createdAt)}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span className={`text-xs sm:text-sm px-2 sm:px-3 py-1 rounded ${getPriorityColor(selectedTicket.priority)}`}>
                      {selectedTicket.priority}
                    </span>
                    <span className={`text-xs sm:text-sm px-2 sm:px-3 py-1 rounded ${getStatusColor(selectedTicket.status)}`}>
                      {selectedTicket.status.replace('_', ' ')}
                    </span>
                  </div>
                </div>

                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Description</h3>
                  <p className="text-gray-700 whitespace-pre-wrap">{selectedTicket.description}</p>
                </div>

                {selectedTicket.assignee && (
                  <div className="mb-6 p-3 bg-blue-50 rounded-lg">
                    <p className="text-sm text-blue-900">
                      <strong>Assigned to:</strong> {selectedTicket.assignee.name}
                    </p>
                  </div>
                )}

                {/* Attachments */}
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Attachments</h3>

                  {selectedTicket.attachments && selectedTicket.attachments.length > 0 && (
                    <div className="space-y-2 mb-4">
                      {selectedTicket.attachments.map((attachment) => (
                        <div
                          key={attachment.id}
                          className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                        >
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <svg className="w-5 h-5 text-gray-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                            </svg>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-gray-900 truncate">{attachment.filename}</p>
                              <p className="text-xs text-gray-500">{formatFileSize(attachment.size)}</p>
                            </div>
                          </div>
                          <button
                            onClick={() => handleDownloadAttachment(attachment.id, attachment.filename)}
                            className="ml-2 px-3 py-1 text-xs bg-indigo-600 text-white rounded hover:bg-indigo-700 flex-shrink-0"
                          >
                            Download
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {selectedTicket.status !== 'CLOSED' && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <input
                          type="file"
                          onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                          className="flex-1 text-sm text-gray-600 file:mr-2 file:py-2 file:px-3 file:rounded file:border-0 file:text-sm file:font-medium file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                        />
                        <button
                          onClick={handleFileUpload}
                          disabled={!selectedFile || isUploadingFile}
                          className={`px-4 py-2 text-sm font-medium rounded ${
                            selectedFile && !isUploadingFile
                              ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                          }`}
                        >
                          {isUploadingFile ? 'Uploading...' : 'Upload'}
                        </button>
                      </div>
                      <p className="text-xs text-gray-500">Maximum file size: 10MB</p>
                    </div>
                  )}
                </div>

                {/* Comments */}
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Comments</h3>
                  {selectedTicket.comments && selectedTicket.comments.length > 0 ? (
                    <div className="space-y-3 mb-4">
                      {selectedTicket.comments.filter(c => !c.isInternal).map((comment) => (
                        <div key={comment.id} className="p-3 rounded-lg bg-gray-50">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium text-gray-900">
                              {comment.author?.name}
                              {comment.author?.id === user.id && ' (You)'}
                            </span>
                            <span className="text-xs text-gray-500">{formatDate(comment.createdAt)}</span>
                          </div>
                          <p className="text-sm text-gray-700">{comment.content}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 mb-4">No comments yet</p>
                  )}

                  {selectedTicket.status !== 'CLOSED' && (
                    <form onSubmit={handleAddComment} className="space-y-3">
                      <textarea
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                        rows={3}
                        placeholder="Add a comment..."
                      />
                      <button
                        type="submit"
                        disabled={isAddingComment || !newComment.trim()}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition disabled:opacity-50 text-sm font-medium"
                      >
                        {isAddingComment ? 'Adding...' : 'Add Comment'}
                      </button>
                    </form>
                  )}
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-500 p-8">
                <div className="text-center">
                  <p className="text-lg mb-2">No ticket selected</p>
                  <p className="text-sm">Click on a ticket to view details</p>
                </div>
              </div>
            )}
          </div>
        </div>
        )}

        {activeView === 'faqs' && (
          /* FAQs View */
          <div className="bg-white rounded-lg shadow">
            {/* Category Filter */}
            <div className="p-4 border-b">
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setSelectedCategory('all')}
                  className={`px-3 py-1 text-xs rounded-full transition ${
                    selectedCategory === 'all'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  All Categories
                </button>
                {Array.from(new Set(faqs.map(f => f.category).filter(Boolean))).map((category) => (
                  <button
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                    className={`px-3 py-1 text-xs rounded-full transition ${
                      selectedCategory === category
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {category}
                  </button>
                ))}
              </div>
            </div>

            {/* FAQs List */}
            <div className="divide-y divide-gray-200">
              {faqs
                .filter(faq => selectedCategory === 'all' || faq.category === selectedCategory)
                .map((faq) => (
                  <div key={faq.id} className="border-b border-gray-200">
                    <button
                      onClick={() => setExpandedFaqId(expandedFaqId === faq.id ? null : faq.id)}
                      className="w-full text-left p-4 hover:bg-gray-50 transition"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 pr-4">
                          <h3 className="font-medium text-gray-900">{faq.question}</h3>
                          {faq.category && (
                            <span className="inline-block mt-1 px-2 py-0.5 text-xs bg-indigo-100 text-indigo-700 rounded">
                              {faq.category}
                            </span>
                          )}
                        </div>
                        <svg
                          className={`w-5 h-5 text-gray-500 transition-transform flex-shrink-0 ${
                            expandedFaqId === faq.id ? 'transform rotate-180' : ''
                          }`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </button>
                    {expandedFaqId === faq.id && (
                      <div className="px-4 pb-4 text-gray-700 whitespace-pre-wrap">
                        {faq.answer}
                      </div>
                    )}
                  </div>
                ))}

              {faqs.filter(faq => selectedCategory === 'all' || faq.category === selectedCategory).length === 0 && (
                <div className="text-center py-12">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="mt-4 text-gray-500 text-sm">No FAQs available yet.</p>
                  <p className="text-gray-400 text-xs">Check back soon for helpful articles!</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeView === 'email-simulator' && (
          <EmailSimulator userEmail={user?.email} userName={user?.name} />
        )}
      </div>

      {/* Create Ticket Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-0 sm:p-4 z-50 overflow-y-auto">
          <div className="bg-white sm:rounded-lg shadow-xl max-w-2xl w-full min-h-screen sm:min-h-0 p-4 sm:p-6 my-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Create New Ticket</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="sm:hidden text-gray-500 hover:text-gray-700"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleCreateTicket} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="Brief description of the issue"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description (minimum 10 characters)
                </label>
                <textarea
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                  rows={5}
                  placeholder="Detailed description of your issue..."
                  minLength={10}
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  {newDescription.length}/10 characters minimum
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
                <select
                  value={newPriority}
                  onChange={(e) => setNewPriority(e.target.value as any)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="URGENT">Urgent</option>
                </select>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-4">
                <button
                  type="submit"
                  disabled={isCreating}
                  className="flex-1 bg-indigo-600 text-white py-3 sm:py-2 rounded-lg hover:bg-indigo-700 transition disabled:opacity-50 font-medium text-base sm:text-sm"
                >
                  {isCreating ? 'Creating...' : 'Create Ticket'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="hidden sm:block flex-1 bg-gray-200 text-gray-700 py-3 sm:py-2 rounded-lg hover:bg-gray-300 transition font-medium text-base sm:text-sm"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
