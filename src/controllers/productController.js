const Product = require('../models/Product');

const createProduct = async (req, res) => {
  try {
    const {
      name, description, price, original_price, sku, stock_quantity,
      category_id, restaurant_id, is_available, is_featured
    } = req.body;

    let images = [];
    if (req.uploadedFiles && Array.isArray(req.uploadedFiles)) {
      images = req.uploadedFiles.map(file => file.url);
    }

    const product = await Product.create({
      name,
      description,
      price,
      original_price,
      sku,
      stock_quantity,
      category_id,
      restaurant_id,
      images,
      is_available,
      is_featured
    });

    res.status(201).json({
      success: true,
      message: '商品创建成功',
      data: { product }
    });

  } catch (error) {
    console.error('Create product error:', error);
    console.error('Error details:', error.message, error.stack);
    res.status(500).json({
      success: false,
      message: '创建商品失败',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const getProducts = async (req, res) => {
  try {
    const {
      category_id, restaurant_id, is_available, is_featured,
      page, limit, search, min_price, max_price
    } = req.query;

    const filters = {
      category_id: category_id ? parseInt(category_id) : undefined,
      restaurant_id: restaurant_id ? parseInt(restaurant_id) : undefined,
      is_available: is_available !== undefined ? is_available === 'true' : true,
      is_featured: is_featured !== undefined ? is_featured === 'true' : undefined,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 10,
      search,
      min_price: min_price ? parseFloat(min_price) : undefined,
      max_price: max_price ? parseFloat(max_price) : undefined
    };

    const result = await Product.getAll(filters);

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({
      success: false,
      message: '获取商品列表失败'
    });
  }
};

const getProductById = async (req, res) => {
  try {
    const { id } = req.params;

    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: '商品不存在'
      });
    }

    res.json({
      success: true,
      data: { product }
    });

  } catch (error) {
    console.error('Get product by ID error:', error);
    res.status(500).json({
      success: false,
      message: '获取商品失败'
    });
  }
};

const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name, description, price, original_price, sku, stock_quantity,
      category_id, is_available, is_featured
    } = req.body;

    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: '商品不存在'
      });
    }

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (price !== undefined) updateData.price = price;
    if (original_price !== undefined) updateData.original_price = original_price;
    if (sku !== undefined) updateData.sku = sku;
    if (stock_quantity !== undefined) updateData.stock_quantity = stock_quantity;
    if (category_id !== undefined) updateData.category_id = category_id;
    if (is_available !== undefined) updateData.is_available = is_available;
    if (is_featured !== undefined) updateData.is_featured = is_featured;

    if (req.uploadedFiles && Array.isArray(req.uploadedFiles)) {
      updateData.images = req.uploadedFiles.map(file => file.url);
    }

    const updatedProduct = await Product.updateById(id, updateData);

    res.json({
      success: true,
      message: '商品更新成功',
      data: { product: updatedProduct }
    });

  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({
      success: false,
      message: '更新商品失败'
    });
  }
};

const deleteProduct = async (req, res) => {
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
    console.error('Delete product error:', error);
    res.status(500).json({
      success: false,
      message: '删除商品失败'
    });
  }
};

const getFeaturedProducts = async (req, res) => {
  try {
    const { limit } = req.query;

    const products = await Product.getFeatured(limit ? parseInt(limit) : null);

    res.json({
      success: true,
      data: { products }
    });

  } catch (error) {
    console.error('Get featured products error:', error);
    res.status(500).json({
      success: false,
      message: '获取精选商品失败'
    });
  }
};

const getProductsByCategory = async (req, res) => {
  try {
    const { categoryId } = req.params;
    const { limit = 10 } = req.query;

    const products = await Product.getByCategory(parseInt(categoryId), parseInt(limit));

    res.json({
      success: true,
      data: { products }
    });

  } catch (error) {
    console.error('Get products by category error:', error);
    res.status(500).json({
      success: false,
      message: '按分类获取商品失败'
    });
  }
};

const updateStock = async (req, res) => {
  try {
    const { id } = req.params;
    const { quantity, operation = 'decrease' } = req.body;

    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: '商品不存在'
      });
    }

    const newStock = await Product.updateStock(id, quantity, operation);

    res.json({
      success: true,
      message: '库存更新成功',
      data: { new_stock: newStock }
    });

  } catch (error) {
    console.error('Update stock error:', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

const getRecommendedProducts = async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    // 获取推荐商品（可以基于评分、销量等）
    const products = await Product.getRecommended(parseInt(limit));

    res.json({
      success: true,
      data: products
    });

  } catch (error) {
    console.error('Get recommended products error:', error);
    res.status(500).json({
      success: false,
      message: '获取推荐商品失败'
    });
  }
};

module.exports = {
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
  deleteProduct,
  getFeaturedProducts,
  getProductsByCategory,
  getRecommendedProducts,
  updateStock
};
