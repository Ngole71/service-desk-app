import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

const API_URL = 'http://localhost:3000';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  tenantId: string;
  customerId?: string;
  customer?: Customer;
  tags?: string[];
}

interface Customer {
  id: string;
  name: string;
  domain?: string;
  description?: string;
  emailConnector?: string;
  isActive: boolean;
  createdAt: string;
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
  updatedAt: string;
  comments?: Comment[];
  attachments?: Attachment[];
  assignee?: User;
  creator?: User;
  customerOrg?: Customer;
}

interface Comment {
  id: string;
  content: string;
  createdAt: string;
  isInternal: boolean;
  author?: User;
}

interface TicketStats {
  total: number;
  open: number;
  inProgress: number;
  waiting: number;
  closed: number;
}

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Dashboard state
  const [activeView, setActiveView] = useState<'tickets' | 'customers' | 'users' | 'analytics' | 'faqs'>('tickets');
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [stats, setStats] = useState<TicketStats>({ total: 0, open: 0, inProgress: 0, waiting: 0, closed: 0 });
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('all');
  const [newComment, setNewComment] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [isAddingComment, setIsAddingComment] = useState(false);
  const [hasUpdates, setHasUpdates] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploadingFile, setIsUploadingFile] = useState(false);

  // Ticket draft state for save/cancel functionality
  const [draftPriority, setDraftPriority] = useState<string>('');
  const [draftStatus, setDraftStatus] = useState<string>('');
  const [draftAssigneeId, setDraftAssigneeId] = useState<string>('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Customer management state
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerDomain, setNewCustomerDomain] = useState('');
  const [newCustomerDescription, setNewCustomerDescription] = useState('');
  const [newCustomerEmailConnector, setNewCustomerEmailConnector] = useState('');
  const [isCreatingCustomer, setIsCreatingCustomer] = useState(false);

  // User management state
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserName, setNewUserName] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState<'CUSTOMER' | 'AGENT' | 'ADMIN'>('CUSTOMER');
  const [newUserCustomerId, setNewUserCustomerId] = useState('');
  const [newUserTags, setNewUserTags] = useState('');
  const [isCreatingUser, setIsCreatingUser] = useState(false);

  // FAQ management state
  const [faqs, setFaqs] = useState<any[]>([]);
  const [showFaqModal, setShowFaqModal] = useState(false);
  const [editingFaq, setEditingFaq] = useState<any | null>(null);
  const [faqQuestion, setFaqQuestion] = useState('');
  const [faqAnswer, setFaqAnswer] = useState('');
  const [faqCategory, setFaqCategory] = useState('');
  const [faqOrder, setFaqOrder] = useState(0);
  const [faqIsPublished, setFaqIsPublished] = useState(true);
  const [isCreatingFaq, setIsCreatingFaq] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');

  useEffect(() => {
    const token = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');

    if (token && savedUser) {
      try {
        const userData = JSON.parse(savedUser);
        if (userData.role === 'ADMIN' || userData.role === 'AGENT') {
          setUser(userData);
        } else {
          localStorage.clear();
        }
      } catch (e) {
        localStorage.clear();
      }
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (user) {
      loadTickets();
      loadUsers();
      loadCustomers();
      loadStats();
      if (user.role === 'ADMIN') {
        loadFaqs();
      }
    }
  }, [user, statusFilter]);

  // Auto-refresh tickets and stats every 5 seconds
  useEffect(() => {
    if (!user) return;

    const interval = setInterval(async () => {
      try {
        setIsRefreshing(true);

        // Refresh tickets
        const params: any = {};
        if (statusFilter !== 'all') {
          params.status = statusFilter.toUpperCase();
        }
        const ticketsResponse = await axios.get(`${API_URL}/tickets`, {
          headers: { Authorization: `Bearer ${getToken()}` },
          params,
        });
        const newTickets = ticketsResponse.data.data || [];

        // Refresh stats
        const statsResponse = await axios.get(`${API_URL}/tickets/stats`, {
          headers: { Authorization: `Bearer ${getToken()}` },
        });
        const newStats = statsResponse.data;

        // Update tickets state
        setTickets((prevTickets) => {
          const hasChanges = JSON.stringify(newTickets) !== JSON.stringify(prevTickets);
          if (hasChanges) {
            setHasUpdates(true);
          }
          return newTickets;
        });

        // Update stats state
        setStats((prevStats) => {
          const hasChanges = JSON.stringify(newStats) !== JSON.stringify(prevStats);
          if (hasChanges) {
            setHasUpdates(true);
          }
          return newStats;
        });

        // Auto-refresh selected ticket if viewing one
        setSelectedTicket((prevSelected) => {
          if (prevSelected) {
            const updatedTicket = newTickets.find((t: Ticket) => t.id === prevSelected.id);
            if (updatedTicket && JSON.stringify(updatedTicket) !== JSON.stringify(prevSelected)) {
              // Fetch full ticket details
              axios.get(`${API_URL}/tickets/${prevSelected.id}`, {
                headers: { Authorization: `Bearer ${getToken()}` },
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
  }, [user, statusFilter]);

  // Initialize draft values when ticket is selected
  useEffect(() => {
    if (selectedTicket) {
      setDraftStatus(selectedTicket.status);
      setDraftPriority(selectedTicket.priority);
      setDraftAssigneeId(selectedTicket.assignee?.id || '');
      setHasUnsavedChanges(false);
      setSaveSuccess(false);
    }
  }, [selectedTicket?.id]);

  // Memoize priority data to prevent chart flashing
  const priorityData = useMemo(() => {
    const data = [
      { name: 'Urgent', value: tickets.filter(t => t.priority === 'URGENT').length, fill: '#EF4444' },
      { name: 'High', value: tickets.filter(t => t.priority === 'HIGH').length, fill: '#F97316' },
      { name: 'Medium', value: tickets.filter(t => t.priority === 'MEDIUM').length, fill: '#EAB308' },
      { name: 'Low', value: tickets.filter(t => t.priority === 'LOW').length, fill: '#22C55E' },
    ];
    // Filter out priorities with 0 tickets to prevent chart flickering
    return data.filter(item => item.value > 0);
  }, [tickets]);

  // Memoize agent load data
  const agentLoadData = useMemo(() => {
    const agentTicketCounts = new Map<string, { name: string; count: number }>();

    // Count tickets per agent
    tickets.forEach(ticket => {
      if (ticket.assignee) {
        const existing = agentTicketCounts.get(ticket.assignee.id);
        if (existing) {
          existing.count++;
        } else {
          agentTicketCounts.set(ticket.assignee.id, {
            name: ticket.assignee.name,
            count: 1
          });
        }
      }
    });

    // Convert to array and sort by count descending
    return Array.from(agentTicketCounts.values())
      .map(agent => ({ name: agent.name, tickets: agent.count, fill: '#8B5CF6' }))
      .sort((a, b) => b.tickets - a.tickets);
  }, [tickets]);

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

      if (userData.role !== 'ADMIN' && userData.role !== 'AGENT') {
        throw new Error('Only admins and agents can access this portal');
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

  const getToken = () => localStorage.getItem('token');

  const loadTickets = async () => {
    try {
      const params: any = {};
      if (statusFilter !== 'all') {
        params.status = statusFilter.toUpperCase();
      }

      const response = await axios.get(`${API_URL}/tickets`, {
        headers: { Authorization: `Bearer ${getToken()}` },
        params,
      });
      setTickets(response.data.data || []);
    } catch (error) {
      console.error('Failed to load tickets:', error);
    }
  };

  const loadUsers = async () => {
    try {
      const response = await axios.get(`${API_URL}/users`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      setUsers(response.data || []);
    } catch (error) {
      console.error('Failed to load users:', error);
    }
  };

  const loadStats = async () => {
    try {
      const response = await axios.get(`${API_URL}/tickets/stats`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      setStats(response.data);
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  const loadCustomers = async () => {
    try {
      const response = await axios.get(`${API_URL}/customers`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      setCustomers(response.data || []);
    } catch (error) {
      console.error('Failed to load customers:', error);
    }
  };

  const loadFaqs = async () => {
    try {
      const response = await axios.get(`${API_URL}/faqs`, {
        headers: { Authorization: `Bearer ${getToken()}` },
        params: { includeUnpublished: 'true' },
      });
      setFaqs(response.data || []);
    } catch (error) {
      console.error('Failed to load FAQs:', error);
    }
  };

  const handleOpenFaqModal = (faq?: any) => {
    if (faq) {
      setEditingFaq(faq);
      setFaqQuestion(faq.question);
      setFaqAnswer(faq.answer);
      setFaqCategory(faq.category || '');
      setFaqOrder(faq.order || 0);
      setFaqIsPublished(faq.isPublished);
    } else {
      setEditingFaq(null);
      setFaqQuestion('');
      setFaqAnswer('');
      setFaqCategory('');
      setFaqOrder(0);
      setFaqIsPublished(true);
    }
    setShowFaqModal(true);
  };

  const handleCloseFaqModal = () => {
    setShowFaqModal(false);
    setEditingFaq(null);
    setFaqQuestion('');
    setFaqAnswer('');
    setFaqCategory('');
    setFaqOrder(0);
    setFaqIsPublished(true);
  };

  const handleSaveFaq = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreatingFaq(true);

    try {
      const faqData = {
        question: faqQuestion,
        answer: faqAnswer,
        category: faqCategory || undefined,
        order: faqOrder,
        isPublished: faqIsPublished,
      };

      if (editingFaq) {
        await axios.patch(
          `${API_URL}/faqs/${editingFaq.id}`,
          faqData,
          { headers: { Authorization: `Bearer ${getToken()}` } }
        );
      } else {
        await axios.post(
          `${API_URL}/faqs`,
          faqData,
          { headers: { Authorization: `Bearer ${getToken()}` } }
        );
      }

      handleCloseFaqModal();
      await loadFaqs();
    } catch (error: any) {
      console.error('Failed to save FAQ:', error);
      alert('Failed to save FAQ: ' + (error.response?.data?.message || error.message));
    } finally {
      setIsCreatingFaq(false);
    }
  };

  const handleDeleteFaq = async (faqId: string) => {
    if (!confirm('Are you sure you want to delete this FAQ?')) return;

    try {
      await axios.delete(
        `${API_URL}/faqs/${faqId}`,
        { headers: { Authorization: `Bearer ${getToken()}` } }
      );
      await loadFaqs();
    } catch (error: any) {
      console.error('Failed to delete FAQ:', error);
      alert('Failed to delete FAQ: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleTogglePublish = async (faq: any) => {
    try {
      await axios.patch(
        `${API_URL}/faqs/${faq.id}`,
        { isPublished: !faq.isPublished },
        { headers: { Authorization: `Bearer ${getToken()}` } }
      );
      await loadFaqs();
    } catch (error: any) {
      console.error('Failed to toggle publish:', error);
      alert('Failed to toggle publish: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreatingCustomer(true);

    try {
      await axios.post(
        `${API_URL}/customers`,
        {
          name: newCustomerName,
          domain: newCustomerDomain || undefined,
          description: newCustomerDescription || undefined,
          emailConnector: newCustomerEmailConnector || undefined,
        },
        { headers: { Authorization: `Bearer ${getToken()}` } }
      );

      setShowCustomerModal(false);
      setNewCustomerName('');
      setNewCustomerDomain('');
      setNewCustomerDescription('');
      setNewCustomerEmailConnector('');
      await loadCustomers();
    } catch (error: any) {
      console.error('Failed to create customer:', error);
      alert('Failed to create customer: ' + (error.response?.data?.message || error.message));
    } finally {
      setIsCreatingCustomer(false);
    }
  };

  const handleDeleteCustomer = async (customerId: string) => {
    if (!confirm('Are you sure you want to delete this customer?')) return;

    try {
      await axios.delete(
        `${API_URL}/customers/${customerId}`,
        { headers: { Authorization: `Bearer ${getToken()}` } }
      );
      await loadCustomers();
    } catch (error: any) {
      console.error('Failed to delete customer:', error);
      alert('Failed to delete customer: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreatingUser(true);

    try {
      // Parse tags from comma-separated string
      const tagsArray = newUserTags
        .split(',')
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0);

      await axios.post(
        `${API_URL}/users`,
        {
          email: newUserEmail,
          name: newUserName,
          password: newUserPassword || undefined,
          role: newUserRole,
          customerId: newUserCustomerId || undefined,
          tags: tagsArray.length > 0 ? tagsArray : undefined,
        },
        { headers: { Authorization: `Bearer ${getToken()}` } }
      );

      setShowUserModal(false);
      setNewUserEmail('');
      setNewUserName('');
      setNewUserPassword('');
      setNewUserRole('CUSTOMER');
      setNewUserCustomerId('');
      setNewUserTags('');
      await loadUsers();
    } catch (error: any) {
      console.error('Failed to create user:', error);
      alert('Failed to create user: ' + (error.response?.data?.message || error.message));
    } finally {
      setIsCreatingUser(false);
    }
  };

  const handleEditUser = async (userId: string, updates: Partial<User>) => {
    try {
      await axios.patch(
        `${API_URL}/users/${userId}`,
        updates,
        { headers: { Authorization: `Bearer ${getToken()}` } }
      );
      await loadUsers();
    } catch (error: any) {
      console.error('Failed to update user:', error);
      alert('Failed to update user: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return;

    try {
      await axios.delete(
        `${API_URL}/users/${userId}`,
        { headers: { Authorization: `Bearer ${getToken()}` } }
      );
      await loadUsers();
    } catch (error: any) {
      console.error('Failed to delete user:', error);
      alert('Failed to delete user: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleTicketClick = async (ticketId: string) => {
    try {
      const response = await axios.get(`${API_URL}/tickets/${ticketId}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      setSelectedTicket(response.data);
    } catch (error) {
      console.error('Failed to load ticket:', error);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !newComment.trim()) return;

    setIsAddingComment(true);
    try {
      await axios.post(
        `${API_URL}/tickets/${selectedTicket.id}/comments`,
        { content: newComment, isInternal },
        { headers: { Authorization: `Bearer ${getToken()}` } }
      );

      setNewComment('');
      setIsInternal(false);
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
      const formData = new FormData();
      formData.append('file', selectedFile);

      await axios.post(
        `${API_URL}/tickets/${selectedTicket.id}/attachments`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${getToken()}`,
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
      const response = await axios.get(
        `${API_URL}/tickets/attachments/${attachmentId}`,
        {
          headers: { Authorization: `Bearer ${getToken()}` },
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

  // Update draft state handlers (no immediate API calls)
  const handleStatusChange = (ticketId: string, newStatus: string) => {
    setDraftStatus(newStatus);
    setHasUnsavedChanges(true);
    setSaveSuccess(false);
  };

  const handlePriorityChange = (ticketId: string, newPriority: string) => {
    setDraftPriority(newPriority);
    setHasUnsavedChanges(true);
    setSaveSuccess(false);
  };

  const handleAssignChange = (assigneeId: string) => {
    setDraftAssigneeId(assigneeId);
    setHasUnsavedChanges(true);
    setSaveSuccess(false);
  };

  // Save ticket changes
  const handleSaveTicket = async () => {
    if (!selectedTicket || !hasUnsavedChanges) return;

    setIsSaving(true);
    setSaveSuccess(false);

    try {
      // Build update payload
      const updates: any = {};
      if (draftStatus !== selectedTicket.status) updates.status = draftStatus;
      if (draftPriority !== selectedTicket.priority) updates.priority = draftPriority;

      // Update basic ticket fields
      if (Object.keys(updates).length > 0) {
        await axios.patch(
          `${API_URL}/tickets/${selectedTicket.id}`,
          updates,
          { headers: { Authorization: `Bearer ${getToken()}` } }
        );
      }

      // Handle assignment separately if changed
      if (draftAssigneeId !== (selectedTicket.assignee?.id || '')) {
        if (draftAssigneeId) {
          await axios.patch(
            `${API_URL}/tickets/${selectedTicket.id}/assign/${draftAssigneeId}`,
            {},
            { headers: { Authorization: `Bearer ${getToken()}` } }
          );
        }
      }

      // Reload data
      await loadTickets();
      await handleTicketClick(selectedTicket.id);

      setHasUnsavedChanges(false);
      setSaveSuccess(true);

      // Clear success message after 3 seconds
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error('Failed to save ticket:', error);
      alert('Failed to save changes. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // Cancel ticket changes
  const handleCancelTicket = () => {
    if (!selectedTicket) return;

    // Reset draft values to original
    setDraftStatus(selectedTicket.status);
    setDraftPriority(selectedTicket.priority);
    setDraftAssigneeId(selectedTicket.assignee?.id || '');
    setHasUnsavedChanges(false);
    setSaveSuccess(false);
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
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
          <h1 className="text-3xl font-bold text-gray-900 mb-6 text-center">
            Admin Portal
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
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                placeholder="ui.admin@demo.com"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
              <input
                type="password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                placeholder="password123"
                required
              />
            </div>

            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full bg-purple-600 text-white py-3 rounded-lg hover:bg-purple-700 transition disabled:opacity-50 font-medium"
            >
              {isLoggingIn ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-gray-200 text-center">
            <p className="text-xs text-gray-500 mb-2">Test credentials:</p>
            <p className="text-sm text-gray-700 font-mono">
              ui.admin@demo.com / password123
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Dashboard
  const agents = users.filter(u => u.role === 'AGENT');
  const customerUsers = users.filter(u => u.role === 'CUSTOMER');

  // Filter tickets by customer organization if selected
  const filteredTickets = selectedCustomerId === 'all'
    ? tickets
    : tickets.filter(t => t.customerOrg?.id === selectedCustomerId);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 sm:space-x-4 flex-1 min-w-0">
              <h1 className="text-lg sm:text-2xl font-bold text-gray-900 truncate">Admin Dashboard</h1>
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
              <span className="hidden md:inline text-xs sm:text-sm text-gray-600 truncate max-w-[120px]">{user.name} ({user.role})</span>
              <button
                onClick={handleLogout}
                className="px-2 sm:px-4 py-2 text-xs sm:text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8 pt-4">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-4 sm:space-x-8">
            <button
              onClick={() => setActiveView('tickets')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeView === 'tickets'
                  ? 'border-purple-500 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Tickets
            </button>
            {user?.role === 'ADMIN' && (
              <>
                <button
                  onClick={() => setActiveView('customers')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeView === 'customers'
                      ? 'border-purple-500 text-purple-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Customers
                </button>
                <button
                  onClick={() => setActiveView('users')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeView === 'users'
                      ? 'border-purple-500 text-purple-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  User Management
                </button>
              </>
            )}
            <button
              onClick={() => setActiveView('analytics')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeView === 'analytics'
                  ? 'border-purple-500 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Analytics
            </button>
            {user?.role === 'ADMIN' && (
              <button
                onClick={() => setActiveView('faqs')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeView === 'faqs'
                    ? 'border-purple-500 text-purple-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                FAQs
              </button>
            )}
          </nav>
        </div>
      </div>

      {/* Main Content Area */}
      <div>
        {/* Stats */}
        {activeView === 'tickets' && (
        <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8 py-3 sm:py-6">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2 sm:gap-4 mb-4 sm:mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-600">Total</div>
            <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
          </div>
          <div className="bg-blue-50 rounded-lg shadow p-4">
            <div className="text-sm text-blue-600">Open</div>
            <div className="text-2xl font-bold text-blue-900">{stats.open}</div>
          </div>
          <div className="bg-purple-50 rounded-lg shadow p-4">
            <div className="text-sm text-purple-600">In Progress</div>
            <div className="text-2xl font-bold text-purple-900">{stats.inProgress}</div>
          </div>
          <div className="bg-yellow-50 rounded-lg shadow p-4">
            <div className="text-sm text-yellow-600">Waiting</div>
            <div className="text-2xl font-bold text-yellow-900">{stats.waiting}</div>
          </div>
          <div className="bg-gray-50 rounded-lg shadow p-4">
            <div className="text-sm text-gray-600">Closed</div>
            <div className="text-2xl font-bold text-gray-900">{stats.closed}</div>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-6">
          {/* Ticket List */}
          <div className={`lg:col-span-1 bg-white rounded-lg shadow ${selectedTicket ? 'hidden lg:block' : ''}`}>
            <div className="p-4 border-b">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">All Tickets</h2>

              {/* Customer Organization Filter */}
              <div className="mb-3">
                <p className="text-xs font-medium text-gray-700 mb-2">Customer Organization</p>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setSelectedCustomerId('all')}
                    className={`px-3 py-1 text-xs rounded-full transition ${
                      selectedCustomerId === 'all'
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    All Organizations
                  </button>
                  {customers.map((customer) => (
                    <button
                      key={customer.id}
                      onClick={() => setSelectedCustomerId(customer.id)}
                      className={`px-3 py-1 text-xs rounded-full transition ${
                        selectedCustomerId === customer.id
                          ? 'bg-purple-600 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {customer.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Status Filter */}
              <div>
                <p className="text-xs font-medium text-gray-700 mb-2">Status</p>
                <div className="flex flex-wrap gap-2">
                  {['all', 'open', 'in_progress', 'waiting', 'closed'].map((f) => (
                    <button
                      key={f}
                      onClick={() => setStatusFilter(f)}
                      className={`px-3 py-1 text-xs rounded-full transition ${
                        statusFilter === f
                          ? 'bg-purple-600 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {f.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="max-h-[600px] overflow-y-auto">
              {filteredTickets.map((ticket) => (
                <div
                  key={ticket.id}
                  onClick={() => handleTicketClick(ticket.id)}
                  className={`p-4 border-b cursor-pointer hover:bg-gray-50 transition ${
                    selectedTicket?.id === ticket.id ? 'bg-purple-50' : ''
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-medium text-gray-900 text-sm flex-1">{ticket.title}</h3>
                    <span className={`text-xs px-2 py-1 rounded ml-2 ${getPriorityColor(ticket.priority)}`}>
                      {ticket.priority}
                    </span>
                  </div>
                  {ticket.customerOrg && (
                    <div className="text-xs text-gray-500 mb-1">Customer: {ticket.customerOrg.name}</div>
                  )}
                  <div className="text-xs text-gray-500 mb-1">
                    Assigned: {ticket.assignee ? ticket.assignee.name : 'Unassigned'}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className={`text-xs px-2 py-1 rounded ${getStatusColor(ticket.status)}`}>
                      {ticket.status.replace('_', ' ')}
                    </span>
                    <span className="text-xs text-gray-500">{formatDate(ticket.createdAt)}</span>
                  </div>
                </div>
              ))}

              {filteredTickets.length === 0 && (
                <div className="p-8 text-center text-gray-500">
                  No tickets found
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
                  className="lg:hidden flex items-center text-purple-600 mb-4 hover:text-purple-700"
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
                      Created {formatDate(selectedTicket.createdAt)} by {selectedTicket.creator?.name}
                      {selectedTicket.customerOrg && ` (${selectedTicket.customerOrg.name})`}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <select
                      value={draftPriority}
                      onChange={(e) => handlePriorityChange(selectedTicket.id, e.target.value)}
                      disabled={!draftAssigneeId}
                      className={`text-xs sm:text-sm px-2 sm:px-3 py-2 sm:py-1 rounded border-0 outline-none ${!draftAssigneeId ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'} ${getPriorityColor(draftPriority)}`}
                    >
                      <option value="LOW">LOW</option>
                      <option value="MEDIUM">MEDIUM</option>
                      <option value="HIGH">HIGH</option>
                      <option value="URGENT">URGENT</option>
                    </select>
                    <select
                      value={draftStatus}
                      onChange={(e) => handleStatusChange(selectedTicket.id, e.target.value)}
                      disabled={!draftAssigneeId}
                      className={`text-xs sm:text-sm px-2 sm:px-3 py-2 sm:py-1 rounded border-0 outline-none ${!draftAssigneeId ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'} ${getStatusColor(draftStatus)}`}
                    >
                      <option value="OPEN">OPEN</option>
                      <option value="IN_PROGRESS">IN PROGRESS</option>
                      <option value="WAITING">WAITING</option>
                      <option value="CLOSED">CLOSED</option>
                    </select>
                  </div>
                </div>

                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Description</h3>
                  <p className="text-gray-700 whitespace-pre-wrap">{selectedTicket.description}</p>
                </div>

                {!draftAssigneeId && (
                  <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <p className="text-sm text-yellow-800">
                      ⚠️ An agent must be assigned to this ticket before any actions can be taken.
                    </p>
                  </div>
                )}

                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Assign To</h3>
                  <select
                    value={draftAssigneeId}
                    onChange={(e) => handleAssignChange(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                  >
                    <option value="">Unassigned</option>
                    {agents.length === 0 && (
                      <option value="" disabled>No agents available - create AGENT users first</option>
                    )}
                    {agents.map((agent) => (
                      <option key={agent.id} value={agent.id}>
                        {agent.name} ({agent.role})
                      </option>
                    ))}
                  </select>
                  {agents.length === 0 && (
                    <p className="text-xs text-amber-600 mt-1">
                      💡 Create users with AGENT role to assign tickets
                    </p>
                  )}
                </div>

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
                            className="ml-2 px-3 py-1 text-xs bg-purple-600 text-white rounded hover:bg-purple-700 flex-shrink-0"
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
                          disabled={!draftAssigneeId}
                          className={`flex-1 text-sm text-gray-600 file:mr-2 file:py-2 file:px-3 file:rounded file:border-0 file:text-sm file:font-medium ${!draftAssigneeId ? 'file:bg-gray-200 file:text-gray-500 cursor-not-allowed' : 'file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100'}`}
                        />
                        <button
                          onClick={handleFileUpload}
                          disabled={!draftAssigneeId || !selectedFile || isUploadingFile}
                          className={`px-4 py-2 text-sm font-medium rounded ${
                            draftAssigneeId && selectedFile && !isUploadingFile
                              ? 'bg-purple-600 text-white hover:bg-purple-700'
                              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                          }`}
                        >
                          {isUploadingFile ? 'Uploading...' : 'Upload'}
                        </button>
                      </div>
                      <p className="text-xs text-gray-500">
                        {!draftAssigneeId ? 'Assign an agent first to enable file uploads' : 'Maximum file size: 10MB'}
                      </p>
                    </div>
                  )}
                </div>

                {/* Save/Cancel Buttons */}
                <div className="mb-6 pb-6 border-b border-gray-200">
                  {saveSuccess && (
                    <div className="mb-3 p-3 bg-green-50 text-green-700 rounded-lg flex items-center gap-2">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                      </svg>
                      Changes saved successfully!
                    </div>
                  )}
                  <div className="flex gap-3">
                    <button
                      onClick={handleSaveTicket}
                      disabled={!hasUnsavedChanges || isSaving}
                      className={`flex-1 px-4 py-2 rounded-lg font-medium transition ${
                        hasUnsavedChanges && !isSaving
                          ? 'bg-purple-600 text-white hover:bg-purple-700'
                          : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      }`}
                    >
                      {isSaving ? 'Saving...' : 'Save Changes'}
                    </button>
                    <button
                      onClick={() => setSelectedTicket(null)}
                      className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition"
                    >
                      Exit
                    </button>
                    {hasUnsavedChanges && (
                      <button
                        onClick={handleCancelTicket}
                        className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </div>

                {/* Comments */}
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Comments</h3>
                  {selectedTicket.comments && selectedTicket.comments.length > 0 ? (
                    <div className="space-y-3 mb-4">
                      {selectedTicket.comments.map((comment) => (
                        <div
                          key={comment.id}
                          className={`p-3 rounded-lg ${
                            comment.isInternal ? 'bg-yellow-50 border border-yellow-200' : 'bg-gray-50'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium text-gray-900">
                              {comment.author?.name}
                              {comment.isInternal && (
                                <span className="ml-2 text-xs bg-yellow-200 text-yellow-800 px-2 py-0.5 rounded">
                                  Internal
                                </span>
                              )}
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

                  <form onSubmit={handleAddComment} className="space-y-3">
                    <textarea
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      disabled={!draftAssigneeId}
                      className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none resize-none ${!draftAssigneeId ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                      rows={3}
                      placeholder={!draftAssigneeId ? "Assign an agent first to enable commenting" : "Add a comment (optional)..."}
                    />
                    <div className="flex items-center justify-between">
                      <label className={`flex items-center text-sm ${!draftAssigneeId ? 'text-gray-400' : 'text-gray-700'}`}>
                        <input
                          type="checkbox"
                          checked={isInternal}
                          onChange={(e) => setIsInternal(e.target.checked)}
                          disabled={!draftAssigneeId}
                          className="mr-2"
                        />
                        Internal comment (only visible to admins/agents)
                      </label>
                      <button
                        type="submit"
                        disabled={!draftAssigneeId || isAddingComment || !newComment.trim()}
                        className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition disabled:opacity-50 text-sm font-medium"
                      >
                        {isAddingComment ? 'Adding...' : 'Add Comment'}
                      </button>
                    </div>
                  </form>
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
      </div>
      )}

      {/* Customer Management View */}
      {activeView === 'customers' && user?.role === 'ADMIN' && (
        <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8 py-3 sm:py-6">
          <div className="bg-white rounded-lg shadow">
            <div className="p-4 sm:p-6 border-b flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900">Customer Organizations</h2>
              <button
                onClick={() => setShowCustomerModal(true)}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition text-sm font-medium"
              >
                + Add Customer
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Domain
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Email Connector
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Description
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {customers.map((customer) => (
                    <tr key={customer.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {customer.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {customer.domain || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {customer.emailConnector || '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                        {customer.description || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          customer.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                        }`}>
                          {customer.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                        <button
                          onClick={() => handleDeleteCustomer(customer.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {customers.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-gray-500 text-sm">No customers yet. Create your first customer organization.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* User Management View */}
      {activeView === 'users' && user?.role === 'ADMIN' && (
        <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8 py-3 sm:py-6">
          <div className="bg-white rounded-lg shadow">
            <div className="p-4 sm:p-6 border-b flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900">Users</h2>
              <button
                onClick={() => setShowUserModal(true)}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition text-sm font-medium"
              >
                + Add User
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Customer
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tags
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {u.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {u.email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          u.role === 'ADMIN' ? 'bg-red-100 text-red-700' :
                          u.role === 'AGENT' ? 'bg-blue-100 text-blue-700' :
                          'bg-green-100 text-green-700'
                        }`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {u.customer?.name || '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {u.tags && u.tags.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {u.tags.map((tag, index) => (
                              <span key={index} className="px-2 py-0.5 text-xs bg-purple-100 text-purple-700 rounded">
                                {tag}
                              </span>
                            ))}
                          </div>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        Active
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                        <button
                          onClick={() => handleDeleteUser(u.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Analytics View */}
      {activeView === 'analytics' && (
        <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8 py-3 sm:py-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Analytics Dashboard</h2>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-sm text-gray-600 mb-1">Total Tickets</div>
              <div className="text-3xl font-bold text-gray-900">{stats.total}</div>
              <div className="text-xs text-gray-500 mt-2">All time</div>
            </div>
            <div className="bg-blue-50 rounded-lg shadow p-6">
              <div className="text-sm text-blue-600 mb-1">Open</div>
              <div className="text-3xl font-bold text-blue-900">{stats.open}</div>
              <div className="text-xs text-blue-600 mt-2">{stats.total > 0 ? Math.round((stats.open / stats.total) * 100) : 0}% of total</div>
            </div>
            <div className="bg-purple-50 rounded-lg shadow p-6">
              <div className="text-sm text-purple-600 mb-1">In Progress</div>
              <div className="text-3xl font-bold text-purple-900">{stats.inProgress}</div>
              <div className="text-xs text-purple-600 mt-2">{stats.total > 0 ? Math.round((stats.inProgress / stats.total) * 100) : 0}% of total</div>
            </div>
            <div className="bg-green-50 rounded-lg shadow p-6">
              <div className="text-sm text-green-600 mb-1">Closed</div>
              <div className="text-3xl font-bold text-green-900">{stats.closed}</div>
              <div className="text-xs text-green-600 mt-2">{stats.total > 0 ? Math.round((stats.closed / stats.total) * 100) : 0}% of total</div>
            </div>
          </div>

          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Status Distribution */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Tickets by Status</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={[
                  { name: 'Open', value: stats.open || 0 },
                  { name: 'In Progress', value: stats.inProgress || 0 },
                  { name: 'Waiting', value: stats.waiting || 0 },
                  { name: 'Closed', value: stats.closed || 0 },
                ]}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value">
                    <Cell fill="#3B82F6" />
                    <Cell fill="#A855F7" />
                    <Cell fill="#EAB308" />
                    <Cell fill="#6B7280" />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Priority Distribution */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Tickets by Priority</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={priorityData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    dataKey="value"
                    animationDuration={500}
                  >
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Customer Ticket Count */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Tickets by Customer Organization</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={(() => {
                  // Group tickets by customer organization
                  const customerTickets = new Map();
                  tickets.forEach(ticket => {
                    if (ticket.customerOrg) {
                      const count = customerTickets.get(ticket.customerOrg.name) || 0;
                      customerTickets.set(ticket.customerOrg.name, count + 1);
                    }
                  });
                  return Array.from(customerTickets.entries()).map(([name, count]) => ({
                    name,
                    tickets: count,
                  }));
                })()}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="tickets" fill="#8B5CF6" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Agent Load Chart */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Agent Load (Assigned Tickets)</h3>
              <ResponsiveContainer width="100%" height={300}>
                {agentLoadData.length > 0 ? (
                  <BarChart data={agentLoadData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="tickets" fill="#8B5CF6" />
                  </BarChart>
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-500">
                    No tickets assigned to agents yet
                  </div>
                )}
              </ResponsiveContainer>
            </div>

            {/* Resolution Time (Placeholder) */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Ticket Statistics</h3>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm text-gray-600">Open Rate</span>
                    <span className="text-sm font-semibold text-gray-900">
                      {stats.total > 0 ? Math.round((stats.open / stats.total) * 100) : 0}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full"
                      style={{ width: `${stats.total > 0 ? (stats.open / stats.total) * 100 : 0}%` }}
                    ></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm text-gray-600">In Progress Rate</span>
                    <span className="text-sm font-semibold text-gray-900">
                      {stats.total > 0 ? Math.round((stats.inProgress / stats.total) * 100) : 0}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-purple-600 h-2 rounded-full"
                      style={{ width: `${stats.total > 0 ? (stats.inProgress / stats.total) * 100 : 0}%` }}
                    ></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm text-gray-600">Resolution Rate</span>
                    <span className="text-sm font-semibold text-gray-900">
                      {stats.total > 0 ? Math.round((stats.closed / stats.total) * 100) : 0}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-green-600 h-2 rounded-full"
                      style={{ width: `${stats.total > 0 ? (stats.closed / stats.total) * 100 : 0}%` }}
                    ></div>
                  </div>
                </div>
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-xs text-gray-500 mb-1">Total Customers</div>
                      <div className="text-2xl font-bold text-gray-900">{customerUsers.length}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 mb-1">Total Agents</div>
                      <div className="text-2xl font-bold text-gray-900">{agents.length}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* FAQs Management View */}
      {activeView === 'faqs' && user?.role === 'ADMIN' && (
        <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8 py-3 sm:py-6">
          <div className="bg-white rounded-lg shadow">
            <div className="p-4 sm:p-6 border-b flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900">FAQ Management</h2>
              <button
                onClick={() => handleOpenFaqModal()}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition text-sm font-medium"
              >
                + Add FAQ
              </button>
            </div>

            {/* Category Filter */}
            <div className="p-4 border-b">
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setSelectedCategory('all')}
                  className={`px-3 py-1 text-xs rounded-full transition ${
                    selectedCategory === 'all'
                      ? 'bg-purple-600 text-white'
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
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {category}
                  </button>
                ))}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Question
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Category
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Order
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {faqs
                    .filter(faq => selectedCategory === 'all' || faq.category === selectedCategory)
                    .map((faq) => (
                      <tr key={faq.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm text-gray-900">
                          <div className="max-w-md">
                            <p className="font-medium">{faq.question}</p>
                            <p className="text-gray-500 mt-1 line-clamp-2">{faq.answer}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {faq.category ? (
                            <span className="px-2 py-1 text-xs bg-purple-100 text-purple-700 rounded">
                              {faq.category}
                            </span>
                          ) : (
                            '-'
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {faq.order}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <button
                            onClick={() => handleTogglePublish(faq)}
                            className={`px-2 py-1 text-xs rounded-full ${
                              faq.isPublished
                                ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                          >
                            {faq.isPublished ? 'Published' : 'Draft'}
                          </button>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                          <button
                            onClick={() => handleOpenFaqModal(faq)}
                            className="text-purple-600 hover:text-purple-900"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteFaq(faq.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
              {faqs.filter(faq => selectedCategory === 'all' || faq.category === selectedCategory).length === 0 && (
                <div className="text-center py-12">
                  <p className="text-gray-500 text-sm">No FAQs yet. Create your first FAQ.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create/Edit FAQ Modal */}
      {showFaqModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              {editingFaq ? 'Edit FAQ' : 'Create New FAQ'}
            </h2>
            <form onSubmit={handleSaveFaq} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Question *</label>
                <input
                  type="text"
                  value={faqQuestion}
                  onChange={(e) => setFaqQuestion(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                  placeholder="How do I reset my password?"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Answer *</label>
                <textarea
                  value={faqAnswer}
                  onChange={(e) => setFaqAnswer(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none resize-none"
                  rows={6}
                  placeholder="To reset your password, click on..."
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <input
                    type="text"
                    value={faqCategory}
                    onChange={(e) => setFaqCategory(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                    placeholder="Account, Billing, Support..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Display Order</label>
                  <input
                    type="number"
                    value={faqOrder}
                    onChange={(e) => setFaqOrder(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                    min="0"
                  />
                </div>
              </div>

              <div>
                <label className="flex items-center text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={faqIsPublished}
                    onChange={(e) => setFaqIsPublished(e.target.checked)}
                    className="mr-2"
                  />
                  Publish this FAQ (visible to customers)
                </label>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={handleCloseFaqModal}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingFaq}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition disabled:opacity-50"
                >
                  {isCreatingFaq ? 'Saving...' : editingFaq ? 'Update FAQ' : 'Create FAQ'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create User Modal */}
      {showUserModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Create New User</h2>
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password (leave empty for auto-generated)
                </label>
                <input
                  type="password"
                  value={newUserPassword}
                  onChange={(e) => setNewUserPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                  placeholder="Auto-generated if empty"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                <select
                  value={newUserRole}
                  onChange={(e) => setNewUserRole(e.target.value as any)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                >
                  <option value="CUSTOMER">Customer</option>
                  <option value="AGENT">Agent</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>

              {newUserRole === 'CUSTOMER' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Customer Organization
                  </label>
                  <select
                    value={newUserCustomerId}
                    onChange={(e) => setNewUserCustomerId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                  >
                    <option value="">Select a customer (optional)</option>
                    {customers.map((customer) => (
                      <option key={customer.id} value={customer.id}>
                        {customer.name}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    Assign this user to a customer organization
                  </p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tags</label>
                <input
                  type="text"
                  value={newUserTags}
                  onChange={(e) => setNewUserTags(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                  placeholder="vip, enterprise, priority (comma-separated)"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Add tags separated by commas (e.g., vip, enterprise)
                </p>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowUserModal(false);
                    setNewUserEmail('');
                    setNewUserName('');
                    setNewUserPassword('');
                    setNewUserRole('CUSTOMER');
                    setNewUserCustomerId('');
                    setNewUserTags('');
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingUser}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition disabled:opacity-50"
                >
                  {isCreatingUser ? 'Creating...' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Customer Modal */}
      {showCustomerModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Create New Customer</h2>
            <form onSubmit={handleCreateCustomer} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                <input
                  type="text"
                  value={newCustomerName}
                  onChange={(e) => setNewCustomerName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                  placeholder="Acme Corporation"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Domain</label>
                <input
                  type="text"
                  value={newCustomerDomain}
                  onChange={(e) => setNewCustomerDomain(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                  placeholder="acme.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email Connector</label>
                <input
                  type="email"
                  value={newCustomerEmailConnector}
                  onChange={(e) => setNewCustomerEmailConnector(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                  placeholder="acmesupport@mydomain.com"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Emails sent to this address will create tickets under this customer
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={newCustomerDescription}
                  onChange={(e) => setNewCustomerDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none resize-none"
                  rows={3}
                  placeholder="A leading provider of industrial solutions"
                />
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowCustomerModal(false);
                    setNewCustomerName('');
                    setNewCustomerDomain('');
                    setNewCustomerDescription('');
                    setNewCustomerEmailConnector('');
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingCustomer}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition disabled:opacity-50"
                >
                  {isCreatingCustomer ? 'Creating...' : 'Create Customer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}

export default App;
