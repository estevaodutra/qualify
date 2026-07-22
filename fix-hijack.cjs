const fs = require('fs');
let code = fs.readFileSync('src/components/sequences/UnifiedNodeConfigPanel.tsx', 'utf8');

// Fix 1: Remove the hijacking in resolvedNodeType
const hijackOld = `  const resolvedNodeType = node.nodeType === "content"\n    ? (editingMessage ? editingMessage.type : "content")\n    : node.nodeType === "action"`;
const hijackNew = `  const resolvedNodeType = node.nodeType === "content"\n    ? "content"\n    : node.nodeType === "action"`;
code = code.replace(hijackOld, hijackNew);

// Fix 2: Remove the "Voltar para Mensagens" header block
const headerOld = `        <div className="flex items-center gap-2">
          {editingMessageId ? (
            <button 
              onClick={() => setEditingMessageId(null)}
              className="flex items-center gap-2 hover:bg-slate-100 p-1.5 -ml-1.5 rounded-md transition-colors"
            >
              <div className="bg-slate-100 p-1 rounded-md text-slate-500">
                <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M6.85355 3.14645C7.04882 3.34171 7.04882 3.65829 6.85355 3.85355L3.70711 7H12.5C12.7761 7 13 7.22386 13 7.5C13 7.77614 12.7761 8 12.5 8H3.70711L6.85355 11.1464C7.04882 11.3417 7.04882 11.6583 6.85355 11.8536C6.65829 12.0488 6.34171 12.0488 6.14645 11.8536L2.14645 7.85355C1.95118 7.65829 1.95118 7.34171 2.14645 7.14645L6.14645 3.14645C6.34171 2.95118 6.65829 2.95118 6.85355 3.14645Z" fill="currentColor" fill-rule="evenodd" clip-rule="evenodd"></path></svg>
              </div>
              <h2 className="text-sm font-semibold text-slate-700">Voltar para Mensagens</h2>
            </button>
          ) : (
            <>
              <Icon className="h-4 w-4" />
              <h2 className="text-sm font-semibold">{nodeInfo.title}</h2>
            </>
          )}
        </div>`;

const headerNew = `        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4" />
          <h2 className="text-sm font-semibold">{nodeInfo.title}</h2>
        </div>`;

if (code.includes(headerOld)) {
    code = code.replace(headerOld, headerNew);
} else {
    console.log("Could not find the header to replace. It might already be replaced.");
}

fs.writeFileSync('src/components/sequences/UnifiedNodeConfigPanel.tsx', code);
console.log("Done");
