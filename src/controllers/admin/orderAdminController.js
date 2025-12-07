const Order = require('../../models/Order');

// 获取订单列表API
const getOrdersApi = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || '';
    const status = req.query.status || '';
    const payment_status = req.query.payment_status || '';

    const filters = {};
    if (search) {
      filters.search = search;
    }
    if (status) {
      filters.status = status;
    }
    if (payment_status) {
      filters.payment_status = payment_status;
    }

    const result = await Order.getAll({ page, limit, ...filters });

    // 为每个订单添加详细信息
    if (result.orders) {
      for (let order of result.orders) {
        try {
          const orderDetails = await Order.findById(order.id);
          order.items = orderDetails.items || [];
          order.user = orderDetails.user || {};
          order.restaurant = orderDetails.restaurant || {};
        } catch (error) {
          console.error('Error loading order details:', error);
          order.items = [];
          order.user = {};
          order.restaurant = {};
        }
      }
    }

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('Get orders API error:', error);
    res.status(500).json({
      success: false,
      message: '获取订单列表失败'
    });
  }
};

// 获取订单详情API
const getOrderDetailsApi = async (req, res) => {
  try {
    const { id } = req.params;

    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: '订单不存在'
      });
    }

    res.json({
      success: true,
      data: order
    });

  } catch (error) {
    console.error('Get order details API error:', error);
    res.status(500).json({
      success: false,
      message: '获取订单详情失败'
    });
  }
};

// 更新订单状态API
const updateOrderStatusApi = async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log('=== Update Order Status Debug ===');
    console.log('Params id:', id);
    console.log('Body:', JSON.stringify(req.body));
    console.log('Content-Type:', req.headers['content-type']);
    
    const { status } = req.body || {};

    if (!status) {
      return res.status(400).json({
        success: false,
        message: '缺少状态参数',
        debug: { body: req.body, contentType: req.headers['content-type'] }
      });
    }

    const validStatuses = ['pending', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `无效的订单状态: ${status}`
      });
    }

    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: '订单不存在'
      });
    }

    await Order.updateStatus(id, status);

    const statusNames = {
      pending: '待处理',
      confirmed: '已确认',
      preparing: '制作中',
      ready: '待取餐/配送中',
      delivered: '已完成',
      cancelled: '已取消'
    };

    res.json({
      success: true,
      message: `订单状态更新为${statusNames[status]}`
    });

  } catch (error) {
    console.error('Update order status API error:', error);
    res.status(500).json({
      success: false,
      message: '更新订单状态失败: ' + error.message
    });
  }
};

// 更新支付状态API
const updatePaymentStatusApi = async (req, res) => {
  try {
    const { id } = req.params;
    const { payment_status } = req.body;

    const validPaymentStatuses = ['unpaid', 'paid', 'refunded'];
    if (!validPaymentStatuses.includes(payment_status)) {
      return res.status(400).json({
        success: false,
        message: '无效的支付状态'
      });
    }

    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: '订单不存在'
      });
    }

    await Order.updatePaymentStatus(id, payment_status);

    const paymentStatusNames = {
      unpaid: '未支付',
      paid: '已支付',
      refunded: '已退款'
    };

    res.json({
      success: true,
      message: `支付状态更新为${paymentStatusNames[payment_status]}`
    });

  } catch (error) {
    console.error('Update payment status API error:', error);
    res.status(500).json({
      success: false,
      message: '更新支付状态失败: ' + error.message
    });
  }
};

// 删除订单API
const deleteOrderApi = async (req, res) => {
  try {
    const { id } = req.params;

    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: '订单不存在'
      });
    }

    // 只允许删除已取消的订单
    if (order.status !== 'cancelled') {
      return res.status(400).json({
        success: false,
        message: '只能删除已取消的订单'
      });
    }

    await Order.deleteById(id);

    res.json({
      success: true,
      message: '订单删除成功'
    });

  } catch (error) {
    console.error('Delete order API error:', error);
    res.status(500).json({
      success: false,
      message: '删除订单失败: ' + error.message
    });
  }
};

// 获取订单统计API
const getOrderStatsApi = async (req, res) => {
  try {
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));

    const [
      totalOrders,
      pendingOrders,
      completedOrders,
      cancelledOrders,
      todayOrders,
      monthlyRevenue
    ] = await Promise.all([
      Order.getStatistics({}),
      Order.getStatistics({ status: 'pending' }),
      Order.getStatistics({ status: 'delivered' }),
      Order.getStatistics({ status: 'cancelled' }),
      Order.getStatistics({ start_date: startOfDay.toISOString() }),
      Order.getStatistics({ start_date: startOfMonth.toISOString(), payment_status: 'paid' })
    ]);

    const stats = {
      totalOrders: totalOrders.total_orders || 0,
      pendingOrders: pendingOrders.total_orders || 0,
      completedOrders: completedOrders.total_orders || 0,
      cancelledOrders: cancelledOrders.total_orders || 0,
      todayOrders: todayOrders.total_orders || 0,
      monthlyRevenue: monthlyRevenue.total_revenue || 0
    };

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('Get order stats API error:', error);
    res.status(500).json({
      success: false,
      message: '获取订单统计失败'
    });
  }
};

module.exports = {
  getOrdersApi,
  getOrderDetailsApi,
  updateOrderStatusApi,
  updatePaymentStatusApi,
  deleteOrderApi,
  getOrderStatsApi
};