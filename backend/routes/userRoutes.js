const express = require('express');
const { getUsers } = require('../controllers/userController');
const { requireAuth } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/', requireAuth, getUsers);

module.exports = router;
