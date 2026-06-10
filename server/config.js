module.exports = {
  PORT:       process.env.PORT       || 4000,
  JWT_SECRET: process.env.JWT_SECRET || 'arcana-dev-secret-change-in-prod',
  JWT_EXPIRY: '30d',
}
