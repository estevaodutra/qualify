const fs = require('fs');
let code = fs.readFileSync('src/components/sequences/UnifiedNodeConfigPanel.tsx', 'utf8');

// 1. Remove isAddActionOpen state
code = code.replace(
  '  const [isAddActionOpen, setIsAddActionOpen] = useState(false);\n',
  ''
);

// 2. Remove open and onOpenChange
code = code.replace(
  '<Popover open={isAddActionOpen} onOpenChange={setIsAddActionOpen}>',
  '<Popover>'
);

// 3. Replace setIsAddActionOpen(false) in handleAddAction
code = code.replace(
  'setIsAddActionOpen(false);',
  `document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));`
);

fs.writeFileSync('src/components/sequences/UnifiedNodeConfigPanel.tsx', code);
console.log("Reverted controlled Popover to uncontrolled + Escape hack");
