import {readFileSync, readdirSync, existsSync, writeFileSync, statSync} from 'node:fs';
import {join} from 'node:path';

const lock = JSON.parse(readFileSync('package-lock.json', 'utf8'));
const notices = ['Third-party software notices', 'Package versions are pinned in package-lock.json.', 'Map and surface-data licences are recorded separately in data/GAME-DATA-CREDITS.txt, ROAD-DATA-LICENSE.txt and LANDSCAPE-DATA-LICENSE.txt.'];
for (const directory of Object.keys(lock.packages).filter(key => key.startsWith('node_modules/')).sort()) {
  const manifestPath = join(directory, 'package.json');
  if (!existsSync(manifestPath)) continue;
  const pkg = JSON.parse(readFileSync(manifestPath, 'utf8'));
  notices.push(`\n${'='.repeat(72)}\n${pkg.name}@${pkg.version}\nLicence: ${typeof pkg.license === 'string' ? pkg.license : 'See package notices'}\n`);
  const licenceFiles = readdirSync(directory).filter(file => /^(licen[sc]e|copying|notice)([.\-_]|$)/i.test(file) && statSync(join(directory, file)).isFile());
  for (const file of licenceFiles) notices.push(`${file}\n${readFileSync(join(directory, file), 'utf8')}`);
}
writeFileSync('dist/THIRD-PARTY-LICENSES.txt', notices.join('\n') + '\n');
writeFileSync('dist/LICENSE.txt', readFileSync('LICENSE'));
console.log('Published project MIT licence and installed package notices.');
