import { useEffect, useState } from 'react';
import Swal from 'sweetalert2';
import { Save, SlidersHorizontal } from 'lucide-react';
import api from '../api';
import './Settings.css';

const Settings = () => {
  const [settings, setSettings] = useState({
    adult_price: 300,
    child_price: 150,
    pool_capacity: 120
  });

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const response = await api.get('/settings/pricing');
        setSettings(response.data);
      } catch (error) {
        console.error('Error loading settings', error);
      }
    };

    loadSettings();
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    const response = await api.put('/settings/pricing', settings);
    setSettings(response.data);
    Swal.fire({
      icon: 'success',
      title: 'Settings saved',
      toast: true,
      position: 'top-end',
      timer: 2000,
      showConfirmButton: false
    });
  };

  const setValue = (key, value) => {
    setSettings((current) => ({ ...current, [key]: Number(value) }));
  };

  return (
    <div className="settings-container">
      <header className="page-header">
        <h1 className="page-title">Settings</h1>
        <p className="page-subtitle">Pool capacity and default ticket prices.</p>
      </header>

      <form className="settings-panel" onSubmit={handleSubmit}>
        <div className="settings-heading">
          <SlidersHorizontal size={22} />
          <div>
            <h2>Pool Controls</h2>
            <p>These values are used by dashboard capacity and new ticket entries.</p>
          </div>
        </div>

        <label>Pool Capacity</label>
        <input className="input-field" type="number" min="1" value={settings.pool_capacity} onChange={(event) => setValue('pool_capacity', event.target.value)} />

        <label>Adult Ticket Price (NPR)</label>
        <input className="input-field" type="number" min="0" value={settings.adult_price} onChange={(event) => setValue('adult_price', event.target.value)} />

        <label>Child Ticket Price (NPR)</label>
        <input className="input-field" type="number" min="0" value={settings.child_price} onChange={(event) => setValue('child_price', event.target.value)} />

        <button className="btn btn-primary">
          <Save size={16} /> Save Settings
        </button>
      </form>
    </div>
  );
};

export default Settings;
