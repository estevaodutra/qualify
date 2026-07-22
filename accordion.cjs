const fs = require('fs');
let code = fs.readFileSync('src/components/sequences/UnifiedNodeConfigPanel.tsx', 'utf8');

// 1. Add imports
if (!code.includes('AccordionItem')) {
  code = code.replace(
    'import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";',
    'import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";\nimport { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";'
  );
}

// 2. Remove hijacking logic (but keeping resolvedNodeType as "content")
code = code.replace(
  `  const resolvedNodeType = node.nodeType === "content"\n    ? (editingMessage ? editingMessage.type : "content")\n    : node.nodeType === "action"`,
  `  const resolvedNodeType = node.nodeType === "content"\n    ? "content"\n    : node.nodeType === "action"`
);

// 3. Replace messages.map with Accordion
const oldMapStart = `                       <div className="space-y-2 flex flex-col">\n                         {messages.map((msg, idx) => {`;
const newMapStart = `                       <Accordion type="single" collapsible value={editingMessageId || ""} onValueChange={(val) => setEditingMessageId(val || null)} className="space-y-2 flex flex-col">\n                         {messages.map((msg, idx) => {`;
code = code.replace(oldMapStart, newMapStart);

// Let's replace the item inside the map loop. I will do it with replace by finding a unique substring.
const oldItemSubstring = `                             <div key={msg.id} className="relative flex flex-col">
                               <div
                                 onClick={() => setEditingMessageId(msg.id)}
                                 className="group flex flex-col p-3 border border-slate-200 rounded-lg hover:border-[#8A3CFF]/50 bg-white hover:bg-slate-50 cursor-pointer transition-colors shadow-sm"
                               >
                                 <div className="flex items-center justify-between">
                                   <div className="flex items-center gap-3">
                                     <div className={cn("p-1.5 rounded-md text-white shrink-0", subInfo?.color || "bg-slate-500")}>
                                       <MsgIcon className="h-4 w-4" />
                                     </div>
                                     <div className="flex flex-col min-w-0">
                                       <span className="text-[11px] font-bold text-slate-800">{subInfo?.label || "Desconhecido"}</span>
                                       <span className="text-[9px] text-slate-500 truncate max-w-[130px]">{msg.content || msg.question || msg.url || "Configurar..."}</span>
                                     </div>
                                   </div>
                                   <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                     <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-400 hover:text-slate-800" onClick={(e) => moveAction(e, idx, 'up')} disabled={idx === 0}>
                                       <ArrowUp className="h-3 w-3" />
                                     </Button>
                                     <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-400 hover:text-slate-800" onClick={(e) => moveAction(e, idx, 'down')} disabled={idx === messages.length - 1}>
                                       <ArrowDown className="h-3 w-3" />
                                     </Button>
                                     <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-400" onClick={(e) => handleDuplicateAction(e, msg)}>
                                       <Copy className="h-3 w-3" />
                                     </Button>
                                     <Button variant="ghost" size="icon" className="h-6 w-6 text-red-400 hover:bg-red-50 hover:text-red-600" onClick={(e) => handleDeleteAction(e, msg.id)}>
                                       <Trash2 className="h-3 w-3" />
                                     </Button>
                                   </div>
                                 </div>
                               </div>
                             </div>`;

const newItemSubstring = `                             <AccordionItem key={msg.id} value={msg.id} className="relative flex flex-col border-none">
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
                             </AccordionItem>`;

if (code.includes(oldItemSubstring)) {
  code = code.replace(oldItemSubstring, newItemSubstring);
} else {
  console.error("Could not find oldItemSubstring");
}

const oldMapEnd = `                         })}\n                       </div>`;
const newMapEnd = `                         })}\n                       </Accordion>`;
code = code.replace(oldMapEnd, newMapEnd);


// 4. Remove the "Voltar para Mensagens" header
const oldHeader = `        <div className="flex items-center gap-2">
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

const newHeader = `        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4" />
          <h2 className="text-sm font-semibold">{nodeInfo.title}</h2>
        </div>`;

if (code.includes(oldHeader)) {
  code = code.replace(oldHeader, newHeader);
}

fs.writeFileSync('src/components/sequences/UnifiedNodeConfigPanel.tsx', code);
console.log('Done!');
