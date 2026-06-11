const { errorResponse, AppError } = require('../utils/response');

const notFoundHandler = (req, res, next) => {
  const err = new AppError(`找不到 ${req.originalUrl} 路由`, 404, 'NOT_FOUND');
  next(err);
};

const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  if (err.name === 'CastError') {
    const message = `无效的资源ID: ${err.value}`;
    error = new AppError(message, 400, 'INVALID_ID');
  }

  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    const message = `重复的${field}值: ${err.keyValue[field]}`;
    error = new AppError(message, 400, 'DUPLICATE_FIELD');
  }

  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(val => val.message);
    const message = `数据验证失败: ${errors.join(', ')}`;
    error = new AppError(message, 400, 'VALIDATION_ERROR');
  }

  if (err.name === 'JsonWebTokenError') {
    error = new AppError('无效的令牌', 401, 'INVALID_TOKEN');
  }

  if (err.name === 'TokenExpiredError') {
    error = new AppError('令牌已过期', 401, 'TOKEN_EXPIRED');
  }

  errorResponse(
    res,
    error,
    error.message || '服务器内部错误',
    error.statusCode || 500
  );
};

module.exports = {
  notFoundHandler,
  errorHandler
};
