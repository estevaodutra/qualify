const fs = require('fs');
let code = fs.readFileSync('src/components/sequences/UnifiedNodeConfigPanel.tsx', 'utf8');

const target2 = `                                      <CommandItem
                                        key={sub.subType}
                                        value={sub.label}
                                        onSelect={() => handleAddAction(sub.subType)}
                                        className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-slate-50"
                                      >`;

const replacement2 = `                                      <CommandItem
                                        key={sub.subType}
                                        value={sub.label}
                                        onSelect={() => handleAddAction(sub.subType)}
                                        onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); handleAddAction(sub.subType); }}
                                        className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-slate-50"
                                      >`;

code = code.replace(target2, replacement2);

fs.writeFileSync('src/components/sequences/UnifiedNodeConfigPanel.tsx', code);
console.log("Replaced second successfully");
