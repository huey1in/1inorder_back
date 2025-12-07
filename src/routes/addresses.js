const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const addressController = require('../controllers/addressController');
const { authenticateToken } = require('../middleware/auth');
const { handleValidationErrors } = require('../middleware/validation');

// 地址验证规则
const addressValidation = [
  body('contact_name').optional(),
  body('name').optional(),
  body('contact_phone').optional(),
  body('phone').optional(),
  // 移除严格的省市区验证，因为前端可能只传一个简单的地址字符串
  // body('province').notEmpty().withMessage('省份不能为空'),
  // body('city').notEmpty().withMessage('城市不能为空'),
  // body('district').notEmpty().withMessage('区县不能为空'),
  // body('detail').notEmpty().withMessage('详细地址不能为空'),
  handleValidationErrors
];

// 所有地址接口都需要登录
router.use(authenticateToken);

// 获取地址列表
router.get('/', addressController.getAddresses);

// 获取默认地址
router.get('/default', addressController.getDefaultAddress);

// 获取地址详情
router.get('/:id', addressController.getAddressById);

// 创建地址
router.post('/', addressValidation, addressController.createAddress);

// 更新地址
router.put('/:id', addressController.updateAddress);

// 设置默认地址
router.patch('/:id/default', addressController.setDefaultAddress);

// 删除地址
router.delete('/:id', addressController.deleteAddress);

module.exports = router;
