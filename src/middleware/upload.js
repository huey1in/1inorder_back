const multer = require('multer');
const path = require('path');
const fs = require('fs');

const ensureDirectoryExists = (directory) => {
  if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory, { recursive: true });
  }
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = process.env.UPLOAD_PATH || './uploads';
    let subfolder = 'general';

    if (req.baseUrl.includes('/products')) {
      subfolder = 'products';
    } else if (req.baseUrl.includes('/restaurants')) {
      subfolder = 'restaurants';
    } else if (req.baseUrl.includes('/users') || req.baseUrl.includes('/auth')) {
      // 用户头像或用户相关上传
      subfolder = 'avatars';
    }

    const finalPath = path.join(uploadPath, subfolder);
    ensureDirectoryExists(finalPath);
    cb(null, finalPath);
  },

  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + extension);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('仅允许上传图片文件（jpeg、jpg、png、gif、webp）'));
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024 // 5MB default
  },
  fileFilter: fileFilter
});

const uploadErrorHandler = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: '文件过大，最大允许 5MB'
      });
    }

    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        message: '上传的文件数量过多'
      });
    }

    return res.status(400).json({
      success: false,
      message: '文件上传失败：' + error.message
    });
  }

  if (error.message === '仅允许上传图片文件（jpeg、jpg、png、gif、webp）') {
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }

  next(error);
};

const processUploadedFiles = (req, res, next) => {
  if (req.files) {
    if (Array.isArray(req.files)) {
      req.uploadedFiles = req.files.map(file => ({
        filename: file.filename,
        originalname: file.originalname,
        path: file.path,
        size: file.size,
        url: `/uploads/${path.basename(path.dirname(file.path))}/${file.filename}`
      }));
    } else {
      req.uploadedFiles = Object.keys(req.files).reduce((acc, fieldname) => {
        acc[fieldname] = req.files[fieldname].map(file => ({
          filename: file.filename,
          originalname: file.originalname,
          path: file.path,
          size: file.size,
          url: `/uploads/${path.basename(path.dirname(file.path))}/${file.filename}`
        }));
        return acc;
      }, {});
    }
  } else if (req.file) {
    req.uploadedFile = {
      filename: req.file.filename,
      originalname: req.file.originalname,
      path: req.file.path,
      size: req.file.size,
      url: `/uploads/${path.basename(path.dirname(req.file.path))}/${req.file.filename}`
    };
  }

  next();
};

const deleteFile = (filePath) => {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return true;
    }
  } catch (error) {
    console.error('Error deleting file:', error);
  }
  return false;
};

module.exports = {
  upload,
  uploadErrorHandler,
  processUploadedFiles,
  deleteFile
};
