import { defineConfig } from 'file:///C:/Users/MADHUMADHY/AppData/Local/Programs/Antigravity%20IDE/resources/app/node_modules/vite/dist/node/index.js';
import react from 'file:///C:/Users/MADHUMADHY/AppData/Local/Programs/Antigravity%20IDE/resources/app/node_modules/@vitejs/plugin-react/dist/index.js';
import path from 'path';

const appModules = 'C:/Users/MADHUMADHY/AppData/Local/Programs/Antigravity IDE/resources/app/node_modules';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      react: path.join(appModules, 'react'),
      'react-dom': path.join(appModules, 'react-dom'),
      'lucide-react': path.join(appModules, 'lucide-react')
    }
  },
  server: {
    fs: {
      allow: ['..', appModules]
    }
  }
});
