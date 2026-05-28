const express = require('express');
const { createTask, deleteTask, getTasks, updateTask } = require('../controllers/taskController');

const router = express.Router();

router.get('/', getTasks);
router.post('/', createTask);
router.put('/:id', updateTask);
router.delete('/:id', deleteTask);

module.exports = router;
