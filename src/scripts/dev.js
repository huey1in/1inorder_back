const nodemon = require('nodemon');
require('dotenv').config();

// 如果外部未显式指定，默认 development；若 .env 或外部设置为 production，则保持 production
process.env.NODE_ENV = process.env.NODE_ENV || 'development';

nodemon({
  script: 'src/app.js',
  ext: 'js,json',
  watch: ['src'],
});

nodemon
  .on('start', () => {
    console.log(`Starting in ${process.env.NODE_ENV} mode with nodemon...`);
  })
  .on('restart', (files) => {
    if (files && files.length) {
      console.log(`Restarted due to changes in: ${files.join(', ')}`);
    } else {
      console.log('Restarted.');
    }
  })
  .on('quit', () => {
    console.log('Nodemon quit. Shutting down.');
    process.exit();
  });
