module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/*.test.js'],
  collectCoverageFrom: ['src/**/*.js', '!src/test/**/*.js'],
  verbose: true,
  forceExit: true,
  clearMocks: true,
};