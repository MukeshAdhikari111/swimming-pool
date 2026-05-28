require('dotenv').config();
const { Pool, Client } = require('pg');
const fs = require('fs');
const path = require('path');

const dbConfig = {
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  password: process.env.DB_PASSWORD || 'postgres',
  port: process.env.DB_PORT || 5432,
};

const DB_NAME = process.env.DB_NAME || 'swimmingpool';
const DB_FILE = path.join(__dirname, 'database.json');

let pool = null;
let isPostgres = false;

// Initialize JSON database fallback structure with curated initial seeds
const loadJSONDB = () => {
  if (!fs.existsSync(DB_FILE)) {
    const initialDB = {
      visitors: [
        {
          id: 1,
          name: "Siddharth Gautam",
          phone: "9851012345",
          type: "Adult",
          entry_time: new Date(Date.now() - 3600000 * 2.5).toISOString(), // 2.5 hours ago
          exit_time: new Date(Date.now() - 3600000 * 1.2).toISOString(), // 1.2 hours ago
          date: new Date().toISOString().split('T')[0],
          ticket_id: null,
          barcode_value: null,
          ticket_pdf_path: null,
          ticket_price: 300.00,
          payment_status: "Paid"
        },
        {
          id: 2,
          name: "Aarav Sharma",
          phone: "9841234567",
          type: "Child",
          entry_time: new Date(Date.now() - 3600000 * 1.5).toISOString(), // 1.5 hours ago
          exit_time: null,
          date: new Date().toISOString().split('T')[0],
          ticket_id: null,
          barcode_value: null,
          ticket_pdf_path: null,
          ticket_price: 150.00,
          payment_status: "Paid"
        },
        {
          id: 3,
          name: "Pooja Adhikari",
          phone: "9808987654",
          type: "Adult",
          entry_time: new Date(Date.now() - 1800000).toISOString(), // 30 mins ago
          exit_time: null,
          date: new Date().toISOString().split('T')[0],
          ticket_id: null,
          barcode_value: null,
          ticket_pdf_path: null,
          ticket_price: 300.00,
          payment_status: "Pending"
        }
      ],
      inventory: [
        { id: 1, item_name: "Mineral Water (1L)", category: "Snacks", price: 50.00, stock: 45, last_updated: new Date().toISOString() },
        { id: 2, item_name: "Sleek Swimming Goggles", category: "Gear", price: 650.00, stock: 12, last_updated: new Date().toISOString() },
        { id: 3, item_name: "Silicone Swimming Cap", category: "Gear", price: 250.00, stock: 20, last_updated: new Date().toISOString() },
        { id: 4, item_name: "Potato Chips", category: "Snacks", price: 60.00, stock: 30, last_updated: new Date().toISOString() }
      ],
      sales: [
        { id: 1, item_id: 1, quantity: 2, total_price: 100.00, sale_date: new Date(Date.now() - 7200000).toISOString() },
        { id: 2, item_id: 4, quantity: 1, total_price: 60.00, sale_date: new Date(Date.now() - 3600000).toISOString() }
      ]
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(initialDB, null, 2), 'utf8');
    return initialDB;
  }
  try {
    const rawData = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
    if (!rawData.visitors) rawData.visitors = [];
    if (!rawData.inventory) rawData.inventory = [];
    if (!rawData.sales) rawData.sales = [];
    if (!rawData.settings) rawData.settings = { adult_price: 300, child_price: 150 };
    if (!rawData.products) rawData.products = [];
    if (!rawData.customers) rawData.customers = [];
    if (!rawData.invoices) rawData.invoices = [];
    if (!rawData.inventory_hub) rawData.inventory_hub = [];
    if (!rawData.tasks) rawData.tasks = [];
    rawData.inventory = rawData.inventory.map(item => ({ is_deleted: false, ...item }));
    rawData.sales = rawData.sales.map(sale => ({ is_refunded: false, ...sale }));
    return rawData;
  } catch (err) {
    console.error("Error reading database.json. Resetting storage file.", err);
    return { visitors: [], inventory: [], sales: [], settings: { adult_price: 300, child_price: 150 } };
  }
};

const saveJSONDB = (data) => {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf8');
};

