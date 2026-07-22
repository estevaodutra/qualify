const fs = require('fs');

let code = fs.readFileSync('src/components/sequences/UnifiedNodeConfigPanel.tsx', 'utf8');

// 1. Add imports if not present
if (!code.includes('AccordionItem')) {
  code = code.replace(
    'import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";',
    'import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";\nimport { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";'
  );
}

// 2. Remove hijack logic
code = code.replace(
  '  const resolvedNodeType = node.nodeType === "content"\n    ? (editingMessage ? editingMessage.type : "content")\n    : node.nodeType === "action"',
  '  const resolvedNodeType = node.nodeType === "content"\n    ? "content"\n    : node.nodeType === "action"'
);

// 3. Find the exact boundaries for the item replacement
const startAnchor = '{messages.map((msg, idx) => {';
const endAnchor = '                         })}';

const startIndex = code.indexOf(startAnchor);
const endIndex = code.indexOf(endAnchor, startIndex);

if (startIndex === -1 || endIndex === -1) {
    console.error("Could not find boundaries for item replacement");
    process.exit(1);
}

const mapBlock = code.substring(startIndex, endIndex + endAnchor.length);

const newMapBlock = `{messages.map((msg, idx) => {
                           const subInfo = block.subTypes?.find(s => s.subType === msg.type);
                           const MsgIcon = subInfo?.icon || MessageSquare;
                           return (
                             <AccordionItem key={msg.id} value={msg.id} className="relative flex flex-col border-none">
                               <AccordionTrigger
                                 className="group flex flex-col p-3 border border-slate-200 rounded-lg hover:border-[#8A3CFF]/50 bg-white hover:bg-slate-50 transition-colors shadow-sm [&[data-state=open]]:border-[#8A3CFF] hover:no-underline"
                               >
                                 <div className="flex items-center justify-between w-full">
                                   <div className="flex items-center gap-3">
                                     <div className={cn("p-1.5 rounded-md text-white shrink-0", subInfo?.color || "bg-slate-500")}>
                                       <MsgIcon className="h-4 w-4" />
                                     </div>
                                     <div className="flex flex-col min-w-0 text-left">
                                       <span className="text-[11px] font-bold text-slate-800">{subInfo?.label || "Desconhecido"}</span>
                                       <span className="text-[9px] text-slate-500 truncate max-w-[130px] font-normal">{msg.content || msg.question || msg.url || "Configurar..."}</span>
                                     </div>
                                   </div>
                                   <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                     <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-400 hover:text-slate-800" onClick={(e) => { e.stopPropagation(); moveAction(e, idx, 'up'); }} disabled={idx === 0}>
                                       <ArrowUp className="h-3 w-3" />
                                     </Button>
                                     <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-400 hover:text-slate-800" onClick={(e) => { e.stopPropagation(); moveAction(e, idx, 'down'); }} disabled={idx === messages.length - 1}>
                                       <ArrowDown className="h-3 w-3" />
                                     </Button>
                                     <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-400" onClick={(e) => { e.stopPropagation(); handleDuplicateAction(e, msg); }}>
                                       <Copy className="h-3 w-3" />
                                     </Button>
                                     <Button variant="ghost" size="icon" className="h-6 w-6 text-red-400 hover:bg-red-50 hover:text-red-600" onClick={(e) => { e.stopPropagation(); handleDeleteAction(e, msg.id); }}>
                                       <Trash2 className="h-3 w-3" />
                                     </Button>
                                   </div>
                                 </div>
                               </AccordionTrigger>
                               <AccordionContent className="pt-4 pb-2 px-1">
                                 {editingMessageId === msg.id && renderMessageSpecificFields(msg.type, msg, updateConfig, updateMultipleConfigs)}
                               </AccordionContent>
                             </AccordionItem>
                           );
                         })}`;

code = code.replace(mapBlock, newMapBlock);

// Replace the Accordion closure and the "Voltar para Mensagens" header
code = code.replace(
    '                       </Accordion>',
    '                       </Accordion>'
); // We already replaced the `div` with `Accordion` earlier using tool! 

// 4. Remove the "Voltar para Mensagens" header
const headerStart = '        <div className="flex items-center gap-2">\n          {editingMessageId ? (';
const headerEnd = '        </div>\n      </div>'; // The header div finishes exactly before the next `div className="px-6 py-6"`

const headerStartIndex = code.indexOf(headerStart);
if (headerStartIndex !== -1) {
    const endOffset = code.indexOf('          )}', headerStartIndex);
    if (endOffset !== -1) {
        const fullOldHeader = code.substring(headerStartIndex, endOffset + 12);
        const newHeader = `        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4" />
          <h2 className="text-sm font-semibold">{nodeInfo.title}</h2>`;
        code = code.replace(fullOldHeader, newHeader);
    }
}

// 5. Replace `</Accordion>` at the end of the list if it was missed
// Actually, earlier the tool replaced the `div` with `Accordion`, but NOT the closing `</div>`.
// Let's replace the closing `</div>` right after `})}`.
code = code.replace(
    '                         })}\n                       </div>',
    '                         })}\n                       </Accordion>'
);


fs.writeFileSync('src/components/sequences/UnifiedNodeConfigPanel.tsx', code);
console.log("Success!");
