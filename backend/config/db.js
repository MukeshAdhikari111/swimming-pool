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
const DB_FILE = path.join(__dirname, '..', 'database.json');

let pool = null;
let isPostgres = false;

// Initialize JSON database fallback structure with curated initial seeds
const loadJSONDB = () => {
  if (!fs.existsSync(DB_FILE)) {
    const initialDB = {
      visitors: [],
      inventory: [],
      sales: [],
      products: [],
      customers: [],
      invoices: [],
      inventory_hub: []
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(initialDB, null, 2), 'utf8');
    return initialDB;
  }
  try {
    const rawData = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
    if (!rawData.visitors) rawData.visitors = [];
    if (!rawData.inventory) rawData.inventory = [];
    if (!rawData.sales) rawData.sales = [];
    if (!rawData.products) rawData.products = [];
    if (!rawData.customers) rawData.customers = [];
    if (!rawData.invoices) rawData.invoices = [];
    if (!rawData.inventory_hub) rawData.inventory_hub = [];
    return rawData;
  } catch (err) {
    console.error("Error reading database.json in config. Resetting file.", err);
    return { visitors: [], inventory: [], sales: [], products: [], customers: [], invoices: [], inventory_hub: [] };
  }
};

const saveJSONDB = (data) => {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf8');
};

const initDB = async () => {
  // Try to connect to PostgreSQL
  const client = new Client({ ...dbConfig, database: 'postgres' });
  try {
    console.log("Config: Connecting to PostgreSQL...");
    await client.connect();
    const res = await client.query(`SELECT datname FROM pg_catalog.pg_database WHERE datname = '${DB_NAME}'`);
    if (res.rowCount === 0) {
      console.log(`Config: Database "${DB_NAME}" not found. Creating...`);
      await client.query(`CREATE DATABASE "${DB_NAME}"`);
    }
    await client.end();

    // Now connect pool to database
    pool = new Pool({ ...dbConfig, database: DB_NAME });
    isPostgres = true;

    // Create tables in Postgres
    const schemaSql = fs.readFileSync(path.join(__dirname, '..', 'models', 'schema.sql'), 'utf8');
    await pool.query(schemaSql);
    
    // Migrate previous data from database.json if Postgres tables are empty
    const checkProducts = await pool.query('SELECT COUNT(*) FROM products');
    if (parseInt(checkProducts.rows[0].count) === 0) {
      console.log("Config: Migrating previous data from database.json to PostgreSQL...");
      const dbData = loadJSONDB();
      
      for (const p of dbData.products) {
        await pool.query(
          "INSERT INTO products (id, name, description, price, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6)",
          [p.id, p.name, p.description, p.price, p.created_at, p.updated_at]
        );
      }
      
      for (const c of dbData.customers) {
        await pool.query(
          "INSERT INTO customers (id, name, email, phone, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6)",
          [c.id, c.name, c.email, c.phone, c.created_at, c.updated_at]
        );
      }
      
      for (const inv of dbData.invoices) {
        await pool.query(
          "INSERT INTO invoices (id, customer_id, total_amount, status, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6)",
          [inv.id, inv.customer_id, inv.total_amount, inv.status, inv.created_at, inv.updated_at]
        );
      }
      
      for (const invh of dbData.inventory_hub) {
        await pool.query(
          "INSERT INTO inventory_hub (id, product_id, stock_quantity, location, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6)",
          [invh.id, invh.product_id, invh.stock_quantity, invh.location, invh.created_at, invh.updated_at]
        );
      }
      
      await pool.query("SELECT setval('products_id_seq', (SELECT COALESCE(MAX(id), 1) FROM products))");
      await pool.query("SELECT setval('customers_id_seq', (SELECT COALESCE(MAX(id), 1) FROM customers))");
      await pool.query("SELECT setval('invoices_id_seq', (SELECT COALESCE(MAX(id), 1) FROM invoices))");
      await pool.query("SELECT setval('inventory_hub_id_seq', (SELECT COALESCE(MAX(id), 1) FROM inventory_hub))");
      
      console.log("Config: Migration completed successfully!");
    }

    console.log("=========================================");
    console.log(" PostgreSQL Hub Tables initialized!      ");
    console.log("=========================================");
  } catch (err) {
    console.log("\n=========================================");
    console.log("   POSTGRESQL HUB OFFLINE (JSON MODE)    ");
    console.log("=========================================");
    isPostgres = false;
    loadJSONDB();
  }
};

