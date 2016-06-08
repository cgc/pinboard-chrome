const NODE_ENV = process.env.NODE_ENV;

const webpack = require('webpack');
const fs = require('fs');
const join = require('path').join;
const resolve = require('path').resolve;

const getConfig = require('hjs-webpack');

const isDev = NODE_ENV !== 'production';

const root = resolve(__dirname);
const src = join(root, 'src');
const dest = join(root, 'dist');

var config = getConfig({
  isDev: isDev,
  in: join(src, 'app.js'),
  out: dest,
  html: function (context) {
    return {
      'index.html': context.defaultTemplate({
        publicPath: '',
      }),
    }
  },
});

// violates CSP of chrome extension
delete config.devtool;

module.exports = config;
