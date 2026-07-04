/// <reference types="vitest/config" />
import { defineConfig } from 'vite';

export default defineConfig({
  base: '/mom-fruit-garden/',
  test: {
    environment: 'node',
  },
});
