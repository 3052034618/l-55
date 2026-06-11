require('dotenv').config();

const config = {
  port: process.env.PORT || 3000,
  mongodbUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/smart_training',
  nodeEnv: process.env.NODE_ENV || 'development',
  pagination: {
    defaultPage: 1,
    defaultLimit: 20,
    maxLimit: 100
  }
};

module.exports = config;
