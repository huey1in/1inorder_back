const Product = require('../../models/Product');
const Category = require('../../models/Category');

// 获取商品列表API
const getProductsApi = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const keyword = req.query.keyword || '';
    const category_id = req.query.category_id || '';
    const is_available = req.query.is_available;

    const filters = {
      page,
      limit,
      is_available: null  // 后台显示所有商品，包括下架的
    };

    if (keyword) {
      filters.search = keyword;
    }
    if (category_id) {
      filters.category_id = category_id;
    }
    // 如果前端传了状态筛选，才进行筛选
    if (is_available !== undefined && is_available !== '') {
      filters.is_available = parseInt(is_available);
    }

    const result = await Product.getAll(filters);

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('Get products API error:', error);
    res.status(500).json({
      success: false,
      message: '获取商品列表失败'
    });
  }
};

// 创建商品API
const createProductApi = async (req, res) => {
  try {
    const { name, description, price, category_id, restaurant_id, stock_quantity, is_active } = req.body;

    if (!name || !price || !category_id) {
      return res.status(400).json({
        success: false,
        message: '商品名称、价格和分类为必填项'
      });
    }

    const productData = {
      name,
      description,
      price: parseFloat(price),
      category_id: parseInt(category_id),
      restaurant_id: restaurant_id ? parseInt(restaurant_id) : null,
      stock_quantity: stock_quantity ? parseInt(stock_quantity) : 0,
      is_available: is_active !== undefined ? is_active : true
    };

    const product = await Product.create(productData);

    res.json({
      success: true,
      message: '商品创建成功',
      data: product
    });

  } catch (error) {
    console.error('Create product API error:', error);
    res.status(500).json({
      success: false,
      message: '创建商品失败: ' + error.message
    });
  }
};

// 更新商品API
const updateProductApi = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, price, category_id, restaurant_id, stock_quantity, is_active } = req.body;

    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: '商品不存在'
      });
    }

    const updateData = {};
    if (name) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (price) updateData.price = parseFloat(price);
    if (category_id) updateData.category_id = parseInt(category_id);
    if (restaurant_id !== undefined) updateData.restaurant_id = restaurant_id ? parseInt(restaurant_id) : null;
    if (stock_quantity !== undefined) updateData.stock_quantity = parseInt(stock_quantity);
    if (is_active !== undefined) updateData.is_available = is_active;

    await Product.updateById(id, updateData);

    res.json({
      success: true,
      message: '商品更新成功'
    });

  } catch (error) {
    console.error('Update product API error:', error);
    res.status(500).json({
      success: false,
      message: '更新商品失败: ' + error.message
    });
  }
};

// 删除商品API
const deleteProductApi = async (req, res) => {
  try {
    const { id } = req.params;

    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: '商品不存在'
      });
    }

    await Product.delete(id);

    res.json({
      success: true,
      message: '商品删除成功'
    });

  } catch (error) {
    console.error('Delete product API error:', error);
    res.status(500).json({
      success: false,
      message: '删除商品失败: ' + error.message
    });
  }
};

// 切换商品状态API
const toggleProductStatusApi = async (req, res) => {
  try {
    const { id } = req.params;

    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: '商品不存在'
      });
    }

    const is_available = product.is_available ? 0 : 1;
    await Product.updateById(id, { is_available });

    res.json({
      success: true,
      message: is_available === 1 ? '商品上架成功' : '商品下架成功'
    });

  } catch (error) {
    console.error('Toggle product status API error:', error);
    res.status(500).json({
      success: false,
      message: '修改商品状态失败: ' + error.message
    });
  }
};

// 获取分类列表API
const getCategoriesApi = async (req, res) => {
  try {
    const result = await Category.getAll({ type: 'product', is_active: 1 });
    const categories = result.categories || [];

    res.json({
      success: true,
      data: {
        categories: categories
      }
    });

  } catch (error) {
    console.error('Get categories API error:', error);
    res.status(500).json({
      success: false,
      message: '获取分类列表失败'
    });
  }
};

module.exports = {
  getProductsApi,
  createProductApi,
  updateProductApi,
  deleteProductApi,
  toggleProductStatusApi,
  getCategoriesApi
};