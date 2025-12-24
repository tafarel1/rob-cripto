const fs = require('fs');
const path = require('path');

const CONFIG = {
  scanDirs: ['frontend/src'],
  extensions: ['.tsx', '.ts', '.css'],
  ignoreFiles: [
    'frontend/src/pages/design-system/DesignTokensPage.tsx', // Lists colors intentionally
    'frontend/src/index.css', // Defines variables
    'frontend/src/components/ui/icons.tsx', // Imports lucide-react intentionally
    'frontend/src/vite-env.d.ts',
  ],
  patterns: {
    hardcodedColor: {
      regex: /#[0-9a-fA-F]{3,6}\b(?!.*var\()/g,
      message: 'Hardcoded Hex Color detected. Use CSS variables (hsl(var(--...))).'
    },
    lucideImport: {
      regex: /from ['"]lucide-react['"]/,
      message: 'Direct import from "lucide-react". Use "@/components/ui/icons" wrapper.'
    },
    pxSpacing: {
      regex: /\b(m|p)[xytrbl]?-\[[0-9]+px\]/,
      message: 'Hardcoded pixel spacing (e.g. p-[10px]). Use Tailwind spacing scale (p-2, m-4).'
    }
  }
};

let errorsFound = 0;
let filesScanned = 0;

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    if (isDirectory) {
      if (f !== 'node_modules' && f !== 'dist' && f !== '.git') {
        walkDir(dirPath, callback);
      }
    } else {
      callback(path.join(dir, f));
    }
  });
}

console.log('🔍 Starting Design System Audit...\n');

CONFIG.scanDirs.forEach(scanDir => {
  const absoluteScanDir = path.resolve(scanDir);
  
  if (!fs.existsSync(absoluteScanDir)) {
    console.warn(`Warning: Directory ${scanDir} not found.`);
    return;
  }

  walkDir(absoluteScanDir, (filePath) => {
    // Check extension
    if (!CONFIG.extensions.includes(path.extname(filePath))) return;

    // Check ignore list
    const relativePath = path.relative(process.cwd(), filePath).replace(/\\/g, '/');
    if (CONFIG.ignoreFiles.some(ignored => relativePath.includes(ignored))) return;

    filesScanned++;
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');

    lines.forEach((line, index) => {
      // Check for Hardcoded Colors
      let match = CONFIG.patterns.hardcodedColor.regex.exec(line);
      if (match) {
        // Simple heuristic to ignore likely SVG paths or IDs, though rudimentary
        if (!line.includes('url(#') && !line.includes('id="')) { 
           // Filter out false positives like comments if possible, but basic is fine
           // Check if it's inside a comment //
           if (!line.trim().startsWith('//') && !line.trim().startsWith('/*')) {
             console.error(`❌ [Color] ${relativePath}:${index + 1} -> ${match[0]}`);
             console.error(`   Line: ${line.trim()}`);
             errorsFound++;
           }
        }
      }

      // Check for Lucide Imports
      if (CONFIG.patterns.lucideImport.regex.test(line)) {
        console.error(`❌ [Icon]  ${relativePath}:${index + 1} -> Direct lucide-react import`);
        console.error(`   Line: ${line.trim()}`);
        errorsFound++;
      }

      // Check for PX Spacing
      if (CONFIG.patterns.pxSpacing.regex.test(line)) {
        console.error(`⚠️ [Space] ${relativePath}:${index + 1} -> Hardcoded pixel spacing`);
        console.error(`   Line: ${line.trim()}`);
        // Warning only, maybe don't fail build yet
        // errorsFound++; 
      }
    });
  });
});

console.log('\n----------------------------------------');
console.log(`✅ Scanned ${filesScanned} files.`);
if (errorsFound > 0) {
  console.error(`🚨 Found ${errorsFound} violations.`);
  process.exit(1);
} else {
  console.log('🎉 Design System Audit Passed! No violations found.');
  process.exit(0);
}
