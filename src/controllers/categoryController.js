const Category = require('../models/Category');

const createCategory = async (req, res) => {
  try {
    const { name, description, image, parent_id, sort_order, type } = req.body;

    const category = await Category.create({
      name,
      description,
      image,
      parent_id,
      sort_order,
      type
    });

    res.status(201).json({
      success: true,
      message: '分类创建成功',
      data: { category }
    });

  } catch (error) {
    console.error('Create category error:', error);
    console.error('Error details:', error.message, error.stack);
    res.status(500).json({
      success: false,
      message: '创建分类失败',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const getCategories = async (req, res) => {
  try {
    const { type } = req.query;

    const result = await Category.getAll({ type, is_active: 1 });
    
    // getAll 返回 { categories, pagination }，前台只需要 categories 数组
    const categories = result.categories || [];

    res.json({
      success: true,
      data: { categories }
    });

  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({
      success: false,
      message: '获取分类失败'
    });
  }
};

const getCategoryTree = async (req, res) => {
  try {
    const { type } = req.query;

    const tree = await Category.getTree(type);

    res.json({
      success: true,
      data: { tree }
    });

  } catch (error) {
    console.error('Get category tree error:', error);
    res.status(500).json({
      success: false,
      message: '获取分类树失败'
    });
  }
};

const getCategoryById = async (req, res) => {
  try {
    const { id } = req.params;

    const category = await Category.findById(id);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: '分类不存在'
      });
    }

    res.json({
      success: true,
      data: { category }
    });

  } catch (error) {
    console.error('Get category by ID error:', error);
    res.status(500).json({
      success: false,
      message: '获取分类失败'
    });
  }
};

const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, image, parent_id, sort_order, is_active } = req.body;

    const category = await Category.findById(id);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: '分类不存在'
      });
    }

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (image !== undefined) updateData.image = image;
    if (parent_id !== undefined) updateData.parent_id = parent_id;
    if (sort_order !== undefined) updateData.sort_order = sort_order;
    if (is_active !== undefined) updateData.is_active = is_active;

    const updatedCategory = await Category.updateById(id, updateData);

    res.json({
      success: true,
      message: '分类更新成功',
      data: { category: updatedCategory }
    });

  } catch (error) {
    console.error('Update category error:', error);
    res.status(500).json({
      success: false,
      message: '更新分类失败'
    });
  }
};

const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;

    const category = await Category.findById(id);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: '分类不存在'
      });
    }

    const children = await Category.getChildren(id);
    if (children.length > 0) {
      return res.status(400).json({
        success: false,
        message: '该分类存在子分类，无法删除'
      });
    }

    await Category.delete(id);

    res.json({
      success: true,
      message: '分类删除成功'
    });

  } catch (error) {
    console.error('Delete category error:', error);
    res.status(500).json({
      success: false,
      message: '删除分类失败'
    });
  }
};

const getChildren = async (req, res) => {
  try {
    const { id } = req.params;

    const children = await Category.getChildren(id);

    res.json({
      success: true,
      data: { children }
    });

  } catch (error) {
    console.error('Get category children error:', error);
    res.status(500).json({
      success: false,
      message: '获取子分类失败'
    });
  }
};

module.exports = {
  createCategory,
  getCategories,
  getCategoryTree,
  getCategoryById,
  updateCategory,
  deleteCategory,
  getChildren
};