const query = async (text, params = []) => {
  if (isPostgres) {
    try {
      return await pool.query(text, params);
    } catch (err) {
      console.error("Postgres Query Error:", err);
      throw err;
    }
  }

  // Parse queries inside JSON Database Fallback
  const data = loadJSONDB();
  const sql = text.replace(/\s+/g, ' ').trim().toLowerCase();

  // PRODUCTS CRUD FALLBACK
  if (sql.includes('select * from products order by id desc')) {
    const list = [...data.products];
    list.sort((a, b) => b.id - a.id);
    return { rows: list, rowCount: list.length };
  }
  if (sql.includes('select * from products where id = $1')) {
    const id = parseInt(params[0]);
    const item = data.products.find(p => p.id === id);
    return { rows: item ? [item] : [], rowCount: item ? 1 : 0 };
  }
  if (sql.includes('insert into products') && sql.includes('returning *')) {
    const newId = data.products.length > 0 ? Math.max(...data.products.map(p => p.id)) + 1 : 1;
    const newItem = {
      id: newId,
      name: params[0],
      description: params[1] || '',
      price: parseFloat(params[2]) || 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    data.products.push(newItem);
    // Auto-create inventory record on product creation
    const newInvId = data.inventory_hub.length > 0 ? Math.max(...data.inventory_hub.map(i => i.id)) + 1 : 1;
    data.inventory_hub.push({
      id: newInvId,
      product_id: newId,
      stock_quantity: 0,
      location: 'Warehouse A',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
    saveJSONDB(data);
    return { rows: [newItem], rowCount: 1 };
  }
  if (sql.includes('update products set') && sql.includes('where id = $4')) {
    const id = parseInt(params[3]);
    const idx = data.products.findIndex(p => p.id === id);
    if (idx !== -1) {
      data.products[idx].name = params[0];
      data.products[idx].description = params[1] || '';
      data.products[idx].price = parseFloat(params[2]) || 0;
      data.products[idx].updated_at = new Date().toISOString();
      saveJSONDB(data);
      return { rows: [data.products[idx]], rowCount: 1 };
    }
    return { rows: [], rowCount: 0 };
  }
  if (sql.includes('delete from products where id = $1')) {
    const id = parseInt(params[0]);
    data.products = data.products.filter(p => p.id !== id);
    data.inventory_hub = data.inventory_hub.filter(i => i.product_id !== id);
    saveJSONDB(data);
    return { rows: [], rowCount: 1 };
  }

  // CUSTOMERS CRUD FALLBACK
  if (sql.includes('select * from customers order by id desc')) {
    const list = [...data.customers];
    list.sort((a, b) => b.id - a.id);
    return { rows: list, rowCount: list.length };
  }
  if (sql.includes('select * from customers where id = $1')) {
    const id = parseInt(params[0]);
    const item = data.customers.find(c => c.id === id);
    return { rows: item ? [item] : [], rowCount: item ? 1 : 0 };
  }
  if (sql.includes('insert into customers') && sql.includes('returning *')) {
    const newId = data.customers.length > 0 ? Math.max(...data.customers.map(c => c.id)) + 1 : 1;
    const newItem = {
      id: newId,
      name: params[0],
      email: params[1] || '',
      phone: params[2] || '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    data.customers.push(newItem);
    saveJSONDB(data);
    return { rows: [newItem], rowCount: 1 };
  }
  if (sql.includes('update customers set') && sql.includes('where id = $4')) {
    const id = parseInt(params[3]);
    const idx = data.customers.findIndex(c => c.id === id);
    if (idx !== -1) {
      data.customers[idx].name = params[0];
      data.customers[idx].email = params[1] || '';
      data.customers[idx].phone = params[2] || '';
      data.customers[idx].updated_at = new Date().toISOString();
      saveJSONDB(data);
      return { rows: [data.customers[idx]], rowCount: 1 };
    }
    return { rows: [], rowCount: 0 };
  }
  if (sql.includes('delete from customers where id = $1')) {
    const id = parseInt(params[0]);
    data.customers = data.customers.filter(c => c.id !== id);
    saveJSONDB(data);
    return { rows: [], rowCount: 1 };
  }

  // INVOICES CRUD FALLBACK
  if (sql.includes('from invoices') && sql.includes('join customers')) {
    const list = data.invoices.map(inv => {
      const cust = data.customers.find(c => c.id === inv.customer_id) || { name: 'Unknown Customer' };
      return {
        ...inv,
        customer_name: cust.name
      };
    });
    list.sort((a, b) => b.id - a.id);
    return { rows: list, rowCount: list.length };
  }
  if (sql.includes('select * from invoices where id = $1')) {
    const id = parseInt(params[0]);
    const item = data.invoices.find(inv => inv.id === id);
    return { rows: item ? [item] : [], rowCount: item ? 1 : 0 };
  }
  if (sql.includes('insert into invoices') && sql.includes('returning *')) {
    const newId = data.invoices.length > 0 ? Math.max(...data.invoices.map(inv => inv.id)) + 1 : 1;
    const newItem = {
      id: newId,
      customer_id: parseInt(params[0]),
      total_amount: parseFloat(params[1]) || 0,
      status: params[2] || 'Pending',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    data.invoices.push(newItem);
    saveJSONDB(data);
    return { rows: [newItem], rowCount: 1 };
  }
  if (sql.includes('update invoices set') && sql.includes('where id = $4')) {
    const id = parseInt(params[3]);
    const idx = data.invoices.findIndex(inv => inv.id === id);
    if (idx !== -1) {
      data.invoices[idx].customer_id = parseInt(params[0]);
      data.invoices[idx].total_amount = parseFloat(params[1]) || 0;
      data.invoices[idx].status = params[2];
      data.invoices[idx].updated_at = new Date().toISOString();
      saveJSONDB(data);
      return { rows: [data.invoices[idx]], rowCount: 1 };
    }
    return { rows: [], rowCount: 0 };
  }
  if (sql.includes('delete from invoices where id = $1')) {
    const id = parseInt(params[0]);
    data.invoices = data.invoices.filter(inv => inv.id !== id);
    saveJSONDB(data);
    return { rows: [], rowCount: 1 };
  }

  // INVENTORY_HUB CRUD FALLBACK
  if (sql.includes('from inventory_hub') && sql.includes('join products')) {
    const list = data.inventory_hub.map(inv => {
      const prod = data.products.find(p => p.id === inv.product_id) || { name: 'Unknown Product', price: 0 };
      return {
        ...inv,
        product_name: prod.name,
        price: prod.price
      };
    });
    list.sort((a, b) => b.id - a.id);
    return { rows: list, rowCount: list.length };
  }
  if (sql.includes('select * from inventory_hub where id = $1')) {
    const id = parseInt(params[0]);
    const item = data.inventory_hub.find(i => i.id === id);
    return { rows: item ? [item] : [], rowCount: item ? 1 : 0 };
  }
  if (sql.includes('insert into inventory_hub') && sql.includes('returning *')) {
    const newId = data.inventory_hub.length > 0 ? Math.max(...data.inventory_hub.map(i => i.id)) + 1 : 1;
    const newItem = {
      id: newId,
      product_id: parseInt(params[0]),
      stock_quantity: parseInt(params[1]) || 0,
      location: params[2] || 'Warehouse A',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    data.inventory_hub.push(newItem);
    saveJSONDB(data);
    return { rows: [newItem], rowCount: 1 };
  }
  if (sql.includes('update inventory_hub set') && sql.includes('where id = $4')) {
    const id = parseInt(params[3]);
    const idx = data.inventory_hub.findIndex(i => i.id === id);
    if (idx !== -1) {
      data.inventory_hub[idx].product_id = parseInt(params[0]);
      data.inventory_hub[idx].stock_quantity = parseInt(params[1]) || 0;
      data.inventory_hub[idx].location = params[2];
      data.inventory_hub[idx].updated_at = new Date().toISOString();
      saveJSONDB(data);
      return { rows: [data.inventory_hub[idx]], rowCount: 1 };
    }
    return { rows: [], rowCount: 0 };
  }
  if (sql.includes('delete from inventory_hub where id = $1')) {
    const id = parseInt(params[0]);
    data.inventory_hub = data.inventory_hub.filter(i => i.id !== id);
    saveJSONDB(data);
    return { rows: [], rowCount: 1 };
  }

  console.log(`Unmatched HUB Fallback query: "${text}"`);
  return { rows: [], rowCount: 0 };
};

module.exports = {
  query,
  initDB,
  pool
};
