const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/categoryController');
const { authenticateToken, requireRole, optionalAuth } = require('../middleware/auth');

router.get('/', optionalAuth, categoryController.getCategories);

router.get('/tree', optionalAuth, categoryController.getCategoryTree);

router.get('/:id', optionalAuth, categoryController.getCategoryById);

router.get('/:id/children', optionalAuth, categoryController.getChildren);

router.post('/',
  authenticateToken,
  requireRole('admin'),
  categoryController.createCategory
);

router.put('/:id',
  authenticateToken,
  requireRole('admin'),
  categoryController.updateCategory
);

router.delete('/:id',
  authenticateToken,
  requireRole('admin'),
  categoryController.deleteCategory
);

module.exports = router;