const db = require('../config/db');

// @desc    Get all products
// @route   GET /api/products
exports.getProducts = async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM products ORDER BY id DESC');
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server Error fetching products' });
  }
};

// @desc    Get product by ID
// @route   GET /api/products/:id
exports.getProductById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query('SELECT * FROM products WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server Error fetching product' });
  }
};

// @desc    Create new product
// @route   POST /api/products
exports.createProduct = async (req, res) => {
  try {
    const { name, description, price } = req.body;
    if (!name || price === undefined) {
      return res.status(400).json({ error: 'Please provide name and price' });
    }
    const result = await db.query(
      'INSERT INTO products (name, description, price) VALUES ($1, $2, $3) RETURNING *',
      [name, description || '', parseFloat(price)]
    );
    const newProduct = result.rows[0];

    // Auto-create associated inventory row if PostgreSQL mode is active (handled inside config/db.js fallback for JSON fallback)
    try {
      await db.query(
        'INSERT INTO inventory_hub (product_id, stock_quantity, location) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
        [newProduct.id, 0, 'Warehouse A']
      );
    } catch (invErr) {
      console.warn("Could not automatically seed associated inventory row", invErr.message);
    }

    res.status(201).json(newProduct);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server Error creating product' });
  }
};

// @desc    Update product details
// @route   PUT /api/products/:id
exports.updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, price } = req.body;
    if (!name || price === undefined) {
      return res.status(400).json({ error: 'Please provide name and price' });
    }
    const result = await db.query(
      'UPDATE products SET name = $1, description = $2, price = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4 RETURNING *',
      [name, description || '', parseFloat(price), id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server Error updating product' });
  }
};

// @desc    Delete product
// @route   DELETE /api/products/:id
exports.deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Delete associated inventory rows first to respect foreign keys in PostgreSQL
    try {
      await db.query('DELETE FROM inventory_hub WHERE product_id = $1', [id]);
    } catch (invErr) {
      console.warn("Error deleting associated inventory", invErr.message);
    }

    const result = await db.query('DELETE FROM products WHERE id = $1', [id]);
    res.json({ message: 'Product deleted successfully' });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server Error deleting product' });
  }
};
