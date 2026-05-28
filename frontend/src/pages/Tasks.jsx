import { useEffect, useState } from 'react';
import Swal from 'sweetalert2';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import api from '../api';
import './Tasks.css';

const emptyTask = { title: '', description: '', status: 'Pending', dueDate: '' };

const Tasks = () => {
  const [tasks, setTasks] = useState([]);
  const [taskForm, setTaskForm] = useState(emptyTask);

  const fetchTasks = async () => {
    const response = await api.get('/tasks');
    setTasks(response.data);
  };

  useEffect(() => {
    fetchTasks();
    const timer = setInterval(fetchTasks, 5000);
    return () => clearInterval(timer);
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    await api.post('/tasks', taskForm);
    setTaskForm(emptyTask);
    fetchTasks();
  };

  const handleEdit = async (task) => {
    const result = await Swal.fire({
      title: 'Edit Task',
      html: `
        <div class="task-modal-form">
          <label>Title</label>
          <input id="task-title" class="swal2-input" value="${task.title || ''}">
          <label>Description</label>
          <input id="task-description" class="swal2-input" value="${task.description || ''}">
          <label>Status</label>
          <select id="task-status" class="swal2-select">
            <option value="Pending" ${task.status === 'Pending' ? 'selected' : ''}>Pending</option>
            <option value="In Progress" ${task.status === 'In Progress' ? 'selected' : ''}>In Progress</option>
            <option value="Completed" ${task.status === 'Completed' || task.status === 'Done' ? 'selected' : ''}>Completed</option>
          </select>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Save',
      confirmButtonColor: '#06b6d4',
      background: '#ffffff',
      color: '#0f172a',
      preConfirm: () => ({
        title: document.getElementById('task-title').value.trim(),
        description: document.getElementById('task-description').value.trim(),
        status: document.getElementById('task-status').value,
        dueDate: task.due_date || task.dueDate || null
      })
    });

    if (!result.isConfirmed) return;
    await api.put(`/tasks/${task.id}`, result.value);
    fetchTasks();
  };

  const handleDelete = async (task) => {
    const result = await Swal.fire({
      title: 'Delete Task',
      text: `Delete "${task.title}"?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Delete',
      confirmButtonColor: '#ef4444',
      background: '#ffffff',
      color: '#0f172a'
    });

    if (!result.isConfirmed) return;
    await api.delete(`/tasks/${task.id}`);
    fetchTasks();
  };

  return (
    <div className="tasks-container">
      <header className="page-header">
        <h1 className="page-title">Tasks</h1>
        <p className="page-subtitle">Daily pool work, follow-ups, and staff reminders.</p>
      </header>

      <section className="tasks-grid">
        <form className="task-panel" onSubmit={handleSubmit}>
          <h2>Add Task</h2>
          <label>Title</label>
          <input className="input-field" value={taskForm.title} onChange={(event) => setTaskForm({ ...taskForm, title: event.target.value })} required />
          <label>Description</label>
          <input className="input-field" value={taskForm.description} onChange={(event) => setTaskForm({ ...taskForm, description: event.target.value })} />
          <label>Status</label>
          <select className="input-field" value={taskForm.status} onChange={(event) => setTaskForm({ ...taskForm, status: event.target.value })}>
            <option>Pending</option>
            <option>In Progress</option>
            <option>Completed</option>
          </select>
          <button className="btn btn-primary"><Plus size={16} /> Add Task</button>
        </form>

        <div className="task-panel task-table-panel">
          <h2>Task List</h2>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Task</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map((task) => (
                  <tr key={task.id}>
                    <td>
                      <strong>{task.title}</strong>
                      <span className="table-subtext">{task.description || 'No description'}</span>
                    </td>
                    <td>{task.status}</td>
                    <td>
                      <div className="row-actions">
                        <button className="btn btn-sm btn-quiet" type="button" onClick={() => handleEdit(task)}><Pencil size={14} /> Edit</button>
                        <button className="btn btn-sm btn-danger" type="button" onClick={() => handleDelete(task)}><Trash2 size={14} /> Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {tasks.length === 0 && (
                  <tr><td colSpan="3" className="text-center py-8 text-muted">No tasks yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Tasks;
