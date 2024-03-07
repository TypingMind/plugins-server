import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['./api'],
  splitting: false,
  sourcemap: true,
  clean: true,
});
