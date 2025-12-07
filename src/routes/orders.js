const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { orderValidation, paginationValidation } = require('../middleware/validation');

router.get('/my',
  authenticateToken,
  paginationValidation,
  orderController.getMyOrders
);

router.get('/statistics',
  authenticateToken,
  requireRole('admin'),
  orderController.getOrderStatistics
);

router.get('/:id',
  authenticateToken,
  orderController.getOrderById
);

router.post('/',
  authenticateToken,
  orderValidation.create,
  orderController.createOrder
);

router.patch('/:id/status',
  authenticateToken,
  requireRole('admin'),
  orderValidation.updateStatus,
  orderController.updateOrderStatus
);

router.patch('/:id/payment',
  authenticateToken,
  requireRole('admin'),
  orderValidation.updatePayment,
  orderController.updatePaymentStatus
);

router.post('/:id/pay',
  authenticateToken,
  orderController.payOrder
);

router.post('/:id/cancel',
  authenticateToken,
  orderValidation.cancel,
  orderController.cancelOrder
);

router.delete('/:id',
  authenticateToken,
  orderController.deleteOrder
);

module.exports = router;