const db = require('../config/db');

// @desc    Get all invoices
// @route   GET /api/invoices
exports.getInvoices = async (req, res) => {
  try {
    const result = await db.query(
      'SELECT invoices.*, customers.name AS customer_name FROM invoices LEFT JOIN customers ON invoices.customer_id = customers.id ORDER BY invoices.id DESC'
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server Error fetching invoices' });
  }
};

// @desc    Get invoice by ID
// @route   GET /api/invoices/:id
exports.getInvoiceById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query('SELECT * FROM invoices WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Invoice not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server Error fetching invoice' });
  }
};

// @desc    Create new invoice
// @route   POST /api/invoices
exports.createInvoice = async (req, res) => {
  try {
    const { customer_id, total_amount, status } = req.body;
    if (!customer_id || total_amount === undefined) {
      return res.status(400).json({ error: 'Please provide customer_id and total_amount' });
    }
    const result = await db.query(
      'INSERT INTO invoices (customer_id, total_amount, status) VALUES ($1, $2, $3) RETURNING *',
      [parseInt(customer_id), parseFloat(total_amount), status || 'Pending']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server Error creating invoice' });
  }
};

// @desc    Update invoice status/details
// @route   PUT /api/invoices/:id
exports.updateInvoice = async (req, res) => {
  try {
    const { id } = req.params;
    const { customer_id, total_amount, status } = req.body;
    if (!customer_id || total_amount === undefined || !status) {
      return res.status(400).json({ error: 'Please provide customer_id, total_amount, and status' });
    }
    const result = await db.query(
      'UPDATE invoices SET customer_id = $1, total_amount = $2, status = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4 RETURNING *',
      [parseInt(customer_id), parseFloat(total_amount), status, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Invoice not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server Error updating invoice' });
  }
};

// @desc    Delete invoice
// @route   DELETE /api/invoices/:id
exports.deleteInvoice = async (req, res) => {
  try {
    const { id } = req.params;
    await db.query('DELETE FROM invoices WHERE id = $1', [id]);
    res.json({ message: 'Invoice deleted successfully' });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server Error deleting invoice' });
  }
};
