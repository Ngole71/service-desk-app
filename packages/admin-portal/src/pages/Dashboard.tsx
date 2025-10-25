import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../hooks/useSocket';
import api from '../lib/api';
import { Ticket, TicketStats, PaginatedResponse, User } from '../types';
import { formatDistance } from 'date-fns';

export default function Dashboard() {
  const { user, logout } = useAuth();
  const { isConnected, on, off } = useSocket();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [stats, setStats] = useState<TicketStats | null>(null);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [agents, setAgents] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [commentText, setCommentText] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  useEffect(() => {
    loadTickets();
    loadStats();
    loadAgents();
  }, [filter]);

  useEffect(() => {
    // Listen for real-time updates
    const handleTicketCreated = (ticket: Ticket) => {
      setTickets((prev) => [ticket, ...prev]);
      loadStats();
    };

    const handleTicketUpdated = (ticket: Ticket) => {
      setTickets((prev) => prev.map((t) => (t.id === ticket.id ? ticket : t)));
      if (selectedTicket?.id === ticket.id) {
        setSelectedTicket(ticket);
      }
      loadStats();
    };

    on('ticket:created', handleTicketCreated);
    on('ticket:updated', handleTicketUpdated);

    return () => {
      off('ticket:created', handleTicketCreated);
      off('ticket:updated', handleTicketUpdated);
    };
  }, [on, off, selectedTicket]);

  const loadTickets = async () => {
    try {
      const params: any = {};
      if (filter !== 'all') {
        params.status = filter.toUpperCase();
      }

      const response = await api.get<PaginatedResponse<Ticket>>('/tickets', { params });
      setTickets(response.data.data);
    } catch (error) {
      console.error('Failed to load tickets:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await api.get<TicketStats>('/tickets/stats');
      setStats(response.data);
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  const loadAgents = async () => {
    try {
      // In a real app, you'd have an endpoint to get agents
      // For now, we'll just use the current user
      setAgents([user!]);
    } catch (error) {
      console.error('Failed to load agents:', error);
    }
  };

  const handleTicketClick = async (ticketId: string) => {
    try {
      const response = await api.get<Ticket>(`/tickets/${ticketId}`);
      setSelectedTicket(response.data);
    } catch (error) {
      console.error('Failed to load ticket:', error);
    }
  };

  const handleStatusChange = async (ticketId: string, status: string) => {
    try {
      await api.patch(`/tickets/${ticketId}`, { status });
      loadTickets();
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  };

  const handleAssignTicket = async (ticketId: string, assigneeId: string) => {
    try {
      await api.patch(`/tickets/${ticketId}/assign/${assigneeId}`);
      loadTickets();
    } catch (error) {
      console.error('Failed to assign ticket:', error);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !commentText.trim()) return;

    setIsSubmittingComment(true);
    try {
      await api.post(`/tickets/${selectedTicket.id}/comments`, {
        content: commentText,
        isInternal: isInternal,
      });

      // Clear form
      setCommentText('');
      setIsInternal(false);

      // Reload ticket to get updated comments
      const response = await api.get<Ticket>(`/tickets/${selectedTicket.id}`);
      setSelectedTicket(response.data);
      loadTickets(); // Refresh list
    } catch (error) {
      console.error('Failed to add comment:', error);
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'URGENT': return 'text-red-700 bg-red-100';
      case 'HIGH': return 'text-orange-700 bg-orange-100';
      case 'MEDIUM': return 'text-yellow-700 bg-yellow-100';
      case 'LOW': return 'text-green-700 bg-green-100';
      default: return 'text-gray-700 bg-gray-100';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'OPEN': return 'text-blue-700 bg-blue-100';
      case 'IN_PROGRESS': return 'text-purple-700 bg-purple-100';
      case 'WAITING': return 'text-yellow-700 bg-yellow-100';
      case 'CLOSED': return 'text-gray-700 bg-gray-100';
      default: return 'text-gray-700 bg-gray-100';
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold text-gray-900">Support Dashboard</h1>
              {isConnected && (
                <span className="flex items-center text-sm text-green-600">
                  <span className="w-2 h-2 bg-green-600 rounded-full mr-2"></span>
                  Live
                </span>
              )}
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                {user?.name} ({user?.role})
              </span>
              <button
                onClick={logout}
                className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Stats */}
      {stats && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="bg-white rounded-lg shadow p-4">
              <p className="text-sm text-gray-600">Total Tickets</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
            <div className="bg-blue-50 rounded-lg shadow p-4">
              <p className="text-sm text-blue-600">Open</p>
              <p className="text-2xl font-bold text-blue-900">{stats.byStatus.open}</p>
            </div>
            <div className="bg-purple-50 rounded-lg shadow p-4">
              <p className="text-sm text-purple-600">In Progress</p>
              <p className="text-2xl font-bold text-purple-900">{stats.byStatus.inProgress}</p>
            </div>
            <div className="bg-yellow-50 rounded-lg shadow p-4">
              <p className="text-sm text-yellow-600">Waiting</p>
              <p className="text-2xl font-bold text-yellow-900">{stats.byStatus.waiting}</p>
            </div>
            <div className="bg-gray-50 rounded-lg shadow p-4">
              <p className="text-sm text-gray-600">Closed</p>
              <p className="text-2xl font-bold text-gray-900">{stats.byStatus.closed}</p>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Ticket List */}
          <div className="lg:col-span-1 bg-white rounded-lg shadow">
            <div className="p-4 border-b">
              <h2 className="text-lg font-semibold text-gray-900">Tickets</h2>
              <div className="mt-2 flex space-x-2">
                {['all', 'open', 'in_progress', 'waiting', 'closed'].map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`px-3 py-1 text-xs rounded-full transition ${
                      filter === f
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {f.replace('_', ' ')}
                  </button>
                ))}
              </div>
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
                  <div className="flex items-start justify-between">
                    <h3 className="font-medium text-gray-900 text-sm">{ticket.title}</h3>
                    <span className={`text-xs px-2 py-1 rounded ${getPriorityColor(ticket.priority)}`}>
                      {ticket.priority}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 mt-1">{ticket.creator?.name || 'Unknown'}</p>
                  <div className="flex items-center justify-between mt-2">
                    <span className={`text-xs px-2 py-1 rounded ${getStatusColor(ticket.status)}`}>
                      {ticket.status.replace('_', ' ')}
                    </span>
                    <span className="text-xs text-gray-500">
                      {formatDistance(new Date(ticket.createdAt), new Date(), { addSuffix: true })}
                    </span>
                  </div>
                </div>
              ))}

              {tickets.length === 0 && (
                <div className="p-8 text-center text-gray-500">
                  No tickets found
                </div>
              )}
            </div>
          </div>

          {/* Ticket Detail */}
          <div className="lg:col-span-2 bg-white rounded-lg shadow">
            {selectedTicket ? (
              <div className="p-6">
                <div className="flex items-start justify-between mb-6">
                  <div className="flex-1">
                    <h2 className="text-2xl font-bold text-gray-900">{selectedTicket.title}</h2>
                    <p className="text-sm text-gray-600 mt-1">
                      Created by {selectedTicket.creator?.name} •{' '}
                      {formatDistance(new Date(selectedTicket.createdAt), new Date(), { addSuffix: true })}
                    </p>
                  </div>
                  <span className={`text-sm px-3 py-1 rounded ${getPriorityColor(selectedTicket.priority)}`}>
                    {selectedTicket.priority}
                  </span>
                </div>

                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Description</h3>
                  <p className="text-gray-700 whitespace-pre-wrap">{selectedTicket.description}</p>
                </div>

                {!selectedTicket.assigneeId && (
                  <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <p className="text-sm text-yellow-800">
                      ⚠️ An agent must be assigned to this ticket before any actions can be taken.
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                    <select
                      value={selectedTicket.status}
                      onChange={(e) => handleStatusChange(selectedTicket.id, e.target.value)}
                      disabled={!selectedTicket.assigneeId}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none disabled:bg-gray-100 disabled:cursor-not-allowed disabled:text-gray-500"
                    >
                      <option value="OPEN">Open</option>
                      <option value="IN_PROGRESS">In Progress</option>
                      <option value="WAITING">Waiting</option>
                      <option value="CLOSED">Closed</option>
                    </select>
                  </div>

                  {user?.role === 'ADMIN' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Assign To</label>
                      <select
                        value={selectedTicket.assigneeId || ''}
                        onChange={(e) => e.target.value && handleAssignTicket(selectedTicket.id, e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                      >
                        <option value="">Unassigned</option>
                        {agents.map((agent) => (
                          <option key={agent.id} value={agent.id}>
                            {agent.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                {selectedTicket.comments && selectedTicket.comments.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-sm font-semibold text-gray-700 mb-3">Comments</h3>
                    <div className="space-y-3">
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
                            </span>
                            {comment.isInternal && (
                              <span className="text-xs text-yellow-700 bg-yellow-100 px-2 py-1 rounded">
                                Internal
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-700">{comment.content}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            {formatDistance(new Date(comment.createdAt), new Date(), { addSuffix: true })}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Add Comment Form */}
                <div className="border-t pt-6">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Add Comment</h3>
                  <form onSubmit={handleAddComment}>
                    <div className="mb-3">
                      <textarea
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        disabled={!selectedTicket.assigneeId || isSubmittingComment}
                        placeholder={selectedTicket.assigneeId ? "Write your comment here..." : "Assign an agent first to enable commenting"}
                        rows={4}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none disabled:bg-gray-100 disabled:cursor-not-allowed resize-none"
                      />
                    </div>

                    {user?.role !== 'CUSTOMER' && (
                      <div className="mb-3">
                        <label className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={isInternal}
                            onChange={(e) => setIsInternal(e.target.checked)}
                            disabled={!selectedTicket.assigneeId || isSubmittingComment}
                            className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 disabled:cursor-not-allowed"
                          />
                          <span className="text-sm text-gray-700">Internal note (visible to agents and admins only)</span>
                        </label>
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={!selectedTicket.assigneeId || !commentText.trim() || isSubmittingComment}
                      className="w-full bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed font-medium"
                    >
                      {isSubmittingComment ? 'Adding Comment...' : 'Add Comment'}
                    </button>
                  </form>
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-500">
                Select a ticket to view details
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