const initDB = async () => {
  // Try to connect to PostgreSQL
  const client = new Client({ ...dbConfig, database: 'postgres' });
  try {
    console.log("Connecting to PostgreSQL...");
    await client.connect();
    const res = await client.query(`SELECT datname FROM pg_catalog.pg_database WHERE datname = '${DB_NAME}'`);
    if (res.rowCount === 0) {
      console.log(`Database "${DB_NAME}" not found. Creating...`);
      await client.query(`CREATE DATABASE "${DB_NAME}"`);
      console.log(`Database "${DB_NAME}" created successfully.`);
    }
    await client.end();

    // Now connect pool to the actual database
    pool = new Pool({ ...dbConfig, database: DB_NAME });
    isPostgres = true;

    // Create tables in Postgres
    const queryStr = `
      CREATE TABLE IF NOT EXISTS visitors (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        phone VARCHAR(20),
        type VARCHAR(20) NOT NULL,
        entry_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        exit_time TIMESTAMP,
        date DATE DEFAULT CURRENT_DATE,
        locker_number VARCHAR(20),
        ticket_id VARCHAR(40) UNIQUE,
        barcode_value VARCHAR(80),
        ticket_pdf_path VARCHAR(255),
        ticket_price DECIMAL(10, 2) NOT NULL,
        payment_status VARCHAR(20) DEFAULT 'Paid'
      );
      
      CREATE TABLE IF NOT EXISTS inventory (
        id SERIAL PRIMARY KEY,
        item_name VARCHAR(100) NOT NULL,
        category VARCHAR(50) NOT NULL,
        price DECIMAL(10, 2) NOT NULL,
        stock INT NOT NULL DEFAULT 0,
        last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS sales (
        id SERIAL PRIMARY KEY,
        item_id INT REFERENCES inventory(id),
        quantity INT NOT NULL,
        total_price DECIMAL(10, 2) NOT NULL,
        sale_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS settings (
        key VARCHAR(50) PRIMARY KEY,
        value VARCHAR(255) NOT NULL
      );

      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(150) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(30) DEFAULT 'admin',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS tasks (
        id SERIAL PRIMARY KEY,
        title VARCHAR(150) NOT NULL,
        description TEXT,
        status VARCHAR(30) DEFAULT 'Pending',
        due_date TIMESTAMP,
        user_id INT REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;
    await pool.query(queryStr);

    // Apply schema upgrades (column additions for PostgreSQL if existing)
    await pool.query(`
      ALTER TABLE inventory ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;
      ALTER TABLE sales ADD COLUMN IF NOT EXISTS is_refunded BOOLEAN DEFAULT FALSE;
      ALTER TABLE visitors ADD COLUMN IF NOT EXISTS locker_number VARCHAR(20);
      ALTER TABLE visitors ADD COLUMN IF NOT EXISTS ticket_id VARCHAR(40);
      ALTER TABLE visitors ADD COLUMN IF NOT EXISTS barcode_value VARCHAR(80);
      ALTER TABLE visitors ADD COLUMN IF NOT EXISTS ticket_pdf_path VARCHAR(255);
      CREATE UNIQUE INDEX IF NOT EXISTS visitors_ticket_id_unique ON visitors(ticket_id) WHERE ticket_id IS NOT NULL;
    `);

    // Seed default settings if they don't exist
    await pool.query(`
      INSERT INTO settings (key, value) 
      VALUES ('adult_price', '300'), ('child_price', '150'), ('pool_capacity', '120')
      ON CONFLICT (key) DO NOTHING;
    `);

    // Migrate previous data from database.json if Postgres tables are empty
    const checkVisitors = await pool.query('SELECT COUNT(*) FROM visitors');
    if (parseInt(checkVisitors.rows[0].count) === 0) {
      console.log("Migrating previous data from database.json to PostgreSQL...");
      const dbData = loadJSONDB();
      
      for (const v of dbData.visitors) {
        await pool.query(
          "INSERT INTO visitors (id, name, phone, type, entry_time, exit_time, date, locker_number, ticket_id, barcode_value, ticket_pdf_path, ticket_price, payment_status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)",
          [v.id, v.name, v.phone, v.type, v.entry_time, v.exit_time, v.date, v.locker_number || '', v.ticket_id || null, v.barcode_value || null, v.ticket_pdf_path || null, v.ticket_price, v.payment_status]
        );
      }
      
      for (const i of dbData.inventory) {
        await pool.query(
          "INSERT INTO inventory (id, item_name, category, price, stock, last_updated, is_deleted) VALUES ($1, $2, $3, $4, $5, $6, $7)",
          [i.id, i.item_name, i.category, i.price, i.stock, i.last_updated || new Date().toISOString(), i.is_deleted || false]
        );
      }
      
      for (const s of dbData.sales) {
        await pool.query(
          "INSERT INTO sales (id, item_id, quantity, total_price, sale_date, is_refunded) VALUES ($1, $2, $3, $4, $5, $6)",
          [s.id, s.item_id, s.quantity, s.total_price, s.sale_date, s.is_refunded || false]
        );
      }
      
      await pool.query("SELECT setval('visitors_id_seq', (SELECT COALESCE(MAX(id), 1) FROM visitors))");
      await pool.query("SELECT setval('inventory_id_seq', (SELECT COALESCE(MAX(id), 1) FROM inventory))");
      await pool.query("SELECT setval('sales_id_seq', (SELECT COALESCE(MAX(id), 1) FROM sales))");
      
      console.log("Migration completed successfully!");
    }

    console.log("=========================================");
    console.log(" PostgreSQL initialized and connected!   ");
    console.log("=========================================");
  } catch (err) {
    console.log("\n=========================================");
    console.log("   POSTGRESQL NOT DETECTED / CONNECTED   ");
    console.log("=========================================");
    console.log("Running in zero-config offline mode.");
    console.log("High-fidelity persistent JSON database loaded.");
    console.log(`Storage location: ${DB_FILE}`);
    console.log("=========================================\n");
    
    isPostgres = false;
    // Load database JSON to verify structure and seed defaults
    loadJSONDB();
  }
};

const query = async (text, params = []) => {
  if (isPostgres) {
    return pool.query(text, params);
  }

  // Parse queries inside JSON Database Fallback
  const data = loadJSONDB();
  const sql = text.replace(/\s+/g, ' ').trim().toLowerCase();

  // 1. SELECT datname FROM pg_catalog.pg_database ... (DB existence check)
  if (sql.includes('select datname from pg_catalog.pg_database')) {
    return { rows: [{ datname: DB_NAME }], rowCount: 1 };
  }

  // 2. CREATE TABLE
  if (sql.includes('create table if not exists')) {
    return { rows: [], rowCount: 0 };
  }

  // 3. GET ALL VISITORS: SELECT * FROM visitors ORDER BY entry_time DESC LIMIT 100
  if (sql.includes('select * from visitors order by entry_time desc')) {
    const list = [...data.visitors];
    list.sort((a, b) => new Date(b.entry_time) - new Date(a.entry_time));
    return { rows: list.slice(0, 100), rowCount: Math.min(list.length, 100) };
  }

  if (sql.includes('select key, value from settings')) {
    const settings = data.settings || { adult_price: 300, child_price: 150 };
    return {
      rows: [
        { key: 'adult_price', value: String(settings.adult_price || 300) },
        { key: 'child_price', value: String(settings.child_price || 150) },
        { key: 'pool_capacity', value: String(settings.pool_capacity || 120) }
      ],
      rowCount: 3
    };
  }

  if (sql.includes('select * from tasks order by created_at desc')) {
    const list = [...(data.tasks || [])];
    list.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
    return { rows: list, rowCount: list.length };
  }

  // 4. GET ALL INVENTORY: SELECT * FROM inventory ORDER BY id DESC (excludes soft deleted)
  if (sql.includes('select * from inventory')) {
    const list = data.inventory.filter(i => !i.is_deleted);
    list.sort((a, b) => b.id - a.id);
    return { rows: list, rowCount: list.length };
  }

  // 5. GET DASHBOARD TODAY'S VISITORS: SELECT COUNT(*) FROM visitors WHERE date = $1
  if (sql.includes('select count(*) from visitors where date = $1')) {
    const dateVal = params[0];
    const count = data.visitors.filter(v => v.date === dateVal).length;
    return { rows: [{ count: count.toString() }], rowCount: 1 };
  }

  // 6. GET DASHBOARD TODAY'S REVENUE: SELECT SUM(ticket_price) FROM visitors WHERE date = $1 AND payment_status = 'Paid'
  if (sql.includes('select sum(ticket_price) from visitors where date = $1 and payment_status = \'paid\'')) {
    const dateVal = params[0];
    const sum = data.visitors
      .filter(v => v.date === dateVal && v.payment_status === 'Paid')
      .reduce((acc, v) => acc + parseFloat(v.ticket_price), 0);
    return { rows: [{ sum: sum }], rowCount: 1 };
  }

  // 7. GET DASHBOARD ACTIVE SWIMMERS: SELECT COUNT(*) FROM visitors WHERE date = $1 AND exit_time IS NULL
  if (sql.includes('select count(*) from visitors where date = $1 and exit_time is null')) {
    const dateVal = params[0];
    const count = data.visitors.filter(v => v.date === dateVal && !v.exit_time).length;
    return { rows: [{ count: count.toString() }], rowCount: 1 };
  }

  // 8. GET DASHBOARD MONTHLY INCOME
  if (sql.includes('extract(month from date) = extract(month from current_date)') && sql.includes('payment_status = \'paid\'')) {
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    const sum = data.visitors
      .filter(v => {
        const d = new Date(v.date);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear && v.payment_status === 'Paid';
      })
      .reduce((acc, v) => acc + parseFloat(v.ticket_price), 0);
    return { rows: [{ sum: sum }], rowCount: 1 };
  }

  // 9. GET DASHBOARD PENDING PAYMENTS: SELECT COUNT(*) FROM visitors WHERE payment_status = 'Pending'
  if (sql.includes('select count(*) from visitors where payment_status = \'pending\'')) {
    const count = data.visitors.filter(v => v.payment_status === 'Pending').length;
    return { rows: [{ count: count.toString() }], rowCount: 1 };
  }

  // 10. INSERT ENTRY: INSERT INTO visitors (name, phone, type, ticket_price, payment_status) VALUES ($1, $2, $3, $4, $5) RETURNING *
  if (sql.includes('insert into visitors') && sql.includes('returning *')) {
    const newId = data.visitors.length > 0 ? Math.max(...data.visitors.map(v => v.id)) + 1 : 1;
    const todayStr = new Date().toISOString().split('T')[0];
    const newVisitor = {
      id: newId,
      name: params[0],
      phone: params[1] || '',
      type: params[2],
      entry_time: new Date().toISOString(),
      exit_time: null,
      date: todayStr,
      locker_number: params.length > 5 ? params[3] || '' : '',
      ticket_id: params.length > 7 ? params[4] : null,
      barcode_value: params.length > 7 ? params[5] : null,
      ticket_pdf_path: null,
      ticket_price: parseFloat(params.length > 7 ? params[6] : params.length > 5 ? params[4] : params[3]),
      payment_status: params.length > 7 ? params[7] || 'Paid' : params.length > 5 ? params[5] || 'Paid' : params[4] || 'Paid'
    };
    data.visitors.push(newVisitor);
    saveJSONDB(data);
    return { rows: [newVisitor], rowCount: 1 };
  }

  // 11. RECORD EXIT TIME: UPDATE visitors SET exit_time = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *
  if (sql.includes('update visitors set exit_time = current_timestamp') && sql.includes('where id = $1')) {
    const id = parseInt(params[0]);
    const idx = data.visitors.findIndex(v => v.id === id);
    if (idx !== -1) {
      data.visitors[idx].exit_time = new Date().toISOString();
      saveJSONDB(data);
      return { rows: [data.visitors[idx]], rowCount: 1 };
    }
    return { rows: [], rowCount: 0 };
  }

  // 11a. EDIT VISITOR
  if (sql.includes('update visitors') && sql.includes('set name = $1') && sql.includes('where id = $7')) {
    const id = parseInt(params[6]);
    const idx = data.visitors.findIndex(v => v.id === id);
    if (idx !== -1) {
      data.visitors[idx] = {
        ...data.visitors[idx],
        name: params[0],
        phone: params[1] || '',
        type: params[2],
        ticket_price: parseFloat(params[3]) || 0,
        payment_status: params[4],
        exit_time: params[5] || null,
        locker_number: params[7] || data.visitors[idx].locker_number || ''
      };
      saveJSONDB(data);
      return { rows: [data.visitors[idx]], rowCount: 1 };
    }
    return { rows: [], rowCount: 0 };
  }

  // 11b. UPDATE VISITOR TICKET PDF PATH
  if (sql.includes('update visitors set ticket_pdf_path = $1') && sql.includes('where id = $2')) {
    const id = parseInt(params[1]);
    const idx = data.visitors.findIndex(v => v.id === id);
    if (idx !== -1) {
      data.visitors[idx].ticket_pdf_path = params[0];
      saveJSONDB(data);
      return { rows: [data.visitors[idx]], rowCount: 1 };
    }
    return { rows: [], rowCount: 0 };
  }

  if (sql.includes('update visitors set ticket_id = $1') && sql.includes('barcode_value = $2') && sql.includes('where id = $4')) {
    const id = parseInt(params[3]);
    const idx = data.visitors.findIndex(v => v.id === id);
    if (idx !== -1) {
      data.visitors[idx].ticket_id = params[0];
      data.visitors[idx].barcode_value = params[1];
      data.visitors[idx].ticket_pdf_path = params[2];
      saveJSONDB(data);
      return { rows: [data.visitors[idx]], rowCount: 1 };
    }
    return { rows: [], rowCount: 0 };
  }

  // 11c. FIND VISITOR BY ID OR TICKET ID
  if (sql.includes('select * from visitors where id::text = $1 or ticket_id = $1')) {
    const key = String(params[0]);
    const visitor = data.visitors.find(v => String(v.id) === key || v.ticket_id === key);
    return { rows: visitor ? [visitor] : [], rowCount: visitor ? 1 : 0 };
  }

  // 12. GET STOCK: SELECT stock FROM inventory WHERE id = $1
  if (sql.includes('select stock from inventory where id = $1')) {
    const id = parseInt(params[0]);
    const item = data.inventory.find(i => i.id === id);
    return { rows: item ? [{ stock: item.stock }] : [], rowCount: item ? 1 : 0 };
  }

  // 13. DEDUCT STOCK: UPDATE inventory SET stock = stock - $1, last_updated = CURRENT_TIMESTAMP WHERE id = $2
  if (sql.includes('update inventory set stock = stock - $1') && sql.includes('where id = $2')) {
    const qty = parseInt(params[0]);
    const id = parseInt(params[1]);
    const idx = data.inventory.findIndex(i => i.id === id);
    if (idx !== -1) {
      data.inventory[idx].stock -= qty;
      data.inventory[idx].last_updated = new Date().toISOString();
      saveJSONDB(data);
      return { rows: [data.inventory[idx]], rowCount: 1 };
    }
    return { rows: [], rowCount: 0 };
  }

  // 14. RECORD SALE: INSERT INTO sales (item_id, quantity, total_price) VALUES ($1, $2, $3) RETURNING *
  if (sql.includes('insert into sales') && sql.includes('returning *')) {
    const newId = data.sales.length > 0 ? Math.max(...data.sales.map(s => s.id)) + 1 : 1;
    const newSale = {
      id: newId,
      item_id: parseInt(params[0]),
      quantity: parseInt(params[1]),
      total_price: parseFloat(params[2]),
      sale_date: new Date().toISOString()
    };
    data.sales.push(newSale);
    saveJSONDB(data);
    return { rows: [newSale], rowCount: 1 };
  }

  // 15. ADD NEW ITEM: INSERT INTO inventory (item_name, category, price, stock) VALUES ($1, $2, $3, $4) RETURNING *
  if (sql.includes('insert into inventory') && sql.includes('returning *')) {
    const newId = data.inventory.length > 0 ? Math.max(...data.inventory.map(i => i.id)) + 1 : 1;
    const newItem = {
      id: newId,
      item_name: params[0],
      category: params[1],
      price: parseFloat(params[2]),
      stock: parseInt(params[3]) || 0,
      last_updated: new Date().toISOString()
    };
    data.inventory.push(newItem);
    saveJSONDB(data);
    return { rows: [newItem], rowCount: 1 };
  }

  // 16. UPDATE PAYMENT STATUS: UPDATE visitors SET payment_status = 'Paid' WHERE id = $1 RETURNING *
  if (sql.includes('update visitors set payment_status =') && sql.includes('where id = $1')) {
    const id = parseInt(params[0]);
    const idx = data.visitors.findIndex(v => v.id === id);
    if (idx !== -1) {
      data.visitors[idx].payment_status = 'Paid';
      saveJSONDB(data);
      return { rows: [data.visitors[idx]], rowCount: 1 };
    }
    return { rows: [], rowCount: 0 };
  }

  if (sql.includes('delete from visitors where id = $1')) {
    const id = parseInt(params[0]);
    const idx = data.visitors.findIndex(v => v.id === id);
    if (idx !== -1) {
      const [visitor] = data.visitors.splice(idx, 1);
      saveJSONDB(data);
      return { rows: [visitor], rowCount: 1 };
    }
    return { rows: [], rowCount: 0 };
  }

  if (sql.includes('insert into tasks') && sql.includes('returning *')) {
    data.tasks = data.tasks || [];
    const newId = data.tasks.length > 0 ? Math.max(...data.tasks.map(t => t.id)) + 1 : 1;
    const now = new Date().toISOString();
    const task = {
      id: newId,
      title: params[0],
      description: params[1],
      status: params[2] || 'Pending',
      due_date: params[3] || null,
      created_at: now,
      updated_at: now
    };
    data.tasks.push(task);
    saveJSONDB(data);
    return { rows: [task], rowCount: 1 };
  }

  if (sql.includes('update tasks') && sql.includes('where id = $5')) {
    data.tasks = data.tasks || [];
    const id = parseInt(params[4]);
    const idx = data.tasks.findIndex(t => t.id === id);
    if (idx !== -1) {
      data.tasks[idx] = {
        ...data.tasks[idx],
        title: params[0],
        description: params[1],
        status: params[2] || 'Pending',
        due_date: params[3] || null,
        updated_at: new Date().toISOString()
      };
      saveJSONDB(data);
      return { rows: [data.tasks[idx]], rowCount: 1 };
    }
    return { rows: [], rowCount: 0 };
  }

  if (sql.includes('delete from tasks where id = $1')) {
    data.tasks = data.tasks || [];
    const id = parseInt(params[0]);
    const idx = data.tasks.findIndex(t => t.id === id);
    if (idx !== -1) {
      const [task] = data.tasks.splice(idx, 1);
      saveJSONDB(data);
      return { rows: [task], rowCount: 1 };
    }
    return { rows: [], rowCount: 0 };
  }

  if (sql.includes('insert into settings') && sql.includes('adult_price') && sql.includes('child_price')) {
    data.settings = data.settings || {};
    data.settings.adult_price = Number(params[0]);
    data.settings.child_price = Number(params[1]);
    data.settings.pool_capacity = Number(params[2] || data.settings.pool_capacity || 120);
    saveJSONDB(data);
    return { rows: [], rowCount: 3 };
  }

  // 17. RESTOCK STOCK: UPDATE inventory SET stock = stock + $1, last_updated = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *
  if (sql.includes('update inventory set stock = stock + $1') && sql.includes('where id = $2')) {
    const qty = parseInt(params[0]);
    const id = parseInt(params[1]);
    const idx = data.inventory.findIndex(i => i.id === id);
    if (idx !== -1) {
      data.inventory[idx].stock += qty;
      data.inventory[idx].last_updated = new Date().toISOString();
      saveJSONDB(data);
      return { rows: [data.inventory[idx]], rowCount: 1 };
    }
    return { rows: [], rowCount: 0 };
  }

  // 18. FETCH JOINED SALES DATA: SELECT sales.*, inventory.item_name, inventory.category, inventory.price FROM sales JOIN ...
  if (sql.includes('from sales') && sql.includes('join inventory')) {
    const joined = data.sales.map(s => {
      const item = data.inventory.find(i => i.id === s.item_id) || {};
      return {
        id: s.id,
        item_id: s.item_id,
        quantity: s.quantity,
        total_price: s.total_price,
        sale_date: s.sale_date,
        is_refunded: !!s.is_refunded,
        item_name: item.item_name || 'Deleted Item',
        category: item.category || 'N/A',
        price: item.price || 0
      };
    });
    joined.sort((a, b) => new Date(b.sale_date) - new Date(a.sale_date));
    return { rows: joined, rowCount: joined.length };
  }

  // 19. UPDATE INVENTORY ITEM: UPDATE inventory SET item_name = $1, category = $2, price = $3 WHERE id = $4 RETURNING *
  if (sql.includes('update inventory set item_name =') && sql.includes('where id = $4')) {
    const id = parseInt(params[3]);
    const idx = data.inventory.findIndex(i => i.id === id);
    if (idx !== -1) {
      data.inventory[idx].item_name = params[0];
      data.inventory[idx].category = params[1];
      data.inventory[idx].price = parseFloat(params[2]);
      data.inventory[idx].last_updated = new Date().toISOString();
      saveJSONDB(data);
      return { rows: [data.inventory[idx]], rowCount: 1 };
    }
    return { rows: [], rowCount: 0 };
  }

  // 20. SOFT-DELETE INVENTORY ITEM: UPDATE inventory SET is_deleted = TRUE WHERE id = $1 RETURNING *
  if (sql.includes('update inventory set is_deleted = true') && sql.includes('where id = $1')) {
    const id = parseInt(params[0]);
    const idx = data.inventory.findIndex(i => i.id === id);
    if (idx !== -1) {
      data.inventory[idx].is_deleted = true;
      data.inventory[idx].last_updated = new Date().toISOString();
      saveJSONDB(data);
      return { rows: [data.inventory[idx]], rowCount: 1 };
    }
    return { rows: [], rowCount: 0 };
  }

  // 21. GET SALE BY ID: SELECT * FROM sales WHERE id = $1
  if (sql.includes('select * from sales where id = $1')) {
    const id = parseInt(params[0]);
    const sale = data.sales.find(s => s.id === id);
    return { rows: sale ? [sale] : [], rowCount: sale ? 1 : 0 };
  }

  // 22. REFUND TRANSACTION: UPDATE sales SET is_refunded = TRUE WHERE id = $1 RETURNING *
  if (sql.includes('update sales set is_refunded = true') && sql.includes('where id = $1')) {
    const id = parseInt(params[0]);
    const idx = data.sales.findIndex(s => s.id === id);
    if (idx !== -1) {
      data.sales[idx].is_refunded = true;
      saveJSONDB(data);
      return { rows: [data.sales[idx]], rowCount: 1 };
    }
    return { rows: [], rowCount: 0 };
  }

  console.log(`Unmatched SQL fallback query: "${text}"`);
  return { rows: [], rowCount: 0 };
};

const toNumber = (value) => Number(value || 0);

const percentageChange = (current, previous) => {
  const currentValue = toNumber(current);
  const previousValue = toNumber(previous);
  if (previousValue === 0) return currentValue > 0 ? 100 : 0;
  return Number((((currentValue - previousValue) / previousValue) * 100).toFixed(1));
};

const getStatus = () => ({
  mode: isPostgres ? 'PostgreSQL' : 'JSON fallback',
  connected: isPostgres,
  database: DB_NAME,
  host: dbConfig.host,
  port: Number(dbConfig.port)
});

const getDashboardAnalytics = async () => {
  if (isPostgres) {
    const weeklyRes = await pool.query(`
      SELECT
        d::date AS date,
        to_char(d, 'Dy') AS name,
        COUNT(v.id)::int AS visitors,
        COALESCE(SUM(CASE WHEN v.payment_status = 'Paid' THEN v.ticket_price ELSE 0 END), 0)::float AS revenue
      FROM generate_series(CURRENT_DATE - INTERVAL '6 days', CURRENT_DATE, INTERVAL '1 day') d
      LEFT JOIN visitors v ON v.date = d::date
      GROUP BY d
      ORDER BY d
    `);

    const periodRes = await pool.query(`
      SELECT
        COUNT(*) FILTER (WHERE date = CURRENT_DATE)::int AS today_visitors,
        COUNT(*) FILTER (WHERE date = CURRENT_DATE - INTERVAL '1 day')::int AS yesterday_visitors,
        COALESCE(SUM(ticket_price) FILTER (WHERE date = CURRENT_DATE AND payment_status = 'Paid'), 0)::float AS today_revenue,
        COALESCE(SUM(ticket_price) FILTER (WHERE date = CURRENT_DATE - INTERVAL '1 day' AND payment_status = 'Paid'), 0)::float AS yesterday_revenue,
        COUNT(*) FILTER (WHERE date >= date_trunc('week', CURRENT_DATE)::date AND date < date_trunc('week', CURRENT_DATE)::date + INTERVAL '7 days')::int AS week_visitors,
        COUNT(*) FILTER (WHERE date >= date_trunc('week', CURRENT_DATE)::date - INTERVAL '7 days' AND date < date_trunc('week', CURRENT_DATE)::date)::int AS previous_week_visitors,
        COALESCE(SUM(ticket_price) FILTER (WHERE date >= date_trunc('month', CURRENT_DATE)::date AND date < date_trunc('month', CURRENT_DATE)::date + INTERVAL '1 month' AND payment_status = 'Paid'), 0)::float AS month_revenue,
        COALESCE(SUM(ticket_price) FILTER (WHERE date >= date_trunc('month', CURRENT_DATE)::date - INTERVAL '1 month' AND date < date_trunc('month', CURRENT_DATE)::date AND payment_status = 'Paid'), 0)::float AS previous_month_revenue
      FROM visitors
    `);

    const periods = periodRes.rows[0];
    const totalWeeklyVisitors = weeklyRes.rows.reduce((sum, row) => sum + toNumber(row.visitors), 0);
    const totalWeeklyRevenue = weeklyRes.rows.reduce((sum, row) => sum + toNumber(row.revenue), 0);

    return {
      weekly: weeklyRes.rows.map((row) => ({
        date: row.date,
        name: row.name.trim(),
        visitors: toNumber(row.visitors),
        revenue: toNumber(row.revenue),
        visitorPercentage: totalWeeklyVisitors ? Number(((toNumber(row.visitors) / totalWeeklyVisitors) * 100).toFixed(1)) : 0,
        revenuePercentage: totalWeeklyRevenue ? Number(((toNumber(row.revenue) / totalWeeklyRevenue) * 100).toFixed(1)) : 0
      })),
      percentages: {
        dayVisitors: percentageChange(periods.today_visitors, periods.yesterday_visitors),
        dayRevenue: percentageChange(periods.today_revenue, periods.yesterday_revenue),
        weekVisitors: percentageChange(periods.week_visitors, periods.previous_week_visitors),
        monthRevenue: percentageChange(periods.month_revenue, periods.previous_month_revenue)
      }
    };
  }

  const data = loadJSONDB();
  const today = new Date();
  const dayKey = (date) => date.toISOString().split('T')[0];
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay());
  startOfWeek.setHours(0, 0, 0, 0);
  const previousWeekStart = new Date(startOfWeek);
  previousWeekStart.setDate(startOfWeek.getDate() - 7);
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const previousMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);

  const paidRevenue = (items) => items
    .filter((visitor) => visitor.payment_status === 'Paid')
    .reduce((sum, visitor) => sum + toNumber(visitor.ticket_price), 0);

  const dateInRange = (value, start, end) => {
    const date = new Date(value);
    return date >= start && date < end;
  };

  const weekly = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (6 - index));
    const dateValue = dayKey(date);
    const rows = data.visitors.filter((visitor) => visitor.date === dateValue);
    return {
      date: dateValue,
      name: date.toLocaleDateString('en-US', { weekday: 'short' }),
      visitors: rows.length,
      revenue: paidRevenue(rows)
    };
  });

  const totalWeeklyVisitors = weekly.reduce((sum, row) => sum + row.visitors, 0);
  const totalWeeklyRevenue = weekly.reduce((sum, row) => sum + row.revenue, 0);
  const todayRows = data.visitors.filter((visitor) => visitor.date === dayKey(today));
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const yesterdayRows = data.visitors.filter((visitor) => visitor.date === dayKey(yesterday));
  const weekRows = data.visitors.filter((visitor) => dateInRange(visitor.date, startOfWeek, new Date(startOfWeek.getTime() + 7 * 86400000)));
  const previousWeekRows = data.visitors.filter((visitor) => dateInRange(visitor.date, previousWeekStart, startOfWeek));
  const monthRows = data.visitors.filter((visitor) => dateInRange(visitor.date, startOfMonth, new Date(today.getFullYear(), today.getMonth() + 1, 1)));
  const previousMonthRows = data.visitors.filter((visitor) => dateInRange(visitor.date, previousMonthStart, startOfMonth));

  return {
    weekly: weekly.map((row) => ({
      ...row,
      visitorPercentage: totalWeeklyVisitors ? Number(((row.visitors / totalWeeklyVisitors) * 100).toFixed(1)) : 0,
      revenuePercentage: totalWeeklyRevenue ? Number(((row.revenue / totalWeeklyRevenue) * 100).toFixed(1)) : 0
    })),
    percentages: {
      dayVisitors: percentageChange(todayRows.length, yesterdayRows.length),
      dayRevenue: percentageChange(paidRevenue(todayRows), paidRevenue(yesterdayRows)),
      weekVisitors: percentageChange(weekRows.length, previousWeekRows.length),
      monthRevenue: percentageChange(paidRevenue(monthRows), paidRevenue(previousMonthRows))
    }
  };
};

const getAdminOverview = async () => {
  if (isPostgres) {
    const result = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM visitors)::int AS visitors,
        (SELECT COUNT(*) FROM visitors WHERE exit_time IS NULL)::int AS active_swimmers,
        (SELECT COUNT(*) FROM visitors WHERE payment_status = 'Paid')::int AS paid_tickets,
        (SELECT COUNT(*) FROM visitors WHERE payment_status = 'Pending')::int AS pending_payments,
        COALESCE((SELECT SUM(ticket_price) FROM visitors WHERE payment_status = 'Paid'), 0)::float AS ticket_revenue,
        (SELECT COUNT(*) FROM users)::int AS users,
        (SELECT COUNT(*) FROM tasks)::int AS tasks
    `);

    return {
      database: getStatus(),
      totals: result.rows[0]
    };
  }

  const data = loadJSONDB();
  return {
    database: getStatus(),
    totals: {
      visitors: data.visitors.length,
      active_swimmers: data.visitors.filter((visitor) => !visitor.exit_time).length,
      paid_tickets: data.visitors.filter((visitor) => visitor.payment_status === 'Paid').length,
      pending_payments: data.visitors.filter((visitor) => visitor.payment_status === 'Pending').length,
      ticket_revenue: data.visitors.filter((visitor) => visitor.payment_status === 'Paid').reduce((sum, visitor) => sum + toNumber(visitor.ticket_price), 0),
      users: data.users ? data.users.length : 0,
      tasks: data.tasks ? data.tasks.length : 0
    }
  };
};

module.exports = {
  query,
  initDB,
  getStatus,
  getDashboardAnalytics,
  getAdminOverview
};
