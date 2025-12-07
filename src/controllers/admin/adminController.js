const User = require('../../models/User');
const Product = require('../../models/Product');
const Order = require('../../models/Order');

// 管理员登录
const adminLogin = async (req, res) => {
  try {
    const { phone, password } = req.body;

    if (!phone || !password) {
      return res.status(400).json({
        success: false,
        message: '请输入手机号和密码'
      });
    }

    const user = await User.findByPhone(phone);
    if (!user || user.role !== 'admin') {
      return res.status(401).json({
        success: false,
        message: '手机号或密码错误'
      });
    }

    const isValidPassword = await User.validatePassword(user, password);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: '手机号或密码错误'
      });
    }

    req.session.adminUser = {
      id: user.id,
      phone: user.phone,
      nickname: user.nickname,
      role: user.role
    };

    res.json({
      success: true,
      message: '登录成功',
      user: req.session.adminUser
    });

  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({
      success: false,
      message: '登录失败，请重试'
    });
  }
};

// 管理员退出
const adminLogout = (req, res) => {
  req.session.destroy(() => {
    res.json({ success: true, message: '退出登录成功' });
  });
};

// 获取仪表盘统计数据
const getDashboardStats = async (req, res) => {
  try {
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    const [
      totalUsers,
      totalProducts,
      monthlyStats,
      dailyStats
    ] = await Promise.all([
      User.getAll(1, 1).then(result => result.pagination.total),
      Product.getAll({ page: 1, limit: 1 }).then(result => result.pagination.total),
      Order.getStatistics({ start_date: startOfMonth.toISOString() }),
      Order.getStatistics({ start_date: startOfDay.toISOString() })
    ]);

    res.json({
      success: true,
      data: {
        userCount: totalUsers,
        productCount: totalProducts,
        monthlyOrders: monthlyStats.total_orders || 0,
        dailyOrders: dailyStats.total_orders || 0,
        monthlyRevenue: monthlyStats.total_revenue || 0,
        dailyRevenue: dailyStats.total_revenue || 0
      }
    });

  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({
      success: false,
      message: '获取统计数据失败'
    });
  }
};

module.exports = {
  adminLogin,
  adminLogout,
  getDashboardStats
};