const Address = require('../models/Address');

/**
 * 获取用户地址列表
 */
const getAddresses = async (req, res) => {
  try {
    const userId = req.user.id;
    const addresses = await Address.getByUserId(userId);

    res.json({
      success: true,
      data: { addresses }
    });
  } catch (error) {
    console.error('Get addresses error:', error);
    res.status(500).json({
      success: false,
      message: '获取地址列表失败'
    });
  }
};

/**
 * 获取默认地址
 */
const getDefaultAddress = async (req, res) => {
  try {
    const userId = req.user.id;
    const address = await Address.getDefaultByUserId(userId);

    res.json({
      success: true,
      data: { address }
    });
  } catch (error) {
    console.error('Get default address error:', error);
    res.status(500).json({
      success: false,
      message: '获取默认地址失败'
    });
  }
};

/**
 * 获取地址详情
 */
const getAddressById = async (req, res) => {
  try {
    const { id } = req.params;
    const address = await Address.findById(id);

    if (!address) {
      return res.status(404).json({
        success: false,
        message: '地址不存在'
      });
    }

    // 检查是否是用户自己的地址
    if (address.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: '无权访问此地址'
      });
    }

    res.json({
      success: true,
      data: { address }
    });
  } catch (error) {
    console.error('Get address error:', error);
    res.status(500).json({
      success: false,
      message: '获取地址失败'
    });
  }
};

/**
 * 创建地址
 */
const createAddress = async (req, res) => {
  try {
    const userId = req.user.id;
    // 兼容前端字段 contact_name/contact_phone 和后端字段 name/phone
    const rawName = req.body.contact_name || req.body.name;
    const rawPhone = req.body.contact_phone || req.body.phone;
    const rawAddress = req.body.address || '';
    const rawDetail = req.body.detail || '';
    
    // 构造完整的详细地址
    const fullDetail = rawAddress + (rawDetail ? ' ' + rawDetail : '');

    // 使用默认值填充省市区，因为前端简化了地址输入
    const province = req.body.province || '默认省';
    const city = req.body.city || '默认市';
    const district = req.body.district || '默认区';
    
    const { is_default, tag } = req.body;

    if (!rawName || !rawPhone) {
        return res.status(400).json({
            success: false,
            message: '姓名和手机号不能为空'
        });
    }

    const address = await Address.create({
      user_id: userId,
      name: rawName,
      phone: rawPhone,
      province,
      city,
      district,
      detail: fullDetail,
      is_default,
      tag
    });

    res.status(201).json({
      success: true,
      message: '地址创建成功',
      data: { address }
    });
  } catch (error) {
    console.error('Create address error:', error);
    res.status(500).json({
      success: false,
      message: '创建地址失败'
    });
  }
};

/**
 * 更新地址
 */
const updateAddress = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    // 只保留数据库中存在的字段，过滤掉前端可能传递的不存在的字段
    const allowedFields = ['name', 'phone', 'province', 'city', 'district', 'detail', 'is_default', 'tag'];
    const updateData = {};
    
    // 映射前端字段到数据库字段
    if (req.body.contact_name) updateData.name = req.body.contact_name;
    if (req.body.contact_phone) updateData.phone = req.body.contact_phone;
    
    // 处理地址合并
    if (req.body.address) {
      const rawAddress = req.body.address || '';
      const rawDetail = req.body.detail || '';
      updateData.detail = rawAddress + (rawDetail ? ' ' + rawDetail : '');
    }
    
    // 复制其他允许的字段
    for (const field of allowedFields) {
      if (req.body[field] !== undefined && updateData[field] === undefined) {
        updateData[field] = req.body[field];
      }
    }

    // 检查地址是否存在
    const existingAddress = await Address.findById(id);
    if (!existingAddress) {
      return res.status(404).json({
        success: false,
        message: '地址不存在'
      });
    }

    // 检查权限
    if (existingAddress.user_id !== userId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: '无权修改此地址'
      });
    }

    const address = await Address.updateById(id, userId, updateData);

    res.json({
      success: true,
      message: '地址更新成功',
      data: { address }
    });
  } catch (error) {
    console.error('Update address error:', error);
    res.status(500).json({
      success: false,
      message: '更新地址失败'
    });
  }
};

/**
 * 设置默认地址
 */
const setDefaultAddress = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // 检查地址是否存在
    const existingAddress = await Address.findById(id);
    if (!existingAddress) {
      return res.status(404).json({
        success: false,
        message: '地址不存在'
      });
    }

    // 检查权限
    if (existingAddress.user_id !== userId) {
      return res.status(403).json({
        success: false,
        message: '无权操作此地址'
      });
    }

    const address = await Address.setDefault(id, userId);

    res.json({
      success: true,
      message: '默认地址设置成功',
      data: { address }
    });
  } catch (error) {
    console.error('Set default address error:', error);
    res.status(500).json({
      success: false,
      message: '设置默认地址失败'
    });
  }
};

/**
 * 删除地址
 */
const deleteAddress = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // 检查地址是否存在
    const existingAddress = await Address.findById(id);
    if (!existingAddress) {
      return res.status(404).json({
        success: false,
        message: '地址不存在'
      });
    }

    // 检查权限
    if (existingAddress.user_id !== userId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: '无权删除此地址'
      });
    }

    await Address.delete(id, userId);

    res.json({
      success: true,
      message: '地址删除成功'
    });
  } catch (error) {
    console.error('Delete address error:', error);
    res.status(500).json({
      success: false,
      message: '删除地址失败'
    });
  }
};

module.exports = {
  getAddresses,
  getDefaultAddress,
  getAddressById,
  createAddress,
  updateAddress,
  setDefaultAddress,
  deleteAddress
};
