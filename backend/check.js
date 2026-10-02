const { execSync } = require('child_process');
try { execSync('node_modules\\.bin\\tsc --noEmit', { cwd: __dirname, encoding: 'utf8', stdio: 'pipe', timeout: 60000 }); console.log('✅ TypeScript: 0 errors'); } catch(e) { console.log('❌\n'+(e.stdout||'')+(e.stderr||'')); process.exit(1); }
