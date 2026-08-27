const fs = require('fs');

function extractLastInlineScript(content) {
  const lines = content.split('\n');
  let lastScriptStart = null;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].match(/<script>/) && !lines[i].includes('src=')) {
      lastScriptStart = i;
    }
  }
  if (lastScriptStart === null) return null;
  let lastScriptEnd = null;
  for (let i = lastScriptStart + 1; i < lines.length; i++) {
    if (lines[i].match(/<\/script>/)) {
      lastScriptEnd = i;
      break;
    }
  }
  return { start: lastScriptStart, end: lastScriptEnd, text: lines.slice(lastScriptStart + 1, lastScriptEnd).join('\n') };
}

// Check HEAD (committed) version
const headContent = fs.readFileSync('_head_admin.html', 'utf8');
const headScript = extractLastInlineScript(headContent);
if (headScript) {
  console.log('HEAD: script lines', headScript.start + 1, 'to', headScript.end + 1, 'length', headScript.text.length);
  fs.writeFileSync('_head_script.js', headScript.text);
}

// Check backup version
const backupContent = fs.readFileSync('admin_backup_broken_20260713_155212.html', 'utf8');
const backupScript = extractLastInlineScript(backupContent);
if (backupScript) {
  console.log('BACKUP: script lines', backupScript.start + 1, 'to', backupScript.end + 1, 'length', backupScript.text.length);
  fs.writeFileSync('_backup_script.js', backupScript.text);
}

// Check current version
const curContent = fs.readFileSync('admin.html', 'utf8');
const curScript = extractLastInlineScript(curContent);
if (curScript) {
  console.log('CURRENT: script lines', curScript.start + 1, 'to', curScript.end + 1, 'length', curScript.text.length);
  fs.writeFileSync('_current_script.js', curScript.text);
}
