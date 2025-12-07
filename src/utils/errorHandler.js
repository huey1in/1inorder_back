const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({
      success: false,
      message: 'JSON 格式无效'
    });
  }

  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: '校验错误',
      errors: err.errors
    });
  }

  if (err.code === 'SQLITE_CONSTRAINT' || err.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({
      success: false,
      message: '重复数据或约束冲突'
    });
  }

  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: '无效的令牌'
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: '令牌已过期'
    });
  }

  res.status(500).json({
    success: false,
    message: process.env.NODE_ENV === 'production'
      ? '服务器内部错误'
      : err.message
  });
};

const notFoundHandler = (req, res) => {
  res.status(404).json({
    success: false,
    message: `未找到路由：${req.originalUrl}`
  });
};

module.exports = {
  errorHandler,
  notFoundHandler
};
