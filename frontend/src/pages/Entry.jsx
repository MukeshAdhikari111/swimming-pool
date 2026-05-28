import { useEffect, useState } from 'react';
import api from '../api';
import Swal from 'sweetalert2';
import { Clock, Download, KeyRound, Phone, Printer, Ticket, User } from 'lucide-react';
import './Entry.css';

const Entry = () => {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    type: 'Adult',
    ticket_price: 300,
    payment_status: 'Paid',
    locker_number: ''
  });
  const [receipt, setReceipt] = useState(null);
  const [now, setNow] = useState(new Date());
  const [pricing, setPricing] = useState({ Adult: 300, Child: 150 });

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const fetchPricing = async () => {
      try {
        const response = await api.get('/settings/pricing');
        const nextPricing = {
          Adult: Number(response.data.adult_price || 300),
          Child: Number(response.data.child_price || 150)
        };
        setPricing(nextPricing);
        setFormData((current) => ({ ...current, ticket_price: nextPricing[current.type] || current.ticket_price }));
      } catch (error) {
        console.error('Error loading ticket pricing', error);
      }
    };
    fetchPricing();
  }, []);

  const currentTime = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  const handleChange = (e) => {
    const { name, value } = e.target;
    let price = formData.ticket_price;
    if (name === 'type') {
      price = pricing[value] || price;
    }
    setFormData({ ...formData, [name]: value, ...(name === 'type' ? { ticket_price: price } : {}) });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const lockerNumber = formData.locker_number;
    try {
      const res = await api.post('/visitors/entry', formData);
      setReceipt({ ...res.data, locker_number: lockerNumber });
      Swal.fire({
        icon: 'success',
        title: 'Ticket Generated',
        background: '#ffffff',
        color: '#0f172a',
        confirmButtonColor: '#06b6d4'
      });
      setFormData({
        name: '',
        phone: '',
        type: 'Adult',
        ticket_price: 300,
        payment_status: 'Paid',
        locker_number: ''
      });
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: 'Entry Failed',
        text: 'Something went wrong while generating the ticket.',
        background: '#ffffff',
        color: '#0f172a'
      });
    }
  };

  const printReceipt = () => {
    window.open(`${api.defaults.baseURL}/tickets/${receipt.id}/download?inline=1`, '_blank');
  };

  const downloadReceipt = () => {
    window.open(`${api.defaults.baseURL}/tickets/${receipt.id}/download`, '_blank');
  };

  return (
    <div className="entry-container">
      <header className="page-header">
        <h1 className="page-title">Visitors Entry</h1>
        <p className="page-subtitle">Large controls, automatic time, and one clear ticket action for rush hours.</p>
      </header>

      <div className="entry-grid">
        <div className="form-section entry-form-card">
          <div className="entry-toolbar">
            <div>
              <h2>Fast Entry Form</h2>
              <p>Staff should finish this in 10-15 seconds.</p>
            </div>
            <div className="entry-clock">
              <Clock size={18} />
              {currentTime}
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Name</label>
              <div className="input-with-icon">
                <User className="input-icon" size={18} />
                <input type="text" name="name" className="input-field pl-10 entry-input" value={formData.name} onChange={handleChange} required placeholder="Visitor name" autoFocus />
              </div>
            </div>

            <div className="form-group">
              <label>Phone</label>
              <div className="input-with-icon">
                <Phone className="input-icon" size={18} />
                <input type="text" name="phone" className="input-field pl-10 entry-input" value={formData.phone} onChange={handleChange} placeholder="Optional phone number" />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Ticket Type</label>
                <select name="type" className="input-field" value={formData.type} onChange={handleChange}>
                  <option value="Adult">Adult</option>
                  <option value="Child">Child</option>
                </select>
              </div>

              <div className="form-group">
                <label>Entry Time</label>
                <input className="input-field bg-disabled" value={currentTime} readOnly />
              </div>
            </div>

            <div className="form-group">
              <label>Ticket Price (NPR)</label>
              <input
                type="number"
                name="ticket_price"
                className="input-field"
                value={formData.ticket_price}
                onChange={handleChange}
                min="0"
                required
                placeholder="Set the ticket price"
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Locker Number</label>
                <div className="input-with-icon">
                  <KeyRound className="input-icon" size={18} />
                  <input type="text" name="locker_number" className="input-field pl-10" value={formData.locker_number} onChange={handleChange} placeholder="e.g. 18" />
                </div>
              </div>

              <div className="form-group">
                <label>Payment Status</label>
                <select name="payment_status" className="input-field" value={formData.payment_status} onChange={handleChange}>
                  <option value="Paid">Paid</option>
                  <option value="Pending">Pending</option>
                </select>
              </div>
            </div>

            <div className="entry-total">
              <span>Ticket Total</span>
              <strong>NPR {formData.ticket_price}</strong>
            </div>

            <button type="submit" className="btn btn-primary w-full generate-ticket-btn">
              <Ticket size={20} /> Generate Ticket
            </button>
          </form>
        </div>

        {receipt && (
          <div className="receipt-section">
            <h2>Generated Ticket</h2>
            <div className="receipt-ticket">
              <div className="receipt-header">
                <h3>US Amusement Park Ticket</h3>
              </div>
              <div className="receipt-body">
                <div className="r-row"><span>Name:</span> <strong>{receipt.name}</strong></div>
                <div className="r-row"><span>Ticket ID:</span> <strong>{receipt.ticket_id}</strong></div>
                <div className="r-row"><span>Date:</span> <strong>{new Date(receipt.entry_time).toLocaleDateString()}</strong></div>
                <div className="r-row"><span>Time:</span> <strong>{new Date(receipt.entry_time).toLocaleTimeString()}</strong></div>
                <div className="r-row"><span>Type:</span> <strong>{receipt.type}</strong></div>
                <div className="r-row"><span>Locker:</span> <strong>{receipt.locker_number || '-'}</strong></div>
                <div className="r-divider"></div>
                <div className="r-row"><span>Amount:</span> <strong>NPR {receipt.ticket_price}</strong></div>
                <div className="r-row"><span>Payment:</span> <span className={`status-badge ${receipt.payment_status === 'Paid' ? 'status-paid' : 'status-pending'}`}>{receipt.payment_status}</span></div>
              </div>
              <div className="receipt-footer">Thank you for visiting!</div>
            </div>

            <div className="receipt-actions">
              <button className="btn btn-primary w-full" onClick={downloadReceipt}>
                <Download size={18} /> Download PDF
              </button>
              <button className="btn btn-secondary w-full" onClick={printReceipt}>
                <Printer size={18} /> Print Ticket
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Entry;
