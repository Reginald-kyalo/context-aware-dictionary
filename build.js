const fs = require('fs');
const path = require('path');

// Create directories if they don't exist
function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

// Copy a file with optional transformation function
function copyFile(src, dest, transform = null) {
  const content = fs.readFileSync(src, 'utf-8');
  const finalContent = transform ? transform(content) : content;
  fs.writeFileSync(dest, finalContent);
  console.log(`Copied: ${src} -> ${dest}`);
}

// Copy a file (binary mode)
function copyBinaryFile(src, dest) {
  fs.copyFileSync(src, dest);
  console.log(`Copied: ${src} -> ${dest}`);
}

// Copy directory recursively
function copyDir(src, dest, exclude = []) {
  ensureDir(dest);
  
  const entries = fs.readdirSync(src, { withFileTypes: true });
  
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    
    if (exclude.includes(entry.name)) {
      continue;
    }
    
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath, exclude);
    } else {
      copyBinaryFile(srcPath, destPath);
    }
  }
}

// Build function
function build() {
  console.log("Building Context Dictionary Extension...");
  
  // Ensure directories exist
  ensureDir('./dist/chrome');
  ensureDir('./dist/firefox');
  
  // Copy shared files to Chrome dist
  copyDir('./src', './dist/chrome', ['manifest-firefox.json']);
  
  // Copy shared files to Firefox dist
  copyDir('./src', './dist/firefox', ['manifest.json']);
  
  // Copy Firefox manifest
  copyFile('./src/manifest-firefox.json', './dist/firefox/manifest.json');
  
  console.log("\nBuild complete!");
  console.log("\nFor Chrome: Load unpacked extension from 'dist/chrome'");
  console.log("For Firefox: Load temporary add-on from 'dist/firefox'");
}

// Clean dist folders
function clean() {
  console.log("Cleaning dist folders...");
  if (fs.existsSync('./dist/chrome')) {
    fs.rmSync('./dist/chrome', { recursive: true });
  }
  if (fs.existsSync('./dist/firefox')) {
    fs.rmSync('./dist/firefox', { recursive: true });
  }
  console.log("Clean complete!");
}

// Run build
if (process.argv.includes('--clean')) {
  clean();
}
build();