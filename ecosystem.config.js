module.exports = {
  apps: [
    {
      name: 'ikas-entegrasyon',
      script: 'npm',
      args: 'start',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      }
    }
  ]
};
