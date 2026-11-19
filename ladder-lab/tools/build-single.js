// node tools/build-single.js [out.html] [--fragment]
// Bundles Ladder Lab into one self-contained HTML file (handy to copy to a phone).
// --fragment omits <!doctype>/<head> wrappers (for hosts that add their own skeleton).
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const out = process.argv[2] || path.join(root, 'dist', 'ladder-lab.html');
const frag = process.argv.includes('--fragment');
const css = fs.readFileSync(path.join(root, 'css/app.css'), 'utf8');
const js = ['engine', 'st', 'plants', 'plants-robot', 'plants-starters', 'ladderview', 'comm', 'hw-rack', 'hw-net', 'hw-online', 'hw-diag', 'hw-meter', 'hw-starters', 'hw-bits', 'hw-wiring', 'hw-hmi', 'hw-tasks', 'hw-drive', 'hw-packml', 'hw-risk', 'fbdview', 'lessons', 'challenges', 'topics', 'app'].map((f) => fs.readFileSync(path.join(root, 'js', f + '.js'), 'utf8')).join('\n;\n').replace(/<\/script/gi, '<\\/script');
const fonts = '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700;800&family=IBM+Plex+Mono:wght@400;500;600;700&family=IBM+Plex+Sans:ital,wght@0,400;0,500;0,600;0,700;1,400&display=swap">';
const head = `<title>Ladder Lab</title>\n<meta name="claude:viewport-fit-sides" content="cover">\n${fonts}\n<style>${css}</style>`;
const body = `<script>${js}</script>`;
const html = frag ? head + '\n' + body + '\n'
  : `<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">${head}</head><body>${body}</body></html>\n`;
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, html);
console.log('wrote', out, (html.length / 1024).toFixed(0) + ' KB');
