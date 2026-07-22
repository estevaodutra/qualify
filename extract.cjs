const fs = require('fs');
const code = fs.readFileSync('src/components/sequences/UnifiedNodeConfigPanel.tsx', 'utf8');
const startStr = '          {/* MESSAGE */}';
const endStr = '          {/* Schedule & Manual Send Section */}';

const startIndex = code.indexOf(startStr);
const endIndex = code.indexOf(endStr);

if (startIndex === -1 || endIndex === -1) {
  console.log('Not found');
  process.exit(1);
}

const block = code.substring(startIndex, endIndex);

let newCode = code.substring(0, startIndex);
newCode += '          {renderMessageSpecificFields(resolvedNodeType, currentConfig, updateConfig, updateMultipleConfigs)}\n\n';
newCode += code.substring(endIndex);

const fnCode = `
  const renderMessageSpecificFields = (
    type: string,
    currentConfig: any,
    updateConfig: (key: string, value: unknown) => void,
    updateMultipleConfigs: (updates: Record<string, unknown>) => void
  ) => {
    return (
      <>
${block.replace(/resolvedNodeType ===/g, 'type ===')}      </>
    );
  };
`;

const targetStr = 'const openActionDialog = (index: number) => {';
const fnIndex = newCode.indexOf(targetStr);
newCode = newCode.substring(0, fnIndex) + fnCode + '\n  ' + newCode.substring(fnIndex);

fs.writeFileSync('src/components/sequences/UnifiedNodeConfigPanel.tsx', newCode);
console.log('Done!');
