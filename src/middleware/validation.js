const { body, param, query, validationResult } = require('express-validator');

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: '参数校验失败',
      errors: errors.array()
    });
  }
  next();
};

const userValidation = {
  register: [
    body('password')
      .isLength({ min: 6, max: 20 })
      .withMessage('密码长度为6-20位'),

    body('phone')
      .notEmpty()
      .withMessage('手机号为必填项')
      .isMobilePhone('any')
      .withMessage('请输入有效手机号'),

    handleValidationErrors
  ],

  login: [
    body('phone')
      .notEmpty()
      .withMessage('手机号为必填项')
      .isMobilePhone('any')
      .withMessage('请输入有效手机号'),

    body('password')
      .notEmpty()
      .withMessage('密码为必填项'),

    handleValidationErrors
  ],

  updateProfile: [
    body('phone')
      .optional()
      .isMobilePhone('any')
      .withMessage('请输入有效手机号'),

    handleValidationErrors
  ]
};

const productValidation = {
  create: [
    body('name')
      .isLength({ min: 1, max: 200 })
      .withMessage('商品名必填且不超过 200 个字符'),

    body('price')
      .isFloat({ min: 0 })
      .withMessage('价格必须是非负数'),

    body('category_id')
      .isInt({ min: 1 })
      .withMessage('需要有效的分类 ID'),

    body('stock_quantity')
      .optional()
      .isInt({ min: 0 })
      .withMessage('库存必须是不小于 0 的整数'),

    handleValidationErrors
  ],

  update: [
    param('id')
      .isInt({ min: 1 })
      .withMessage('需要有效的商品 ID'),

    body('name')
      .optional()
      .isLength({ min: 1, max: 200 })
      .withMessage('商品名需在 200 个字符以内'),

    body('price')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('价格必须是非负数'),

    handleValidationErrors
  ]
};

const orderValidation = {
  create: [
    body('items')
      .isArray({ min: 1 })
      .withMessage('订单至少包含 1 个商品'),

    body('items.*.product_id')
      .isInt({ min: 1 })
      .withMessage('每个商品需要有效的商品 ID'),

    body('items.*.quantity')
      .isInt({ min: 1 })
      .withMessage('每个商品的数量至少为 1'),

    body('order_type')
      .isIn(['delivery', 'pickup', 'dine_in'])
      .withMessage('订单类型必须是 delivery/pickup/dine_in'),

    body('delivery_address')
      .if(body('order_type').equals('delivery'))
      .notEmpty()
      .withMessage('外送订单必须提供配送地址'),

    handleValidationErrors
  ],

  updateStatus: [
    param('id')
      .isInt({ min: 1 })
      .withMessage('需要有效的订单 ID'),

    body('status')
      .isIn(['pending', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled'])
      .withMessage('订单状态无效'),

    handleValidationErrors
  ],

  updatePayment: [
    param('id')
      .isInt({ min: 1 })
      .withMessage('需要有效的订单 ID'),

    body('payment_status')
      .notEmpty()
      .withMessage('支付状态为必填项')
      .isIn(['unpaid', 'paid', 'refunded'])
      .withMessage('支付状态必须为 unpaid/paid/refunded 之一'),

    handleValidationErrors
  ],

  cancel: [
    param('id')
      .isInt({ min: 1 })
      .withMessage('需要有效的订单 ID'),

    body('reason')
      .optional()
      .isString()
      .isLength({ max: 500 })
      .withMessage('取消原因需在 500 个字符以内'),

    handleValidationErrors
  ]
};

const paginationValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('page 必须为正整数'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('limit 需在 1~100 之间'),

  handleValidationErrors
];

module.exports = {
  handleValidationErrors,
  userValidation,
  productValidation,
  orderValidation,
  paginationValidation
};
