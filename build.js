/**
 * DocCraft Studio - Single-File Standalone Bundler
 * Compiles modular HTML, CSS, and JS into a standalone single-file distribution
 * Usage: node build.js [output_path]
 */

const fs = require('fs');
const path = require('path');

const projectRoot = __dirname;
const htmlPath = path.join(projectRoot, 'index.html');
const cssPath = path.join(projectRoot, 'css', 'styles.css');
const jsFiles = [
  'state.js',
  'converters.js',
  'db.js',
  'diagrams.js',
  'table-editor.js',
  'table-library.js',
  'project-assets.js',
  'workspace.js',
  'ui.js',
  'editor.js',
  'quick-switcher.js',
  'special-chars.js',
  'wikilinks.js',
  'tags-metadata.js',
  'productivity.js',
  'graph.js',
  'app.js'
];

const outputPath = process.argv[2] || path.join(projectRoot, 'dist', 'index_standalone.html');

function collectFiles(dir, base = '') {
  let results = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    if (
      entry.name === '.git' ||
      entry.name === '.DS_Store' ||
      entry.name === 'dist' ||
      entry.name.startsWith('index_Save_') ||
      entry.name === 'index_standalone.html' ||
      entry.name === 'project-assets.js'
    ) {
      continue;
    }

    const fullPath = path.join(dir, entry.name);
    const relPath = base ? path.join(base, entry.name).replace(/\\/g, '/') : entry.name.replace(/\\/g, '/');

    if (entry.isDirectory()) {
      results = results.concat(collectFiles(fullPath, relPath));
    } else {
      results.push({ relPath, fullPath });
    }
  }
  return results;
}

function updateProjectAssetsManifest() {
  const files = collectFiles(projectRoot);
  const manifest = {};
  for (const file of files) {
    const ext = path.extname(file.relPath).toLowerCase();
    const isBinary = ['.woff', '.woff2', '.ttf', '.eot', '.png', '.jpg', '.jpeg', '.gif', '.zip'].includes(ext);

    if (isBinary) {
      const buf = fs.readFileSync(file.fullPath);
      manifest[file.relPath] = { isBinary: true, data: buf.toString('base64') };
    } else {
      manifest[file.relPath] = { isBinary: false, data: fs.readFileSync(file.fullPath, 'utf8') };
    }
  }
  const manifestPath = path.join(projectRoot, 'js', 'project-assets.js');
  const jsContent = `/**
 * DocCraft Studio - Embedded Project Source Manifest
 * Automatically generated to allow 100% offline ZIP packaging without file:// security restrictions
 */
window.DocCraftProjectFiles = ${JSON.stringify(manifest)};
`;
  fs.writeFileSync(manifestPath, jsContent, 'utf8');
}

updateProjectAssetsManifest();

// Read source index.html
let html = fs.readFileSync(htmlPath, 'utf8');

// Inline CSS
const cssContent = fs.readFileSync(cssPath, 'utf8');
html = html.replace(
  '<link rel="stylesheet" href="css/styles.css">',
  `<style>\n${cssContent}\n</style>`
);

// Inline JS modules
let combinedJs = '';
for (const file of jsFiles) {
  const filePath = path.join(projectRoot, 'js', file);
  if (fs.existsSync(filePath)) {
    combinedJs += `\n/* --- MODULE: ${file} --- */\n` + fs.readFileSync(filePath, 'utf8') + '\n';
  }
}

const scriptsPattern = /<!-- DocCraft Studio Modular Architecture -->[\s\S]*?<script src="js\/app\.js"><\/script>/;
html = html.replace(scriptsPattern, `<script>\n${combinedJs}\n</script>`);

const outDir = path.dirname(outputPath);
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

fs.writeFileSync(outputPath, html, 'utf8');
console.log(`Standalone single-file build created successfully at: ${outputPath}`);
