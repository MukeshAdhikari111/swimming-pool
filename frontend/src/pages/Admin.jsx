import { useEffect, useState } from 'react';
import { Activity, Database, Settings, SquareCheckBig, Users } from 'lucide-react';
import api from '../api';
import './Admin.css';

const defaultOverview = {
  database: { mode: 'Checking', connected: false, database: '', host: '', port: '' },
  totals: {
    visitors: 0,
    active_swimmers: 0,
    paid_tickets: 0,
    pending_payments: 0,
    ticket_revenue: 0,
    tasks: 0
  }
};

const Admin = () => {
  const [overview, setOverview] = useState(defaultOverview);
  const [loading, setLoading] = useState(true);

  const fetchOverview = async () => {
    try {
      const response = await api.get('/admin/overview');
      setOverview(response.data);
    } catch (error) {
      console.error('Error loading admin overview', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview();
    const timer = setInterval(fetchOverview, 5000);
    return () => clearInterval(timer);
  }, []);

  const { database, totals } = overview;
  const cards = [
    { label: 'Visitors', value: totals.visitors, icon: Users },
    { label: 'Active Swimmers', value: totals.active_swimmers, icon: Activity },
    { label: 'Paid Tickets', value: totals.paid_tickets, icon: SquareCheckBig },
    { label: 'Pending Payments', value: totals.pending_payments, icon: Settings },
    { label: 'Ticket Revenue', value: `NPR ${Number(totals.ticket_revenue || 0).toLocaleString()}`, icon: Database },
    { label: 'Tasks', value: totals.tasks, icon: SquareCheckBig }
  ];

  return (
    <div className="admin-container">
      <header className="page-header admin-header">
        <div>
          <h1 className="page-title">Admin</h1>
          <p className="page-subtitle">System overview, database status, and live pool totals.</p>
        </div>
        <div className={`connection-pill ${database.connected ? 'connected' : 'offline'}`}>
          <Database size={18} />
          <span>{database.mode}</span>
        </div>
      </header>

      <section className="admin-metrics-grid">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <article className="admin-metric" key={card.label}>
              <div className="admin-metric-icon">
                <Icon size={22} />
              </div>
              <div>
                <h3>{card.label}</h3>
                <p>{loading ? '-' : card.value}</p>
              </div>
            </article>
          );
        })}
      </section>
    </div>
  );
};

export default Admin;
