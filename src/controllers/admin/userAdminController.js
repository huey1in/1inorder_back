const User = require('../../models/User');

const listUsers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || '';

    let users, pagination;

    if (search) {
      // 简单搜索实现
      const allUsers = await User.getAll(1, 1000);
      const filteredUsers = allUsers.users.filter(user =>
        user.username.toLowerCase().includes(search.toLowerCase()) ||
        user.email.toLowerCase().includes(search.toLowerCase())
      );

      const start = (page - 1) * limit;
      const end = start + limit;
      users = filteredUsers.slice(start, end);

      pagination = {
        page,
        limit,
        total: filteredUsers.length,
        pages: Math.ceil(filteredUsers.length / limit)
      };
    } else {
      const result = await User.getAll(page, limit);
      users = result.users;
      pagination = result.pagination;
    }

    res.render('admin/users', {
      users,
      pagination,
      search,
      user: req.session.adminUser,
      success: req.query.success,
      error: req.query.error
    });

  } catch (error) {
    console.error('List users error:', error);
    res.render('admin/users', {
      users: [],
      pagination: { page: 1, limit: 10, total: 0, pages: 0 },
      search: '',
      user: req.session.adminUser,
      error: '获取用户列表失败'
    });
  }
};

const showUser = async (req, res) => {
  try {
    const { id } = req.params;
    const userInfo = await User.findById(id);

    if (!userInfo) {
      return res.redirect('/admin/users?error=用户不存在');
    }

    const { password, ...userWithoutPassword } = userInfo;

    res.render('admin/user-detail', {
      userInfo: userWithoutPassword,
      user: req.session.adminUser
    });

  } catch (error) {
    console.error('Show user error:', error);
    res.redirect('/admin/users?error=获取用户信息失败');
  }
};

const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { username, email, phone, role, is_active } = req.body;

    const userInfo = await User.findById(id);
    if (!userInfo) {
      return res.redirect('/admin/users?error=用户不存在');
    }

    if (req.session.adminUser.id == id) {
      return res.redirect('/admin/users?error=不能修改自己的账户');
    }

    if (username && username !== userInfo.username) {
      const existingUser = await User.findByUsername(username);
      if (existingUser && existingUser.id != id) {
        return res.redirect(`/admin/users/${id}?error=用户名已存在`);
      }
    }

    if (email && email !== userInfo.email) {
      const existingUser = await User.findByEmail(email);
      if (existingUser && existingUser.id != id) {
        return res.redirect(`/admin/users/${id}?error=邮箱已存在`);
      }
    }

    const updateData = {};
    if (username) updateData.username = username;
    if (email) updateData.email = email;
    if (phone !== undefined) updateData.phone = phone;
    if (role) updateData.role = role;
    if (is_active !== undefined) updateData.is_active = is_active === 'true';

    await User.updateById(id, updateData);

    res.redirect(`/admin/users/${id}?success=用户信息更新成功`);

  } catch (error) {
    console.error('Update user error:', error);
    res.redirect(`/admin/users/${req.params.id}?error=更新用户信息失败`);
  }
};

const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    const userInfo = await User.findById(id);
    if (!userInfo) {
      return res.redirect('/admin/users?error=用户不存在');
    }

    if (req.session.adminUser.id == id) {
      return res.redirect('/admin/users?error=不能删除自己的账户');
    }

    await User.delete(id);

    res.redirect('/admin/users?success=用户删除成功');

  } catch (error) {
    console.error('Delete user error:', error);
    res.redirect('/admin/users?error=删除用户失败');
  }
};

const toggleUserStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { action } = req.body;

    const userInfo = await User.findById(id);
    if (!userInfo) {
      return res.redirect('/admin/users?error=用户不存在');
    }

    if (req.session.adminUser.id == id) {
      return res.redirect('/admin/users?error=不能修改自己的账户状态');
    }

    const is_active = action === 'activate';
    await User.updateById(id, { is_active });

    const message = is_active ? '用户激活成功' : '用户停用成功';
    res.redirect(`/admin/users?success=${message}`);

  } catch (error) {
    console.error('Toggle user status error:', error);
    res.redirect('/admin/users?error=修改用户状态失败');
  }
};

