const fs = require('fs');
let code = fs.readFileSync('src/components/sequences/UnifiedNodeConfigPanel.tsx', 'utf8');

// Use regex to remove it
code = code.replace(/const \[isAddActionOpen, setIsAddActionOpen\] = useState\(false\);\s*/, '');

fs.writeFileSync('src/components/sequences/UnifiedNodeConfigPanel.tsx', code);
console.log("Removed state successfully");
