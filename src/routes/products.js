const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const { authenticateToken, requireRole, optionalAuth } = require('../middleware/auth');
const { productValidation, paginationValidation } = require('../middleware/validation');
const { upload, uploadErrorHandler, processUploadedFiles } = require('../middleware/upload');

router.get('/', optionalAuth, paginationValidation, productController.getProducts);

router.get('/featured', optionalAuth, productController.getFeaturedProducts);

router.get('/recommended', optionalAuth, productController.getRecommendedProducts);

router.get('/category/:categoryId', optionalAuth, productController.getProductsByCategory);

router.get('/:id', optionalAuth, productController.getProductById);

router.post('/',
  authenticateToken,
  requireRole('admin'),
  upload.array('images', 5),
  uploadErrorHandler,
  processUploadedFiles,
  productValidation.create,
  productController.createProduct
);

router.put('/:id',
  authenticateToken,
  requireRole('admin'),
  upload.array('images', 5),
  uploadErrorHandler,
  processUploadedFiles,
  productValidation.update,
  productController.updateProduct
);

router.delete('/:id',
  authenticateToken,
  requireRole('admin'),
  productController.deleteProduct
);

router.patch('/:id/stock',
  authenticateToken,
  requireRole('admin'),
  productController.updateStock
);

module.exports = router;