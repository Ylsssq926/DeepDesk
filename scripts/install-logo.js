import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SOURCE_IMAGE = 'C:/Users/黑受/.gemini/antigravity/brain/2a8d2c7c-27bd-458a-b285-07b6c2ca46f7/deepdesk_logo_concept_narwhal_1780106420584.png';
const ASSETS_DIR = path.join(__dirname, '../assets/brand');
const TARGET_JPG = path.join(ASSETS_DIR, 'logo.jpg');
const TARGET_SVG = path.join(ASSETS_DIR, 'logo.svg');

try {
  console.log('Copying logo from brain cache to assets as logo.jpg...');
  if (!fs.existsSync(ASSETS_DIR)) {
    fs.mkdirSync(ASSETS_DIR, { recursive: true });
  }
  
  // Copy to TARGET_JPG since it's a JPEG
  fs.copyFileSync(SOURCE_IMAGE, TARGET_JPG);
  console.log(`Saved JPG to ${TARGET_JPG}`);

  // Base64 encode the JPG to put it inside the SVG wrapper
  const imageBuffer = fs.readFileSync(TARGET_JPG);
  const base64Data = imageBuffer.toString('base64');
  
  const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">
  <!-- DeepDesk Logo - Chibi Narwhal Helper -->
  <image href="data:image/jpeg;base64,${base64Data}" width="1024" height="1024" x="0" y="0" />
</svg>`;

  fs.writeFileSync(TARGET_SVG, svgContent, 'utf8');
  console.log(`Saved self-contained SVG to ${TARGET_SVG}`);

  // Run Tauri Icon generation command on logo.jpg
  console.log('Generating Tauri app icons (ICO, ICNS, PNG cuts)...');
  execSync('node node_modules/@tauri-apps/cli/tauri.js icon assets/brand/logo.jpg', {
    cwd: path.join(__dirname, '..'),
    stdio: 'inherit'
  });
  console.log('All Tauri icons successfully generated!');
} catch (error) {
  console.error('Error during logo installation:', error);
  process.exit(1);
}
