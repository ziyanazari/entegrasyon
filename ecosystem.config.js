module.exports = {
  apps: [
    {
      name: 'ikas-entegrasyon',
      script: 'node_modules/.bin/next',
      args: 'start',
      cwd: '/var/www/entegrasyon',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        HOSTNAME: '0.0.0.0',
        // Veritabanı
        DATABASE_URL: 'file:/var/www/entegrasyon/prisma/dev.db',
        // Ikas API
        IKAS_CLIENT_ID: 'aca033be-2f8e-4721-9eb0-ac6c8d284279',
        IKAS_CLIENT_SECRET: 's_lnNkiLeKa62advxYbGx4lHUC45886ac0e63c485e867fe1d6bc7cb26e',
        IKAS_STORE_NAME: 'ebijuteri',
        // Auth
        AUTH_SECRET: '89e9d7c8d9e9d7c8d9e9d7c8d9e9d7c8d9e9d7c8d9e9d7c8d9e9d7c8d9e9d7c8',
        ADMIN_USER: 'admin',
        ADMIN_PASS: 'admin123',
      }
    }
  ]
};
