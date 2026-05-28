const db = require('../config/db');

// @desc    Get all inventory records
// @route   GET /api/inventory-hub
exports.getInventory = async (req, res) => {
  try {
    const result = await db.query(
      'SELECT inventory_hub.*, products.name AS product_name, products.price FROM inventory_hub LEFT JOIN products ON inventory_hub.product_id = products.id ORDER BY inventory_hub.id DESC'
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server Error fetching inventory' });
  }
};

// @desc    Get inventory record by ID
// @route   GET /api/inventory-hub/:id
exports.getInventoryById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query('SELECT * FROM inventory_hub WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Inventory record not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server Error fetching inventory record' });
  }
};

// @desc    Create inventory record
// @route   POST /api/inventory-hub
exports.createInventory = async (req, res) => {
  try {
    const { product_id, stock_quantity, location } = req.body;
    if (!product_id || stock_quantity === undefined) {
      return res.status(400).json({ error: 'Please provide product_id and stock_quantity' });
    }
    const result = await db.query(
      'INSERT INTO inventory_hub (product_id, stock_quantity, location) VALUES ($1, $2, $3) RETURNING *',
      [parseInt(product_id), parseInt(stock_quantity), location || 'Warehouse A']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server Error creating inventory record' });
  }
};

// @desc    Update stock levels or location
// @route   PUT /api/inventory-hub/:id
exports.updateInventory = async (req, res) => {
  try {
    const { id } = req.params;
    const { product_id, stock_quantity, location } = req.body;
    if (!product_id || stock_quantity === undefined || !location) {
      return res.status(400).json({ error: 'Please provide product_id, stock_quantity, and location' });
    }
    const result = await db.query(
      'UPDATE inventory_hub SET product_id = $1, stock_quantity = $2, location = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4 RETURNING *',
      [parseInt(product_id), parseInt(stock_quantity), location, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Inventory record not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server Error updating inventory record' });
  }
};

// @desc    Delete inventory record
// @route   DELETE /api/inventory-hub/:id
exports.deleteInventory = async (req, res) => {
  try {
    const { id } = req.params;
    await db.query('DELETE FROM inventory_hub WHERE id = $1', [id]);
    res.json({ message: 'Inventory record deleted successfully' });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server Error deleting inventory record' });
  }
};
