module.exports = function (config) {
  config.set({
    basePath: '.',
    frameworks: ['browserify', 'mocha', 'chai'],
    plugins: [
      require('karma-chrome-launcher'),
      require('karma-firefox-launcher'),
      require('karma-browserify'),
      require('karma-mocha'),
      require('karma-chai'),
    ],
    files: [
      'tests.js',
    ],
    preprocessors: {
      'tests.js': ['browserify'],
    },
    port: 9876,
    colors: true,
    logLevel: config.LOG_INFO,
    browsers: [
      'ChromeHeadless',
      'Firefox',
    ],
    autoWatch: false,
    concurrency: Infinity,
    customLaunchers: {
      FirefoxHeadless: {
        base: 'Firefox',
        flags: ['-headless'],
        displayName: 'FirefoxHeadless',
      },
      ChromeHeadlessNoSandbox: {
        base: 'ChromeHeadless',
        flags: ['--no-sandbox'],
        displayName: 'ChromeHeadlessNoSandbox',
      },
    },
    browserify: {
      debug: true,
    },
  });
};
