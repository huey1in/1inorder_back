const Order = require('../models/Order');
const Product = require('../models/Product');
const Cart = require('../models/Cart');
const Shop = require('../models/Shop');

const createOrder = async (req, res) => {
  try {
    const {
      items, order_type, delivery_address, notes,
      table_number, contact_name, contact_phone, cart_item_ids
    } = req.body;

    const userId = req.user.id;

    // 获取店铺信息
    const shop = await Shop.getInfo();

    // 检查店铺是否营业
    const isOpen = await Shop.isOpen();
    if (!isOpen) {
      return res.status(400).json({
        success: false,
        message: '店铺暂未营业，请稍后再试'
      });
    }

    let orderItems = [];
    let calculatedTotal = 0;

    for (const item of items) {
      const product = await Product.findById(item.product_id);
      if (!product) {
        return res.status(400).json({
          success: false,
          message: `ID 为 ${item.product_id} 的商品不存在`
        });
      }

      if (!product.is_available) {
        return res.status(400).json({
          success: false,
          message: `商品 ${product.name} 暂不可售`
        });
      }

      if (product.stock_quantity < item.quantity) {
        return res.status(400).json({
          success: false,
          message: `${product.name} 库存不足`
        });
      }

      const itemTotal = parseFloat(product.price) * item.quantity;
      calculatedTotal += itemTotal;

      orderItems.push({
        product_id: item.product_id,
        quantity: item.quantity,
        price: product.price,
        notes: item.notes || null,
        update_stock: item.update_stock !== false
      });
    }

    // 使用前端传入的总金额或后端计算的总金额
    // 检查最低起送金额（外卖订单，基于商品金额）
    if (order_type === 'delivery') {
      const minOrderAmount = parseFloat(shop.min_order_amount) || 0;
      if (minOrderAmount > 0 && calculatedTotal < minOrderAmount) {
        return res.status(400).json({
          success: false,
          message: `商品金额不满足最低起送金额 ¥${minOrderAmount}，当前商品金额 ¥${calculatedTotal.toFixed(2)}`
        });
      }
    }

    // 计算配送费（仅外卖订单）
    let deliveryFee = 0;
    if (order_type === 'delivery') {
      deliveryFee = parseFloat(shop.delivery_fee) || 0;
    }
    
    // 最终订单金额 = 商品金额 + 配送费
    const finalTotal = calculatedTotal + deliveryFee;

    const order = await Order.create({
      user_id: userId,
      total_amount: finalTotal,
      delivery_fee: deliveryFee,
      order_type: order_type || 'pickup',
      delivery_address,
      notes,
      items: orderItems,
      table_number,
      contact_name,
      contact_phone
    });

    // 清空购物车中已下单的商品
    if (cart_item_ids && cart_item_ids.length > 0) {
      await Cart.removeItems(userId, cart_item_ids);
    }

    res.status(201).json({
      success: true,
      message: '订单创建成功',
      data: { order }
    });

  } catch (error) {
    console.error('Create order error:', error);
    console.error('Error details:', error.message, error.stack);
    res.status(500).json({
      success: false,
      message: '创建订单失败',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const getMyOrders = async (req, res) => {
  try {
    const userId = req.user.id;
    const { status, page, limit } = req.query;

    const filters = {
      status,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 10
    };

    const result = await Order.getByUser(userId, filters);

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('Get my orders error:', error);
    res.status(500).json({
      success: false,
      message: '获取订单失败'
    });
  }
};

const getOrderById = async (req, res) => {
  try {
    const { id } = req.params;

    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: '订单不存在'
      });
    }

    if (req.user.role !== 'admin' &&
        order.user_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: '无权访问该订单'
      });
    }

    res.json({
      success: true,
      data: { order }
    });

  } catch (error) {
    console.error('Get order by ID error:', error);
    res.status(500).json({
      success: false,
      message: '获取订单失败'
    });
  }
};

const updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: '订单不存在'
      });
    }

    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: '无权访问'
      });
    }

    const updatedOrder = await Order.updateStatus(id, status, notes);

    res.json({
      success: true,
      message: '订单状态更新成功',
      data: { order: updatedOrder }
    });

  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({
      success: false,
      message: '更新订单状态失败'
    });
  }
};

const updatePaymentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { payment_status } = req.body;

    // 验证支付状态参数
    if (!payment_status) {
      return res.status(400).json({
        success: false,
        message: '支付状态为必填项'
      });
    }

    // 验证有效的支付状态值
    const validStatuses = ['unpaid', 'paid', 'refunded'];
    if (!validStatuses.includes(payment_status)) {
      return res.status(400).json({
        success: false,
        message: `支付状态无效，必须为：${validStatuses.join(', ')}`
      });
    }

    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: '订单不存在'
      });
    }

    // 权限检查：只有管理员可以更新支付状态
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: '无权访问，需要管理员权限'
      });
    }

    // 更新支付状态
    const updatedOrder = await Order.updatePaymentStatus(id, payment_status);

    // 模拟支付模式：返回固定成功响应
    res.json({
      success: true,
      message: `支付状态已更新为 ${payment_status}`,
      data: {
        payment_status: payment_status,
        order: updatedOrder
      }
    });

  } catch (error) {
    console.error('Update payment status error:', error);
    res.status(500).json({
      success: false,
      message: error.message || '更新支付状态失败'
    });
  }
};

const payOrder = async (req, res) => {
  try {
    const { id } = req.params;

    // 查找订单
    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: '订单不存在'
      });
    }

    // 权限检查：用户只能支付自己的订单，管理员可以操作任何订单
    if (req.user.role !== 'admin' && order.user_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: '无权操作，只能支付自己的订单'
      });
    }

    // 检查订单是否已支付
    if (order.payment_status === 'paid') {
      return res.status(400).json({
        success: false,
        message: '订单已完成支付'
      });
    }

    // 检查订单状态是否允许支付
    if (order.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: '已取消的订单无法支付'
      });
    }

    // 更新支付状态为已支付
    const updatedOrder = await Order.updatePaymentStatus(id, 'paid');

    res.json({
      success: true,
      message: '支付成功',
      data: {
        payment_status: 'paid',
        order: updatedOrder
      }
    });

  } catch (error) {
    console.error('Pay order error:', error);
    res.status(500).json({
      success: false,
      message: error.message || '支付失败'
    });
  }
};

const cancelOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    // 查找订单
    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: '订单不存在'
      });
    }

    // 权限检查：用户只能取消自己的订单，管理员可以取消任何订单
    if (req.user.role !== 'admin' && order.user_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: '无权操作，只能取消自己的订单'
      });
    }

    // 检查订单状态是否允许取消
    if (order.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: '订单已取消'
      });
    }

    if (order.status === 'delivered') {
      return res.status(400).json({
        success: false,
        message: '订单已送达，无法取消'
      });
    }

    // 取消订单并恢复库存
    const cancelledOrder = await Order.cancel(id, reason || 'Order cancelled by user');

    res.json({
      success: true,
      message: '订单取消成功',
      data: { 
        order: cancelledOrder,
        reason: reason || '用户取消订单'
      }
    });

  } catch (error) {
    console.error('Cancel order error:', error);
    res.status(400).json({
      success: false,
      message: error.message || '取消订单失败'
    });
  }
};

const deleteOrder = async (req, res) => {
  try {
    const { id } = req.params;

    // 查找订单
    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: '订单不存在'
      });
    }

    // 权限检查：用户只能删除自己的订单，管理员可以删除任何订单
    if (req.user.role !== 'admin' && order.user_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: '无权操作，只能删除自己的订单'
      });
    }

    // 业务规则：只能删除已取消或已完成的订单
    if (!['cancelled', 'delivered'].includes(order.status)) {
      return res.status(400).json({
        success: false,
        message: '仅允许删除已取消或已送达的订单'
      });
    }

    // 删除订单
    const deleted = await Order.deleteById(id);
    if (!deleted) {
      return res.status(500).json({
        success: false,
        message: '删除订单失败'
      });
    }

    res.json({
      success: true,
      message: '订单删除成功',
      data: {
        orderId: id
      }
    });

  } catch (error) {
    console.error('Delete order error:', error);
    res.status(500).json({
      success: false,
      message: error.message || '删除订单失败'
    });
  }
};

const getOrderStatistics = async (req, res) => {
  try {
    const { start_date, end_date } = req.query;

    const filters = {
      start_date,
      end_date
    };

    const statistics = await Order.getStatistics(filters);

    res.json({
      success: true,
      data: statistics
    });

  } catch (error) {
    console.error('Get order statistics error:', error);
    res.status(500).json({
      success: false,
      message: '获取订单统计失败'
    });
  }
};

module.exports = {
  createOrder,
  getMyOrders,
  getOrderById,
  updateOrderStatus,
  updatePaymentStatus,
  payOrder,
  cancelOrder,
  deleteOrder,
  getOrderStatistics
};
