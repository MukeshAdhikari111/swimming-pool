const db = require('../db');

exports.getTasks = async (req, res) => {
  try {
    const tasks = await db.query('SELECT * FROM tasks ORDER BY created_at DESC');
    res.json(tasks.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server Error fetching tasks' });
  }
};

exports.createTask = async (req, res) => {
  try {
    const { title, description, status, dueDate } = req.body;
    if (!title) return res.status(400).json({ error: 'Task title is required' });

    const task = await db.query(
      'INSERT INTO tasks (title, description, status, due_date) VALUES ($1, $2, $3, $4) RETURNING *',
      [title.trim(), description || null, status || 'Pending', dueDate || null]
    );

    res.status(201).json(task.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server Error creating task' });
  }
};

exports.updateTask = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, status, dueDate } = req.body;
    if (!title) return res.status(400).json({ error: 'Task title is required' });

    const task = await db.query(
      `UPDATE tasks
       SET title = $1,
           description = $2,
           status = $3,
           due_date = $4,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $5
       RETURNING *`,
      [title.trim(), description || null, status || 'Pending', dueDate || null, id]
    );

    if (task.rows.length === 0) return res.status(404).json({ error: 'Task not found' });
    res.json(task.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server Error updating task' });
  }
};

exports.deleteTask = async (req, res) => {
  try {
    const task = await db.query('DELETE FROM tasks WHERE id = $1 RETURNING *', [req.params.id]);
    if (task.rows.length === 0) return res.status(404).json({ error: 'Task not found' });
    res.json({ message: 'Task deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server Error deleting task' });
  }
};
