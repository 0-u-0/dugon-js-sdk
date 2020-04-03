// rollup.config.js

// import json from 'rollup-plugin-json';//Convert .json files to ES6 modules，令 Rollup 从 JSON 文件中读取数据
import resolve from '@rollup/plugin-node-resolve';//Locate and bundle third-party dependencies in node_modules
import commonjs from '@rollup/plugin-commonjs';//Convert CommonJS modules to ES6
// import builtins from 'rollup-plugin-node-builtins';
// import typescript from '@rollup/plugin-typescript';


export default {
  input: './src/interface.js',
  output: {
    file: 'dst/bundle.js',
    format: 'umd',
    name: 'Dugon',
  },
  plugins: [resolve({
    browser: true,
  }), commonjs()]
};

/**
  resolve({
  	browser:true,
  	preferBuiltins:true
  }),commonjs(),builtins()
 */