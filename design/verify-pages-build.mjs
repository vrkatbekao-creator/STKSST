import assert from 'node:assert/strict';
import {readFileSync, readdirSync, statSync, lstatSync} from 'node:fs';
import {join} from 'node:path';

const root = 'dist';
const files = readdirSync(root, {recursive: true}).filter(file => statSync(join(root, file)).isFile()).map(file => file.replaceAll('\\', '/'));
assert.ok(readFileSync(join(root, 'index.html'), 'utf8').includes('/STKSST/assets/'), 'Expected project-site asset base');
for (const required of ['.nojekyll', 'LICENSE.txt', 'THIRD-PARTY-LICENSES.txt', 'PROJECT-CREDITS.txt', 'data/GAME-DATA-CREDITS.txt', 'data/ROAD-DATA-LICENSE.txt', 'data/LANDSCAPE-DATA-LICENSE.txt', 'art/members/blue-v1.png', 'art/members/green-v1.png', 'art/members/white-v1.png', 'art/members/visitors-v1.png']) {
  assert.ok(files.includes(required), `Missing published asset or notice: ${required}`);
}
assert.ok(!files.some(file => /(^|[\\/])(src|design|tests|node_modules|\.git)([\\/]|$)|(^|[\\/])\.env/.test(file)), 'Development/private paths must not be deployed');
const bytes = files.reduce((sum, file) => sum + statSync(join(root, file)).size, 0);
assert.ok(bytes < 1_000_000_000, 'Site must remain below the GitHub Pages 1 GB limit');
assert.ok(files.every(file => !lstatSync(join(root, file)).isSymbolicLink()), 'No symbolic links in published artifact');
console.log(JSON.stringify({files: files.length, bytes, base: '/STKSST/', notices: 'present', developmentFiles: 'excluded'}));
