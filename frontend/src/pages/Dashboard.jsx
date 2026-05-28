import { useState, useEffect } from 'react';
import api from '../api';
import {
  AlertTriangle,
  CreditCard,
  ReceiptText,
  Ticket,
  Users,
  Waves,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid } from 'recharts';
import './Dashboard.css';

const fallbackWeekly = [
  { name: 'Mon', visitors: 42, revenue: 12400 },
  { name: 'Tue', visitors: 38, revenue: 10250 },
  { name: 'Wed', visitors: 56, revenue: 15800 },
  { name: 'Thu', visitors: 64, revenue: 18400 },
  { name: 'Fri', visitors: 72, revenue: 21900 },
  { name: 'Sat', visitors: 110, revenue: 33200 },
  { name: 'Sun', visitors: 96, revenue: 28600 },
];

const Dashboard = () => {
  const [stats, setStats] = useState({
    todayVisitors: 0,
    todayRevenue: 0,
    activeSwimmers: 0,
    monthlyIncome: 0,
    pendingPayments: 0,
    lowStockAlerts: 0,
    activeMembers: 0,
    poolCapacity: 120
  });

  const [chartData, setChartData] = useState(fallbackWeekly);
  const [recentVisitors, setRecentVisitors] = useState([]);
  const [percentages, setPercentages] = useState({
    dayVisitors: 0,
    dayRevenue: 0,
    weekVisitors: 0,
    monthRevenue: 0
  });

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const statsRes = await api.get('/dashboard');
        setStats((current) => ({ ...current, ...statsRes.data }));

        const analyticsRes = await api.get('/dashboard/analytics');
        setChartData(analyticsRes.data.weekly?.length ? analyticsRes.data.weekly : fallbackWeekly);
        setPercentages((current) => ({ ...current, ...analyticsRes.data.percentages }));

        const visitorsRes = await api.get('/visitors');
        setRecentVisitors(visitorsRes.data.slice(0, 5));

        const settingsRes = await api.get('/settings/pricing');
        setStats((current) => ({ ...current, poolCapacity: Number(settingsRes.data.pool_capacity || 120) }));
      } catch (error) {
        console.error('Error fetching dashboard stats or chart data', error);
      }
    };
    fetchDashboardData();
    const timer = setInterval(fetchDashboardData, 5000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="dashboard-container">
      <header className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Fast daily overview for front desk, tickets, and payments.</p>
        </div>
      </header>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon bg-primary-light">
            <Users size={22} />
          </div>
          <div className="stat-content">
            <h3>Today's Visitors</h3>
            <p className="stat-value">{stats.todayVisitors}</p>
            <span className={`stat-change ${percentages.dayVisitors >= 0 ? 'positive' : 'negative'}`}>
              {percentages.dayVisitors >= 0 ? '+' : ''}{percentages.dayVisitors}% vs yesterday
            </span>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon bg-secondary-light">
            <Ticket size={22} />
          </div>
          <div className="stat-content">
            <h3>Revenue</h3>
            <p className="stat-value">NPR {stats.todayRevenue}</p>
            <span className={`stat-change ${percentages.dayRevenue >= 0 ? 'positive' : 'negative'}`}>
              {percentages.dayRevenue >= 0 ? '+' : ''}{percentages.dayRevenue}% vs yesterday
            </span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon bg-capacity-light">
            <Waves size={22} />
          </div>
          <div className="stat-content">
            <h3>Pool Capacity</h3>
            <p className="stat-value">{stats.activeSwimmers}/{stats.poolCapacity}</p>
            <span className="stat-change neutral">Active swimmers now</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon bg-warning-light">
            <CreditCard size={22} />
          </div>
          <div className="stat-content">
            <h3>Pending Payments</h3>
            <p className="stat-value">{stats.pendingPayments}</p>
            <span className="stat-change warning">Need follow-up</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon bg-danger-light">
            <AlertTriangle size={22} />
          </div>
          <div className="stat-content">
            <h3>Unclosed Visits</h3>
            <p className="stat-value">{stats.activeSwimmers}</p>
            <span className="stat-change negative">Need exit time</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon bg-member-light">
            <ReceiptText size={22} />
          </div>
          <div className="stat-content">
            <h3>Monthly Revenue</h3>
            <p className="stat-value">{stats.activeMembers || stats.monthlyIncome || 0}</p>
            <span className="stat-change positive">Ticket income</span>
          </div>
        </div>
      </div>

      <div className="charts-section">
        <div className="chart-container">
          <div className="chart-heading">
            <h2>Weekly Visitors</h2>
            <span className={`chart-badge ${percentages.weekVisitors >= 0 ? 'positive' : 'negative'}`}>
              {percentages.weekVisitors >= 0 ? '+' : ''}{percentages.weekVisitors}% week
            </span>
          </div>
          <div style={{ height: 300, width: '100%' }}>
            <ResponsiveContainer>
              <BarChart data={chartData}>
                <XAxis dataKey="name" stroke="var(--text-muted)" />
                <YAxis stroke="var(--text-muted)" />
                <Tooltip cursor={{ fill: '#f1f5f9' }} contentStyle={{ backgroundColor: '#fff', border: '1px solid var(--glass-border)', borderRadius: '8px' }} />
                <Bar dataKey="visitors" fill="var(--primary)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="recent-activity">
          <div className="chart-heading">
            <h2>Live Pool Status</h2>
            <span className="chart-badge">{new Date().toLocaleTimeString()}</span>
          </div>
          <div className="activity-list">
            {recentVisitors.slice(0, 4).map((visitor) => (
              <div className="activity-item" key={visitor.id}>
                <span />
                <p>{visitor.name} - {visitor.payment_status} - {visitor.exit_time ? 'Exited' : 'Active'}</p>
              </div>
            ))}
            {recentVisitors.length === 0 && <p className="text-muted">No visitor activity yet.</p>}
          </div>
        </div>
      </div>

      <div className="dashboard-bottom-grid">
        <div className="chart-container trend-panel">
          <div className="chart-heading">
            <h2>Revenue Chart</h2>
            <span className="chart-badge positive">Simple weekly trend</span>
          </div>
          <div style={{ height: 260, width: '100%' }}>
            <ResponsiveContainer>
              <LineChart data={chartData}>
                <CartesianGrid stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="name" stroke="var(--text-muted)" />
                <YAxis stroke="var(--text-muted)" />
                <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid var(--glass-border)', borderRadius: '8px' }} />
                <Line type="monotone" dataKey="revenue" stroke="var(--primary)" strokeWidth={3} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="table-container dashboard-table">
          <div className="chart-heading">
            <h2>Visitor Table</h2>
            <a href="/app/visitors">View all</a>
          </div>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Entry</th>
                  <th>Exit</th>
                  <th>Payment</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {recentVisitors.map((visitor) => (
                  <tr key={visitor.id}>
                    <td className="font-semibold">{visitor.name}</td>
                    <td>{new Date(visitor.entry_time).toLocaleTimeString()}</td>
                    <td>{visitor.exit_time ? new Date(visitor.exit_time).toLocaleTimeString() : '-'}</td>
                    <td>
                      <span className={`status-badge ${visitor.payment_status === 'Paid' ? 'status-paid' : 'status-pending'}`}>
                        {visitor.payment_status}
                      </span>
                    </td>
                    <td>{visitor.exit_time ? 'Completed' : 'Active'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="chart-container analytics-panel">
        <div className="chart-heading">
          <h2>Analytics Snapshot</h2>
          <span className="chart-badge">Visitors and ticket revenue</span>
        </div>
        <div className="mini-analytics">
          <div><strong>{chartData.reduce((sum, day) => sum + Number(day.visitors || 0), 0)}</strong><span>Weekly visitors</span></div>
          <div><strong>NPR {chartData.reduce((sum, day) => sum + Number(day.revenue || 0), 0)}</strong><span>Weekly revenue</span></div>
          <div><strong>{stats.pendingPayments}</strong><span>Pending payments</span></div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
