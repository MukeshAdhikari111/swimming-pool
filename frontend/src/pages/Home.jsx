import { Link } from 'react-router-dom';
import { Clock, Droplets, LockKeyhole, MapPin, ShieldCheck, Ticket, Users, Waves } from 'lucide-react';
import './Home.css';

const Home = () => (
  <main className="home-page">
    <section className="home-hero">
      <nav className="home-nav">
        <Link to="/" className="home-brand">
          <img src="/brand/us-amusement-logo.svg" alt="US Amusement Park logo" />
          <span>US Amusement Park</span>
        </Link>
        <Link className="home-login-link" to="/login">
          <LockKeyhole size={16} /> Management Login
        </Link>
      </nav>

      <div className="home-copy">
        <span className="home-pill"><Waves size={16} /> Swimming Pool Services</span>
        <h1>US Exhibition & Amusement Park Pvt. Ltd.</h1>
        <p>Enjoy clean swimming pool services, slides, family water fun, and fast digital ticketing at Lamki Chuha-1, Kailali.</p>
        <div className="home-location">
          <MapPin size={18} />
          <span>Lamki Chuha-1, Kailali</span>
        </div>
        <div className="home-actions">
          <a href="#services" className="home-primary">Explore Services</a>
          <Link to="/login" className="home-secondary"><Ticket size={16} /> Staff Login</Link>
        </div>
        <div className="home-quick-info">
          <span><Clock size={16} /> Daily pool operations</span>
          <span><ShieldCheck size={16} /> Staff-managed tickets</span>
          <span><MapPin size={16} /> Lamki Chuha-1, Kailali</span>
        </div>
      </div>
    </section>

    <section className="home-section home-intro">
      <div>
        <span className="section-kicker">Welcome</span>
        <h2>A clean, organized place for families to enjoy water, slides, and amusement activities.</h2>
      </div>
      <p>US Exhibition & Amusement Park Pvt. Ltd. provides swimming pool services with a modern private system for staff to handle visitor entry, payment status, barcode tickets, and daily operations.</p>
    </section>

    <section className="home-section" id="services">
      <div>
        <span className="section-kicker">Services</span>
        <h2>Swimming pool experience with a modern management system.</h2>
      </div>
      <div className="service-grid">
        <article>
          <Droplets size={24} />
          <h3>Swimming Pool</h3>
          <p>Clean water, family-friendly pool service, and organized daily entry operations.</p>
        </article>
        <article>
          <Waves size={24} />
          <h3>Pool & Slide</h3>
          <p>Fun water activities for children, families, and groups visiting the park.</p>
        </article>
        <article>
          <Ticket size={24} />
          <h3>Digital Ticketing</h3>
          <p>Private staff system with visitor entry, barcode PDF tickets, payments, and analytics.</p>
        </article>
      </div>
    </section>

    <section className="home-section home-guest-info">
      <div className="guest-panel">
        <Users size={26} />
        <h2>Built for visitors and staff.</h2>
        <p>Guests see a clean public website. Staff use a secure management login for tickets, pool capacity, visitor records, and tasks.</p>
      </div>
      <div className="guest-list">
        <div><strong>Public website</strong><span>Search-friendly company page with location and services.</span></div>
        <div><strong>Secure login</strong><span>Private access for authorized pool staff only.</span></div>
        <div><strong>Management product</strong><span>Visitor entry, PDF tickets, analytics, tasks, admin, and settings.</span></div>
      </div>
    </section>

    <section className="home-section home-management">
      <div>
        <span className="section-kicker">Management Product</span>
        <h2>Private swimming pool management dashboard.</h2>
        <p>Staff can log in to manage visitors, tickets, tasks, settings, analytics, and admin overview.</p>
      </div>
      <Link className="home-primary" to="/login">Open Management Login</Link>
    </section>

    <section className="home-section home-product">
      <div>
        <span className="section-kicker">For Pool Businesses</span>
        <h2>A website and management system ready to adapt for other swimming pools.</h2>
        <p>This product keeps the public website separate from the private dashboard, so companies can promote their services while staff run daily pool operations securely.</p>
      </div>
      <div className="product-list">
        <div><strong>Brand-ready website</strong><span>Company name, location, services, hero image, and management login in one clean experience.</span></div>
        <div><strong>Secure operations</strong><span>Username and password login protects visitor entry, tickets, tasks, pricing, and capacity settings.</span></div>
        <div><strong>Fast ticket workflow</strong><span>Barcode PDF tickets, download, print, payment status, and visitor records stay connected.</span></div>
      </div>
    </section>
  </main>
);

export default Home;