// API版本的用户管理函数
const getUsersApi = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const keyword = req.query.keyword || '';
    const status = req.query.status; // 1 或 0

    let users, pagination;

    // 获取所有用户然后筛选
    const allUsers = await User.getAll(1, 1000);
    let filteredUsers = allUsers.users;

    // 关键词搜索（昵称或手机号）
    if (keyword) {
      const lowerKeyword = keyword.toLowerCase();
      filteredUsers = filteredUsers.filter(user =>
        (user.nickname && user.nickname.toLowerCase().includes(lowerKeyword)) ||
        (user.phone && user.phone.includes(keyword))
      );
    }

    // 状态筛选
    if (status !== undefined && status !== '') {
      const isActive = parseInt(status);
      filteredUsers = filteredUsers.filter(user => user.is_active === isActive);
    }

    // 分页
    const total = filteredUsers.length;
    const start = (page - 1) * limit;
    const end = start + limit;
    users = filteredUsers.slice(start, end);

    pagination = {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    };

    // 移除密码字段
    const safeUsers = users.map(user => {
      const { password, ...userWithoutPassword } = user;
      return userWithoutPassword;
    });

    res.json({
      success: true,
      data: {
        users: safeUsers,
        pagination
      }
    });

  } catch (error) {
    console.error('Get users API error:', error);
    res.status(500).json({
      success: false,
      message: '获取用户列表失败'
    });
  }
};

const toggleUserStatusApi = async (req, res) => {
  try {
    const { id } = req.params;

    console.log('Toggle user status request:');
    console.log('- User ID from params:', id);
    console.log('- Admin user ID from session:', req.session.adminUser?.id);
    console.log('- Admin user from session:', req.session.adminUser);

    const userInfo = await User.findById(id);
    console.log('- Found user info:', userInfo ? { id: userInfo.id, username: userInfo.username, is_active: userInfo.is_active } : null);

    if (!userInfo) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }

    if (parseInt(req.session.adminUser.id) === parseInt(id)) {
      console.log('- Blocking: Admin trying to modify own status');
      return res.status(400).json({
        success: false,
        message: '不能修改自己的账户状态'
      });
    }

    const is_active = userInfo.is_active ? 0 : 1;
    console.log('- Changing is_active from', userInfo.is_active, 'to', is_active);

    await User.updateById(id, { is_active });
    console.log('- User status updated successfully');

    res.json({
      success: true,
      message: is_active === 1 ? '用户激活成功' : '用户停用成功'
    });

  } catch (error) {
    console.error('Toggle user status API error:', error);
    res.status(500).json({
      success: false,
      message: '修改用户状态失败: ' + error.message
    });
  }
};

const deleteUserApi = async (req, res) => {
  try {
    const { id } = req.params;

    const userInfo = await User.findById(id);
    if (!userInfo) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }

    if (parseInt(req.session.adminUser.id) === parseInt(id)) {
      return res.status(400).json({
        success: false,
        message: '不能删除自己的账户'
      });
    }

    if (userInfo.role === 'admin') {
      return res.status(400).json({
        success: false,
        message: '不能删除管理员账户'
      });
    }

    await User.delete(id);

    res.json({
      success: true,
      message: '用户删除成功'
    });

  } catch (error) {
    console.error('Delete user API error:', error);
    res.status(500).json({
      success: false,
      message: '删除用户失败'
    });
  }
};

module.exports = {
  listUsers,
  showUser,
  updateUser,
  deleteUser,
  toggleUserStatus,
  getUsersApi,
  toggleUserStatusApi,
  deleteUserApi
};