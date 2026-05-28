const db = require('../config/db');

// @desc    Get all customers
// @route   GET /api/customers
exports.getCustomers = async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM customers ORDER BY id DESC');
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server Error fetching customers' });
  }
};

// @desc    Get customer by ID
// @route   GET /api/customers/:id
exports.getCustomerById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query('SELECT * FROM customers WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server Error fetching customer' });
  }
};

// @desc    Create new customer
// @route   POST /api/customers
exports.createCustomer = async (req, res) => {
  try {
    const { name, email, phone } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Customer name is required' });
    }
    const result = await db.query(
      'INSERT INTO customers (name, email, phone) VALUES ($1, $2, $3) RETURNING *',
      [name, email || '', phone || '']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server Error creating customer' });
  }
};

// @desc    Update customer details
// @route   PUT /api/customers/:id
exports.updateCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, phone } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Customer name is required' });
    }
    const result = await db.query(
      'UPDATE customers SET name = $1, email = $2, phone = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4 RETURNING *',
      [name, email || '', phone || '', id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server Error updating customer' });
  }
};

// @desc    Delete customer
// @route   DELETE /api/customers/:id
exports.deleteCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    await db.query('DELETE FROM customers WHERE id = $1', [id]);
    res.json({ message: 'Customer deleted successfully' });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server Error deleting customer' });
  }
};
