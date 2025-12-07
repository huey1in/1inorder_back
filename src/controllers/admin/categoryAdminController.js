const Category = require('../../models/Category');

// 获取分类列表API
const getCategoriesApi = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || '';
    const type = req.query.type || '';

    const filters = {};
    if (search) {
      filters.search = search;
    }
    if (type) {
      filters.type = type;
    }

    const result = await Category.getAll({ page, limit, ...filters });

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('Get categories API error:', error);
    res.status(500).json({
      success: false,
      message: '获取分类列表失败'
    });
  }
};

// 创建分类API
const createCategoryApi = async (req, res) => {
  try {
    const { name, description, type, parent_id, sort_order, is_active } = req.body;

    if (!name || !type) {
      return res.status(400).json({
        success: false,
        message: '分类名称和类型为必填项'
      });
    }

    const validTypes = ['product', 'restaurant'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        message: '无效的分类类型'
      });
    }

    const categoryData = {
      name,
      description,
      type,
      parent_id: parent_id ? parseInt(parent_id) : null,
      sort_order: sort_order ? parseInt(sort_order) : 0,
      is_active: is_active !== undefined ? is_active : true
    };

    const category = await Category.create(categoryData);

    res.json({
      success: true,
      message: '分类创建成功',
      data: category
    });

  } catch (error) {
    console.error('Create category API error:', error);
    res.status(500).json({
      success: false,
      message: '创建分类失败: ' + error.message
    });
  }
};

// 更新分类API
const updateCategoryApi = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, type, parent_id, sort_order, is_active } = req.body;

    const category = await Category.findById(id);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: '分类不存在'
      });
    }

    const updateData = {};
    if (name) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (type) {
      const validTypes = ['product', 'restaurant'];
      if (!validTypes.includes(type)) {
        return res.status(400).json({
          success: false,
          message: '无效的分类类型'
        });
      }
      updateData.type = type;
    }
    if (parent_id !== undefined) updateData.parent_id = parent_id ? parseInt(parent_id) : null;
    if (sort_order !== undefined) updateData.sort_order = parseInt(sort_order);
    if (is_active !== undefined) updateData.is_active = is_active;

    // 检查父分类循环引用
    if (updateData.parent_id && updateData.parent_id == id) {
      return res.status(400).json({
        success: false,
        message: '不能将自己设为父分类'
      });
    }

    await Category.updateById(id, updateData);

    res.json({
      success: true,
      message: '分类更新成功'
    });

  } catch (error) {
    console.error('Update category API error:', error);
    res.status(500).json({
      success: false,
      message: '更新分类失败: ' + error.message
    });
  }
};

// 删除分类API
const deleteCategoryApi = async (req, res) => {
  try {
    const { id } = req.params;

    const category = await Category.findById(id);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: '分类不存在'
      });
    }

    // 检查是否有子分类
    const subCategories = await Category.getAll({ parent_id: id });
    if (subCategories.categories && subCategories.categories.length > 0) {
      return res.status(400).json({
        success: false,
        message: '该分类下还有子分类，无法删除'
      });
    }

    await Category.delete(id);

    res.json({
      success: true,
      message: '分类删除成功'
    });

  } catch (error) {
    console.error('Delete category API error:', error);
    res.status(500).json({
      success: false,
      message: '删除分类失败: ' + error.message
    });
  }
};

// 切换分类状态API
const toggleCategoryStatusApi = async (req, res) => {
  try {
    const { id } = req.params;

    const category = await Category.findById(id);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: '分类不存在'
      });
    }

    const is_active = category.is_active ? 0 : 1;
    await Category.updateById(id, { is_active });

    res.json({
      success: true,
      message: is_active === 1 ? '分类启用成功' : '分类停用成功'
    });

  } catch (error) {
    console.error('Toggle category status API error:', error);
    res.status(500).json({
      success: false,
      message: '修改分类状态失败: ' + error.message
    });
  }
};

// 获取父分类列表API
const getParentCategoriesApi = async (req, res) => {
  try {
    const type = req.query.type || 'product';
    const categories = await Category.getAll({ type, parent_id: null });

    res.json({
      success: true,
      data: categories.categories || []
    });

  } catch (error) {
    console.error('Get parent categories API error:', error);
    res.status(500).json({
      success: false,
      message: '获取父分类列表失败'
    });
  }
};

module.exports = {
  getCategoriesApi,
  createCategoryApi,
  updateCategoryApi,
  deleteCategoryApi,
  toggleCategoryStatusApi,
  getParentCategoriesApi
};