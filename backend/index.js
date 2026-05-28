const express = require('express');
const cors = require('cors');
const db = require('./db');
const fs = require('fs');
const path = require('path');
const { generateTicketId, generateTicketPdf } = require('./utils/ticketService');

const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ ok: true, database: db.getStatus() });
});

const attachTicketPdf = async (visitor) => {
  const ticket = await generateTicketPdf(visitor);
  const updated = await db.query(
    "UPDATE visitors SET ticket_id = $1, barcode_value = $2, ticket_pdf_path = $3 WHERE id = $4 RETURNING *",
    [ticket.ticketId, ticket.barcodeValue, ticket.relativePath, visitor.id]
  );

  return {
    ...(updated.rows[0] || visitor),
    ticket_download_url: `/api/tickets/${visitor.id}/download`
  };
};

app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/tasks', require('./routes/taskRoutes'));
app.use('/api/users', require('./routes/userRoutes'));

// Dashboard Stats
app.get('/api/dashboard', async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    const visitorsRes = await db.query("SELECT COUNT(*) FROM visitors WHERE date = $1", [today]);
    const todayVisitors = visitorsRes.rows[0].count;

    const revenueRes = await db.query("SELECT SUM(ticket_price) FROM visitors WHERE date = $1 AND payment_status = 'Paid'", [today]);
    const todayRevenue = revenueRes.rows[0].sum || 0;

    const activeRes = await db.query("SELECT COUNT(*) FROM visitors WHERE date = $1 AND exit_time IS NULL", [today]);
    const activeSwimmers = activeRes.rows[0].count;

    const monthlyRes = await db.query("SELECT SUM(ticket_price) FROM visitors WHERE EXTRACT(MONTH FROM date) = EXTRACT(MONTH FROM CURRENT_DATE) AND EXTRACT(YEAR FROM date) = EXTRACT(YEAR FROM CURRENT_DATE) AND payment_status = 'Paid'");
    const monthlyIncome = monthlyRes.rows[0].sum || 0;

    const pendingRes = await db.query("SELECT COUNT(*) FROM visitors WHERE payment_status = 'Pending'");
    const pendingPayments = pendingRes.rows[0].count;

    const lowStockAlerts = 0;
    const activeMembers = activeSwimmers;

    res.json({
      todayVisitors,
      todayRevenue,
      activeSwimmers,
      monthlyIncome,
      pendingPayments,
      lowStockAlerts,
      activeMembers
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

// Create Entry
app.post('/api/visitors/entry', async (req, res) => {
  try {
    const { name, phone, type, locker_number, ticket_price, payment_status } = req.body;
    if (!name || !type || ticket_price === undefined) {
      return res.status(400).json({ error: "Name, ticket type, and price are required" });
    }
    const ticketId = generateTicketId();
    const newEntry = await db.query(
      "INSERT INTO visitors (name, phone, type, locker_number, ticket_id, barcode_value, ticket_price, payment_status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *",
      [name, phone || '', type, locker_number || '', ticketId, ticketId, ticket_price, payment_status || 'Paid']
    );
    res.json(await attachTicketPdf(newEntry.rows[0]));
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

app.get('/api/tickets/:id/download', async (req, res) => {
  try {
    const { id } = req.params;
    const visitorRes = await db.query(
      "SELECT * FROM visitors WHERE id::text = $1 OR ticket_id = $1 LIMIT 1",
      [id]
    );

    if (visitorRes.rows.length === 0) {
      return res.status(404).json({ error: "Ticket not found" });
    }

    const visitor = visitorRes.rows[0];
    const existingTicketPath = visitor.ticket_pdf_path ? path.join(__dirname, visitor.ticket_pdf_path) : null;
    const shouldRegenerate = !visitor.ticket_id || !visitor.barcode_value || !existingTicketPath || !fs.existsSync(existingTicketPath);
    const ticket = !shouldRegenerate
      ? {
          relativePath: visitor.ticket_pdf_path,
          absolutePath: existingTicketPath
        }
      : await generateTicketPdf(visitor);

    if (shouldRegenerate || visitor.ticket_pdf_path !== ticket.relativePath) {
      await attachTicketPdf({ ...visitor, ticket_id: ticket.ticketId, barcode_value: ticket.barcodeValue });
    }

    const disposition = req.query.inline === '1' ? 'inline' : 'attachment';
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `${disposition}; filename="${ticket.ticketId || visitor.ticket_id || id}.pdf"`);
    res.sendFile(ticket.absolutePath);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

app.get('/api/settings/pricing', async (req, res) => {
  try {
    const result = await db.query("SELECT key, value FROM settings WHERE key IN ('adult_price', 'child_price', 'pool_capacity') ORDER BY key");
    const settings = result.rows.reduce((acc, row) => ({ ...acc, [row.key]: row.value }), {});
    res.json({
      adult_price: Number(settings.adult_price || 300),
      child_price: Number(settings.child_price || 150),
      pool_capacity: Number(settings.pool_capacity || 120)
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

app.put('/api/settings/pricing', async (req, res) => {
  try {
    const adultPrice = Number(req.body.adult_price);
    const childPrice = Number(req.body.child_price);
    const poolCapacity = Number(req.body.pool_capacity || 120);
    if (Number.isNaN(adultPrice) || Number.isNaN(childPrice) || Number.isNaN(poolCapacity) || adultPrice < 0 || childPrice < 0 || poolCapacity < 1) {
      return res.status(400).json({ error: "Adult price, child price, and pool capacity must be valid numbers" });
    }

    await db.query(
      `INSERT INTO settings (key, value)
       VALUES ('adult_price', $1), ('child_price', $2), ('pool_capacity', $3)
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
      [String(adultPrice), String(childPrice), String(poolCapacity)]
    );

    res.json({ adult_price: adultPrice, child_price: childPrice, pool_capacity: poolCapacity });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

// Update Exit Time
app.put('/api/visitors/exit/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateExit = await db.query(
      "UPDATE visitors SET exit_time = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *",
      [id]
    );
    res.json(updateExit.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

// Get All Visitors (Recent)
app.get('/api/visitors', async (req, res) => {
  try {
    const visitors = await db.query("SELECT * FROM visitors ORDER BY entry_time DESC LIMIT 100");
    res.json(visitors.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

// Edit Visitor
app.put('/api/visitors/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, phone, type, ticket_price, payment_status, exit_time, locker_number } = req.body;
    if (!name || !type || ticket_price === undefined || !payment_status) {
      return res.status(400).json({ error: "Name, type, price, and payment status are required" });
    }
    const updatedVisitor = await db.query(
      `UPDATE visitors
       SET name = $1,
           phone = $2,
           type = $3,
           ticket_price = $4,
           payment_status = $5,
           exit_time = $6,
           locker_number = $8
       WHERE id = $7
       RETURNING *`,
      [
        name,
        phone || '',
        type,
        parseFloat(ticket_price),
        payment_status,
        exit_time || null,
        id,
        locker_number || ''
      ]
    );

    if (updatedVisitor.rows.length === 0) {
      return res.status(404).json({ error: "Visitor not found" });
    }

    res.json(await attachTicketPdf(updatedVisitor.rows[0]));
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

// Get Weekly Visitors count (grouped by day of current week)
app.get('/api/dashboard/weekly-visitors', async (req, res) => {
  try {
    const analytics = await db.getDashboardAnalytics();
    res.json(analytics.weekly);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

app.get('/api/dashboard/analytics', async (req, res) => {
  try {
    const analytics = await db.getDashboardAnalytics();
    res.json(analytics);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

app.get('/api/admin/overview', async (req, res) => {
  try {
    const overview = await db.getAdminOverview();
    res.json(overview);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

// Update Visitor Payment Status to Paid
app.put('/api/visitors/pay/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updatePay = await db.query(
      "UPDATE visitors SET payment_status = 'Paid' WHERE id = $1 RETURNING *",
      [id]
    );
    if (updatePay.rows.length === 0) {
      return res.status(404).json({ error: "Visitor not found" });
    }
    res.json(await attachTicketPdf(updatePay.rows[0]));
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

app.delete('/api/visitors/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await db.query("DELETE FROM visitors WHERE id = $1 RETURNING *", [id]);
    if (deleted.rows.length === 0) {
      return res.status(404).json({ error: "Visitor not found" });
    }
    res.json({ message: "Visitor deleted successfully", visitor: deleted.rows[0] });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

const PORT = process.env.PORT || 5000;
const startServer = async () => {
  try {
    await db.initDB();
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error("Failed to start server:", err);
  }
};

startServer();
