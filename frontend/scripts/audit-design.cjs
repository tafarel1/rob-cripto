const fs = require('fs');
const path = require('path');

const SRC_DIR = path.join(__dirname, '../src');
const REPORT_FILE = path.join(__dirname, '../design-audit-report.md');

const PATTERNS = {
  hexColor: /#[0-9A-Fa-f]{6}\b/g,
  pxFontSize: /text-\[\d+px\]|font-size:\s*\d+px/g,
  pxSpacing: /(p|m|gap|top|bottom|left|right)-\[\d+px\]|padding:\s*\d+px|margin:\s*\d+px/g,
  hardcodedRadius: /rounded-\[\d+px\]|border-radius:\s*\d+px/g,
  externalIcons: /import.*from.*(react-icons|font-awesome|lucide-react)/g
};

let results = {
  hexColor: [],
  pxFontSize: [],
  pxSpacing: [],
  hardcodedRadius: [],
  externalIcons: []
};

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    if (isDirectory) {
      walkDir(dirPath, callback);
    } else {
      if (f.endsWith('.tsx') || f.endsWith('.ts') || f.endsWith('.css')) {
        callback(dirPath);
      }
    }
  });
}

function auditFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const relativePath = path.relative(SRC_DIR, filePath);

  for (const [key, regex] of Object.entries(PATTERNS)) {
    const matches = content.match(regex);
    if (matches) {
      matches.forEach(match => {
        // Ignore valid hex colors in config or definition files
        if (key === 'hexColor' && (filePath.includes('tailwind.config.js') || filePath.includes('index.css') || filePath.includes('icons.tsx'))) return;
        
        // Ignore lucide-react imports in icons.tsx
        if (key === 'externalIcons' && filePath.includes('icons.tsx')) return;

        results[key].push({
          file: relativePath,
          match: match
        });
      });
    }
  }
}

console.log('Starting Design Audit...');
walkDir(SRC_DIR, auditFile);

let report = '# Design Audit Report\n\n';
report += `Date: ${new Date().toISOString()}\n\n`;

for (const [key, items] of Object.entries(results)) {
  report += `## ${key} (${items.length} issues)\n`;
  if (items.length > 0) {
    report += '| File | Match |\n|---|---|\n';
    items.forEach(item => {
      report += `| ${item.file} | \`${item.match}\` |\n`;
    });
  } else {
    report += 'No issues found.\n';
  }
  report += '\n';
}

fs.writeFileSync(REPORT_FILE, report);
console.log(`Audit complete. Report saved to ${REPORT_FILE}`);
