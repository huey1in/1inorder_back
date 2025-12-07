const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { paginationValidation } = require('../middleware/validation');

router.get('/',
  authenticateToken,
  requireRole('admin'),
  paginationValidation,
  userController.getAllUsers
);

router.get('/:id',
  authenticateToken,
  requireRole('admin'),
  userController.getUserById
);

router.put('/:id',
  authenticateToken,
  requireRole('admin'),
  userController.updateUser
);

router.delete('/:id',
  authenticateToken,
  requireRole('admin'),
  userController.deleteUser
);

router.post('/:id/deactivate',
  authenticateToken,
  requireRole('admin'),
  userController.deactivateUser
);

router.post('/:id/activate',
  authenticateToken,
  requireRole('admin'),
  userController.activateUser
);

module.exports = router;