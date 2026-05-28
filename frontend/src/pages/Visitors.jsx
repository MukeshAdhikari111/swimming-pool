import { useState, useEffect } from 'react';
import api from '../api';
import Swal from 'sweetalert2';
import { CreditCard, Download, LogOut, Pencil, Printer, Search, Trash2 } from 'lucide-react';
import './Visitors.css';

const Visitors = () => {
  const [visitors, setVisitors] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [page, setPage] = useState(1);
  const pageSize = 8;

  const fetchVisitors = async () => {
    try {
      const res = await api.get('/visitors');
      setVisitors(res.data);
    } catch (error) {
      console.error('Error fetching visitors', error);
    }
  };

  useEffect(() => {
    fetchVisitors();
    const timer = setInterval(fetchVisitors, 5000);
    return () => clearInterval(timer);
  }, []);

  const handleExit = async (id) => {
    try {
      await api.put(`/visitors/exit/${id}`);
      Swal.fire({
        icon: 'success',
        title: 'Exit Time Recorded',
        background: '#0f172a',
        color: '#fff',
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000
      });
      fetchVisitors();
    } catch (error) {
      console.error('Error updating exit time', error);
    }
  };

  const handlePayment = async (id) => {
    const result = await Swal.fire({
      title: 'Confirm Payment',
      text: "Are you sure you want to mark this visitor's payment as PAID?",
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#10b981',
      cancelButtonColor: '#ef4444',
      confirmButtonText: 'Yes, Paid!',
      background: '#0f172a',
      color: '#fff'
    });

    if (result.isConfirmed) {
      try {
        await api.put(`/visitors/pay/${id}`);
        Swal.fire({
          icon: 'success',
          title: 'Payment Status Updated',
          background: '#0f172a',
          color: '#fff',
          toast: true,
          position: 'top-end',
          showConfirmButton: false,
          timer: 3000
        });
        fetchVisitors();
      } catch (error) {
        console.error('Error updating payment status', error);
        Swal.fire({
          icon: 'error',
          title: 'Payment Failed',
          text: 'Failed to update payment status.',
          background: '#0f172a',
          color: '#fff'
        });
      }
    }
  };

  const formatLocalDateTime = (value) => {
    if (!value) return '';
    const date = new Date(value);
    const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return offsetDate.toISOString().slice(0, 16);
  };

  const escapeInputValue = (value = '') => String(value)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  const handleEdit = async (visitor) => {
    const result = await Swal.fire({
      title: 'Edit Visitor',
      html: `
        <div class="visitor-edit-form">
          <label>Name</label>
          <input id="visitor-name" class="swal2-input visitor-edit-input" value="${escapeInputValue(visitor.name)}">
          <label>Phone</label>
          <input id="visitor-phone" class="swal2-input visitor-edit-input" value="${escapeInputValue(visitor.phone)}">
          <label>Type</label>
          <select id="visitor-type" class="swal2-select visitor-edit-input">
            <option value="Adult" ${visitor.type === 'Adult' ? 'selected' : ''}>Adult</option>
            <option value="Child" ${visitor.type === 'Child' ? 'selected' : ''}>Child</option>
          </select>
          <label>Ticket Price</label>
          <input id="visitor-price" type="number" min="0" class="swal2-input visitor-edit-input" value="${visitor.ticket_price || 0}">
          <label>Payment Status</label>
          <select id="visitor-payment" class="swal2-select visitor-edit-input">
            <option value="Paid" ${visitor.payment_status === 'Paid' ? 'selected' : ''}>Paid</option>
            <option value="Pending" ${visitor.payment_status === 'Pending' ? 'selected' : ''}>Pending</option>
          </select>
          <label>Locker Number</label>
          <input id="visitor-locker" class="swal2-input visitor-edit-input" value="${escapeInputValue(visitor.locker_number)}">
          <label>Exit Time</label>
          <input id="visitor-exit" type="datetime-local" class="swal2-input visitor-edit-input" value="${formatLocalDateTime(visitor.exit_time)}">
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Save Changes',
      confirmButtonColor: '#3b82f6',
      cancelButtonColor: '#64748b',
      background: '#0f172a',
      color: '#fff',
      focusConfirm: false,
      preConfirm: () => {
        const name = document.getElementById('visitor-name').value.trim();
        const ticketPrice = document.getElementById('visitor-price').value;

        if (!name) {
          Swal.showValidationMessage('Name is required');
          return false;
        }

        if (ticketPrice === '' || Number(ticketPrice) < 0) {
          Swal.showValidationMessage('Ticket price must be 0 or higher');
          return false;
        }

        return {
          name,
          phone: document.getElementById('visitor-phone').value.trim(),
          type: document.getElementById('visitor-type').value,
          ticket_price: Number(ticketPrice),
          payment_status: document.getElementById('visitor-payment').value,
          locker_number: document.getElementById('visitor-locker').value.trim(),
          exit_time: document.getElementById('visitor-exit').value || null
        };
      }
    });

    if (result.isConfirmed) {
      try {
        await api.put(`/visitors/${visitor.id}`, result.value);
        Swal.fire({
          icon: 'success',
          title: 'Visitor Updated',
          background: '#0f172a',
          color: '#fff',
          toast: true,
          position: 'top-end',
          showConfirmButton: false,
          timer: 2500
        });
        fetchVisitors();
      } catch (error) {
        console.error('Error editing visitor', error);
        Swal.fire({
          icon: 'error',
          title: 'Update Failed',
          text: 'Failed to update visitor details.',
          background: '#0f172a',
          color: '#fff'
        });
      }
    }
  };

  const filteredVisitors = visitors.filter(v => 
    (v.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (v.phone && v.phone.includes(searchTerm))) &&
    (statusFilter === 'All' ||
      (statusFilter === 'Active' && !v.exit_time) ||
      (statusFilter === 'Completed' && v.exit_time) ||
      v.payment_status === statusFilter)
  );
  const totalPages = Math.max(1, Math.ceil(filteredVisitors.length / pageSize));
  const paginatedVisitors = filteredVisitors.slice((page - 1) * pageSize, page * pageSize);

  const printTicket = (visitor) => {
    window.open(`${api.defaults.baseURL}/tickets/${visitor.id}/download?inline=1`, '_blank');
  };

  const downloadTicket = (visitor) => {
    window.open(`${api.defaults.baseURL}/tickets/${visitor.id}/download`, '_blank');
  };

  const handleDelete = async (visitor) => {
    const result = await Swal.fire({
      title: 'Delete Visitor',
      text: `Delete ${visitor.name} and their ticket record?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Delete',
      confirmButtonColor: '#ef4444',
      background: '#ffffff',
      color: '#0f172a'
    });

    if (!result.isConfirmed) return;

    try {
      await api.delete(`/visitors/${visitor.id}`);
      Swal.fire({
        icon: 'success',
        title: 'Visitor Deleted',
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 2000
      });
      fetchVisitors();
    } catch (error) {
      console.error('Error deleting visitor', error);
      Swal.fire({ icon: 'error', title: 'Delete Failed', text: 'Could not delete this visitor.' });
    }
  };

  return (
    <div className="visitors-container">
      <header className="page-header flex-between">
        <div>
          <h1 className="page-title">Visitor History</h1>
          <p className="page-subtitle">Search, filter, edit, exit, pay, and print tickets from one table.</p>
        </div>
        
        <div className="visitor-tools">
          <div className="search-bar">
            <Search className="search-icon" size={18} />
            <input 
              type="text" 
              placeholder="Search name or phone" 
              className="input-field pl-10"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <select className="input-field visitor-filter" value={statusFilter} onChange={(event) => {
            setStatusFilter(event.target.value);
            setPage(1);
          }}>
            <option value="All">All</option>
            <option value="Active">Active</option>
            <option value="Completed">Completed</option>
            <option value="Paid">Paid</option>
            <option value="Pending">Pending</option>
          </select>
        </div>
      </header>

      <div className="table-container">
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Entry</th>
                <th>Exit</th>
                <th>Payment</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedVisitors.map(visitor => (
                <tr key={visitor.id}>
                  <td>
                    <strong>{visitor.name}</strong>
                    <span className="table-subtext">{visitor.ticket_id || visitor.phone || visitor.type}</span>
                  </td>
                  <td>{new Date(visitor.entry_time).toLocaleTimeString()}</td>
                  <td>{visitor.exit_time ? new Date(visitor.exit_time).toLocaleTimeString() : <span className="text-warning font-semibold">Active</span>}</td>
                  <td>
                    <span className={`status-badge ${visitor.payment_status === 'Paid' ? 'status-paid' : 'status-pending'}`}>
                      {visitor.payment_status}
                    </span>
                  </td>
                  <td>{visitor.exit_time ? 'Completed' : 'Active'}</td>
                  <td>
                    <div className="row-actions">
                      <button className="btn btn-sm btn-secondary btn-edit" onClick={() => handleEdit(visitor)}>
                        <Pencil size={14} /> Edit
                      </button>
                      {visitor.payment_status === 'Pending' && (
                        <button className="btn btn-sm btn-secondary" style={{ background: '#10b981', boxShadow: 'none' }} onClick={() => handlePayment(visitor.id)}>
                          <CreditCard size={14} /> Mark Paid
                        </button>
                      )}
                      {!visitor.exit_time && (
                        <button className="btn btn-sm btn-secondary" style={{ background: 'var(--primary)', boxShadow: 'none' }} onClick={() => handleExit(visitor.id)}>
                          <LogOut size={14} /> Mark Exit
                        </button>
                      )}
                      <button className="btn btn-sm btn-quiet" onClick={() => downloadTicket(visitor)}>
                        <Download size={14} /> Download
                      </button>
                      <button className="btn btn-sm btn-quiet" onClick={() => printTicket(visitor)}>
                        <Printer size={14} /> Print Ticket
                      </button>
                      <button className="btn btn-sm btn-danger" onClick={() => handleDelete(visitor)}>
                        <Trash2 size={14} /> Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              
              {filteredVisitors.length === 0 && (
                <tr>
                  <td colSpan="6" className="text-center py-8 text-muted">No visitors found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="pagination-row">
          <span>{filteredVisitors.length} records</span>
          <div>
            <button className="btn btn-sm btn-quiet" disabled={page === 1} onClick={() => setPage(page - 1)}>Prev</button>
            <span>Page {page} of {totalPages}</span>
            <button className="btn btn-sm btn-quiet" disabled={page === totalPages} onClick={() => setPage(page + 1)}>Next</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Visitors;
