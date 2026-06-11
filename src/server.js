const app = require('./app');
const config = require('./config');

const PORT = config.port;

const server = app.listen(PORT, () => {
  console.log(`
🚀 智慧体育训练计划后端服务已启动
📍 服务地址: http://localhost:${PORT}
🔍 健康检查: http://localhost:${PORT}/api/health
📋 环境: ${config.nodeEnv}
  `);
});

process.on('unhandledRejection', (err) => {
  console.error('❌ 未处理的 Promise 拒绝:', err);
  server.close(() => process.exit(1));
});

process.on('SIGTERM', () => {
  console.log('🔔 收到 SIGTERM 信号，正在关闭服务器...');
  server.close(() => {
    console.log('服务器已关闭');
    process.exit(0);
  });
});
