// rollup.config.js

// import json from 'rollup-plugin-json';//Convert .json files to ES6 modules，令 Rollup 从 JSON 文件中读取数据
import resolve from '@rollup/plugin-node-resolve';//Locate and bundle third-party dependencies in node_modules
import commonjs from '@rollup/plugin-commonjs';//Convert CommonJS modules to ES6
// import { terser } from "rollup-plugin-terser";
// import builtins from 'rollup-plugin-node-builtins';
// import typescript from '@rollup/plugin-typescript';


export default {
  input: './src/index.js',
  output: [{
    file: 'dst/dugon.js',
    format: 'umd',
    name: 'Dugon',
  }, 
  // {
  //   file: 'dst/dugon.min.js',
  //   format: 'umd',
  //   name: 'Dugon',
  //   plugins: [terser()]
  // }
],
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