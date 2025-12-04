import { defineConfig, Plugin } from 'vite';
import basicSsl from '@vitejs/plugin-basic-ssl';
import { execSync } from 'child_process';
import { watch } from 'fs';
import { resolve } from 'path';

const getGitInfo = () => {
  try {
    const commitHash = execSync('git rev-parse --short HEAD').toString().trim();
    const commitHashFull = execSync('git rev-parse HEAD').toString().trim();
    // Extract GitHub URL from remote origin
    let repoUrl = '';
    try {
      const remoteUrl = execSync('git remote get-url origin').toString().trim();
      // Convert git@github.com:user/repo.git or https://github.com/user/repo.git to https://github.com/user/repo
      repoUrl = remoteUrl
        .replace(/^git@github\.com:/, 'https://github.com/')
        .replace(/\.git$/, '');
    } catch {
      repoUrl = '';
    }
    return { commitHash, commitHashFull, repoUrl };
  } catch {
    return { commitHash: 'unknown', commitHashFull: 'unknown', repoUrl: '' };
  }
};

// Virtual module plugin that provides git info with HMR support
function gitInfoPlugin(): Plugin {
  const virtualModuleId = 'virtual:git-info';
  const resolvedVirtualModuleId = '\0' + virtualModuleId;

  return {
    name: 'git-info',
    resolveId(id) {
      if (id === virtualModuleId) {
        return resolvedVirtualModuleId;
      }
    },
    load(id) {
      if (id === resolvedVirtualModuleId) {
        const info = getGitInfo();
        return `export const commitHash = ${JSON.stringify(info.commitHash)};
export const commitHashFull = ${JSON.stringify(info.commitHashFull)};
export const repoUrl = ${JSON.stringify(info.repoUrl)};`;
      }
    },
    configureServer(server) {
      // Watch .git/HEAD and .git/refs for changes (commits, branch switches, etc.)
      const gitDir = resolve(process.cwd(), '.git');
      const filesToWatch = [
        resolve(gitDir, 'HEAD'),
        resolve(gitDir, 'refs/heads'),
      ];
      
      const triggerUpdate = () => {
        const mod = server.moduleGraph.getModuleById(resolvedVirtualModuleId);
        if (mod) {
          server.moduleGraph.invalidateModule(mod);
          server.ws.send({
            type: 'full-reload',
            path: '*'
          });
        }
      };

      // Watch HEAD file for commits and branch switches
      try {
        watch(filesToWatch[0], () => {
          console.log('[git-info] Git HEAD changed, reloading...');
          triggerUpdate();
        });
      } catch (e) {
        // Ignore if .git/HEAD doesn't exist
      }

      // Watch refs/heads directory for new commits
      try {
        watch(filesToWatch[1], { recursive: true }, () => {
          console.log('[git-info] Git refs changed, reloading...');
          triggerUpdate();
        });
      } catch (e) {
        // Ignore if directory doesn't exist
      }
    }
  };
}

export default defineConfig(({ mode }) => {
  const plugins: Plugin[] = [gitInfoPlugin()];
  if (mode === 'https') {
    plugins.push(basicSsl());
  }

  return {
    plugins,
    server: {
      cors: true, // Enable CORS for cross-origin requests from production
      host: 'localhost',
      port: 5173
    },
    build: {
      outDir: 'dist',
      lib: {
        entry: 'src/ychartEditor.ts',
        name: 'YChartEditor',
        fileName: () => 'ychart-editor.js',
        formats: ['iife']
      },
      minify: false,
      target: 'es2015'
    }
  };
});
