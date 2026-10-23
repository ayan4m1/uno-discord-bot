import typescript from '@rollup/plugin-typescript';
import externals from 'rollup-plugin-node-externals';
import multiInput from '@ayan4m1/rollup-plugin-multi-input';

export default {
  input: './src/**/*.ts',
  // node-externals misses package subpath imports
  external: [/^@prisma\/client\//],
  output: {
    dir: './lib',
    format: 'esm'
  },
  plugins: [externals(), typescript(), multiInput()]
};
