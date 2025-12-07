const Shop = require('../models/Shop');

/**
 * 获取店铺信息
 */
const getShopInfo = async (req, res) => {
  try {
    const shop = await Shop.getInfo();
    const isOpen = await Shop.isOpen();

    res.json({
      success: true,
      data: {
        shop: {
          ...shop,
          is_currently_open: isOpen
        }
      }
    });
  } catch (error) {
    console.error('Get shop info error:', error);
    res.status(500).json({
      success: false,
      message: '获取店铺信息失败'
    });
  }
};

/**
 * 更新店铺信息（管理员）
 */
const updateShopInfo = async (req, res) => {
  try {
    const updateData = req.body;
    const shop = await Shop.update(updateData);

    res.json({
      success: true,
      message: '店铺信息更新成功',
      data: { shop }
    });
  } catch (error) {
    console.error('Update shop info error:', error);
    res.status(500).json({
      success: false,
      message: '更新店铺信息失败'
    });
  }
};

/**
 * 获取店铺公告
 */
const getAnnouncement = async (req, res) => {
  try {
    const announcement = await Shop.getAnnouncement();

    res.json({
      success: true,
      data: { announcement }
    });
  } catch (error) {
    console.error('Get announcement error:', error);
    res.status(500).json({
      success: false,
      message: '获取公告失败'
    });
  }
};

/**
 * 更新店铺公告（管理员）
 */
const updateAnnouncement = async (req, res) => {
  try {
    const { announcement } = req.body;
    await Shop.updateAnnouncement(announcement);

    res.json({
      success: true,
      message: '公告更新成功',
      data: { announcement }
    });
  } catch (error) {
    console.error('Update announcement error:', error);
    res.status(500).json({
      success: false,
      message: '更新公告失败'
    });
  }
};

/**
 * 切换营业状态（管理员）
 */
const toggleOpen = async (req, res) => {
  try {
    const { is_open } = req.body;
    const shop = await Shop.toggleOpen(is_open);

    res.json({
      success: true,
      message: is_open ? '店铺已开启营业' : '店铺已暂停营业',
      data: { shop }
    });
  } catch (error) {
    console.error('Toggle open error:', error);
    res.status(500).json({
      success: false,
      message: '切换营业状态失败'
    });
  }
};

/**
 * 检查店铺是否营业
 */
const checkOpen = async (req, res) => {
  try {
    const isOpen = await Shop.isOpen();
    const shop = await Shop.getInfo();

    res.json({
      success: true,
      data: {
        is_open: isOpen,
        opening_hours: shop.opening_hours,
        announcement: shop.announcement
      }
    });
  } catch (error) {
    console.error('Check open error:', error);
    res.status(500).json({
      success: false,
      message: '检查营业状态失败'
    });
  }
};

module.exports = {
  getShopInfo,
  updateShopInfo,
  getAnnouncement,
  updateAnnouncement,
  toggleOpen,
  checkOpen
};
