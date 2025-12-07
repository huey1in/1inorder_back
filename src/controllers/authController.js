const User = require('../models/User');
const { generateToken } = require('../middleware/auth');

/**
 * 微信小程序登录
 */
const wxLogin = async (req, res) => {
  try {
    const { code, userInfo } = req.body;

    if (!code) {
      return res.status(400).json({
        success: false,
        message: '缺少 code 参数'
      });
    }

    // 获取微信配置
    const appid = process.env.WX_APPID;
    const secret = process.env.WX_SECRET;

    if (!appid || !secret) {
      // 开发模式：模拟openid
      console.log('Development mode: using mock openid');
      const mockOpenid = 'mock_openid_' + Date.now();
      
      const user = await User.findOrCreateByOpenid(mockOpenid, userInfo || {});
      const token = generateToken(user.id);

      const { password: _, ...userWithoutPassword } = user;

      return res.json({
        success: true,
        message: '登录成功（开发模式）',
        data: {
          user: userWithoutPassword,
          token,
          isNewUser: !user.phone
        }
      });
    }

    // 调用微信接口获取openid
    const wxUrl = `https://api.weixin.qq.com/sns/jscode2session?appid=${appid}&secret=${secret}&js_code=${code}&grant_type=authorization_code`;
    
    const https = require('https');
    const wxResponse = await new Promise((resolve, reject) => {
      https.get(wxUrl, (resp) => {
        let data = '';
        resp.on('data', (chunk) => { data += chunk; });
        resp.on('end', () => { resolve(JSON.parse(data)); });
      }).on('error', reject);
    });

    if (wxResponse.errcode) {
      return res.status(400).json({
        success: false,
        message: '微信登录失败：' + wxResponse.errmsg
      });
    }

    const { openid, session_key } = wxResponse;

    // 查找或创建用户
    const user = await User.findOrCreateByOpenid(openid, userInfo || {});
    const token = generateToken(user.id);

    const { password: _, ...userWithoutPassword } = user;

    res.json({
      success: true,
      message: '登录成功',
      data: {
        user: userWithoutPassword,
        token,
        isNewUser: !user.phone // 是否需要绑定手机号
      }
    });

  } catch (error) {
    console.error('WeChat login error:', error);
    res.status(500).json({
      success: false,
      message: '微信登录失败'
    });
  }
};

/**
 * 绑定手机号
 */
const bindPhone = async (req, res) => {
  try {
    const { phone } = req.body;
    const userId = req.user.id;

    if (!phone) {
      return res.status(400).json({
        success: false,
        message: '手机号为必填项'
      });
    }

    // 检查手机号是否已被使用
    const existingUser = await User.findByPhone(phone);
    if (existingUser && existingUser.id !== userId) {
      return res.status(400).json({
        success: false,
        message: '手机号已被占用'
      });
    }

    const updatedUser = await User.updateById(userId, { phone });
    const { password: _, ...userWithoutPassword } = updatedUser;

    res.json({
      success: true,
      message: '手机号绑定成功',
      data: {
        user: userWithoutPassword
      }
    });

  } catch (error) {
    console.error('Bind phone error:', error);
    res.status(500).json({
      success: false,
      message: '绑定手机号失败'
    });
  }
};

const register = async (req, res) => {
  try {
    const { password, phone } = req.body;

    const user = await User.create({
      password,
      phone
    });

    const token = generateToken(user.id);

    const { password: _, ...userWithoutPassword } = user;

    res.status(201).json({
      success: true,
      message: '注册成功',
      data: {
        user: userWithoutPassword,
        token
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: '注册失败'
    });
  }
};

const login = async (req, res) => {
  try {
    const { phone, password } = req.body;

    // 检查必需字段
    if (!password) {
      return res.status(400).json({
        success: false,
        message: '密码为必填项'
      });
    }

    if (!phone) {
      return res.status(400).json({
        success: false,
        message: '手机号为必填项'
      });
    }

    // 使用手机号登录
    const user = await User.findByPhone(phone);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: '账号或密码错误'
      });
    }

    if (!user.is_active) {
      return res.status(401).json({
        success: false,
        message: '账号已被停用'
      });
    }

    const isValidPassword = await User.validatePassword(user, password);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: '账号或密码错误'
      });
    }

    const token = generateToken(user.id);

    const { password: _, ...userWithoutPassword } = user;

    res.json({
      success: true,
      message: '登录成功',
      data: {
        user: userWithoutPassword,
        token
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: '登录失败'
    });
  }
};

const getProfile = async (req, res) => {
  try {
    const { password, ...userWithoutPassword } = req.user;

    res.json({
      success: true,
      data: {
        user: userWithoutPassword
      }
    });

  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: '获取个人信息失败'
    });
  }
};

const updateProfile = async (req, res) => {
  try {
    const { phone, avatar, nickname } = req.body;
    const userId = req.user.id;

    const updateData = {};
    if (phone) updateData.phone = phone;
    if (avatar) updateData.avatar = avatar;
    if (nickname) updateData.nickname = nickname;

    const updatedUser = await User.updateById(userId, updateData);

    const { password, ...userWithoutPassword } = updatedUser;

    res.json({
      success: true,
      message: '个人信息更新成功',
      data: {
        user: userWithoutPassword
      }
    });

  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: '更新个人信息失败'
    });
  }
};

const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    const user = await User.findById(userId);
    const isValidPassword = await User.validatePassword(user, currentPassword);

    if (!isValidPassword) {
      return res.status(400).json({
        success: false,
        message: '当前密码错误'
      });
    }

    await User.changePassword(userId, newPassword);

    res.json({
      success: true,
      message: '密码修改成功'
    });

  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      message: '修改密码失败'
    });
  }
};

const uploadAvatar = async (req, res) => {
  try {
    if (!req.uploadedFile) {
      return res.status(400).json({
        success: false,
        message: '未上传文件'
      });
    }

    const userId = req.user.id;
    const avatarPath = req.uploadedFile.url; // 相对路径如 /uploads/avatars/xxx.jpg
    
    // 更新数据库（存储相对路径）
    await User.updateById(userId, { avatar: avatarPath });
    
    // 返回完整URL给前端
    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
    const fullAvatarUrl = `${baseUrl}${avatarPath}`;

    res.json({
      success: true,
      message: '头像上传成功',
      data: {
        avatar: fullAvatarUrl
      }
    });

  } catch (error) {
    console.error('Upload avatar error:', error);
    res.status(500).json({
      success: false,
      message: '上传头像失败'
    });
  }
};

const checkToken = async (req, res) => {
  try {
    // 如果能到达这里，说明token验证已经通过（由authenticateToken中间件处理）
    const { password, ...userWithoutPassword } = req.user;

    res.json({
      success: true,
      message: '令牌有效',
      data: {
        user: userWithoutPassword
      }
    });

  } catch (error) {
    console.error('Check token error:', error);
    res.status(500).json({
      success: false,
      message: '验证令牌失败'
    });
  }
};

module.exports = {
  wxLogin,
  bindPhone,
  register,
  login,
  getProfile,
  updateProfile,
  changePassword,
  uploadAvatar,
  checkToken
};
