import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../hooks/useSocket';
import { api } from '../lib/api';
import { Ticket, PaginatedResponse } from '../types';
import { formatDistance } from 'date-fns';

export default function Dashboard() {
  const { user, logout } = useAuth();
  const { isConnected, on, off } = useSocket();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [filter, setFilter] = useState<string>('all');

  // Create ticket form
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newPriority, setNewPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'>('MEDIUM');
  const [isCreating, setIsCreating] = useState(false);

  // Add comment form
  const [newComment, setNewComment] = useState('');
  const [isAddingComment, setIsAddingComment] = useState(false);

  useEffect(() => {
    loadTickets();
  }, [filter]);

  useEffect(() => {
    // Listen for real-time updates
    const handleTicketCreated = (ticket: Ticket) => {
      setTickets((prev) => [ticket, ...prev]);
    };

    const handleTicketUpdated = (ticket: Ticket) => {
      setTickets((prev) => prev.map((t) => (t.id === ticket.id ? ticket : t)));
      if (selectedTicket?.id === ticket.id) {
        setSelectedTicket(ticket);
      }
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

  const handleTicketClick = async (ticketId: string) => {
    try {
      const response = await api.get<Ticket>(`/tickets/${ticketId}`);
      setSelectedTicket(response.data);
    } catch (error) {
      console.error('Failed to load ticket:', error);
    }
  };

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);

    try {
      await api.post('/tickets', {
        title: newTitle,
        description: newDescription,
        priority: newPriority,
      });

      setShowCreateModal(false);
      setNewTitle('');
      setNewDescription('');
      setNewPriority('MEDIUM');
      loadTickets();
    } catch (error) {
      console.error('Failed to create ticket:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !newComment.trim()) return;

    setIsAddingComment(true);
    try {
      await api.post(`/tickets/${selectedTicket.id}/comments`, {
        content: newComment,
        isInternal: false,
      });

      setNewComment('');
      handleTicketClick(selectedTicket.id); // Reload ticket to get new comments
    } catch (error) {
      console.error('Failed to add comment:', error);
    } finally {
      setIsAddingComment(false);
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
              <h1 className="text-2xl font-bold text-gray-900">My Tickets</h1>
              {isConnected && (
                <span className="flex items-center text-sm text-green-600">
                  <span className="w-2 h-2 bg-green-600 rounded-full mr-2"></span>
                  Live
                </span>
              )}
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition text-sm font-medium"
              >
                + New Ticket
              </button>
              <span className="text-sm text-gray-600">{user?.name}</span>
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

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Ticket List */}
          <div className="lg:col-span-1 bg-white rounded-lg shadow">
            <div className="p-4 border-b">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Your Tickets</h2>
              <div className="flex space-x-2">
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
          <div className="lg:col-span-2 bg-white rounded-lg shadow">
            {selectedTicket ? (
              <div className="p-6">
                <div className="flex items-start justify-between mb-6">
                  <div className="flex-1">
                    <h2 className="text-2xl font-bold text-gray-900">{selectedTicket.title}</h2>
                    <p className="text-sm text-gray-600 mt-1">
                      Created {formatDistance(new Date(selectedTicket.createdAt), new Date(), { addSuffix: true })}
                    </p>
                  </div>
                  <div className="flex space-x-2">
                    <span className={`text-sm px-3 py-1 rounded ${getPriorityColor(selectedTicket.priority)}`}>
                      {selectedTicket.priority}
                    </span>
                    <span className={`text-sm px-3 py-1 rounded ${getStatusColor(selectedTicket.status)}`}>
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
                              {comment.author?.id === user?.id && ' (You)'}
                            </span>
                            <span className="text-xs text-gray-500">
                              {formatDistance(new Date(comment.createdAt), new Date(), { addSuffix: true })}
                            </span>
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
      </div>

      {/* Create Ticket Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Create New Ticket</h2>
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
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                  rows={5}
                  placeholder="Detailed description of your issue..."
                  required
                />
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

              <div className="flex space-x-3 pt-4">
                <button
                  type="submit"
                  disabled={isCreating}
                  className="flex-1 bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 transition disabled:opacity-50 font-medium"
                >
                  {isCreating ? 'Creating...' : 'Create Ticket'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300 transition font-medium"
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
