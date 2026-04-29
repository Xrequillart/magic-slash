const { execSync } = require('child_process');
const { version } = require('../package.json');

const tag = `v${version}`;
const repo = 'Xrequillart/magic-slash';

try {
  const assets = JSON.parse(
    execSync(`gh release view ${tag} --repo ${repo} --json assets --jq '.assets'`, {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    })
  );

  if (!assets.length) {
    console.log(`No assets to clean on ${tag}`);
    process.exit(0);
  }

  for (const asset of assets) {
    console.log(`Deleting ${asset.name}...`);
    execSync(
      `gh release delete-asset ${tag} "${asset.name}" --repo ${repo} --yes`,
      { stdio: 'inherit' }
    );
  }

  console.log(`Cleaned ${assets.length} assets from ${tag}`);
} catch (e) {
  if (e.stderr && e.stderr.includes('release not found')) {
    console.log(`No existing release for ${tag}, nothing to clean`);
    process.exit(0);
  }
  throw e;
}
