const fs = require('fs');

let content = fs.readFileSync('src/components/sequences/UnifiedSequenceBuilder.tsx', 'utf8');

content = content.replace(
  /data-node-port="true"\s*\n\s*onMouseUp=\{\(e\) => handlePortMouseUp\(e, node\.id, "in"\)\}/g,
  `data-node-port="true" data-node-id={node.id} data-port-id="in"\n                          onMouseUp={(e) => handlePortMouseUp(e, node.id, "in")}`
);

content = content.replace(
  /data-node-port="true"\s*\n\s*onMouseDown=\{\(e\) => handlePortMouseDown\(e, node\.id, "out"\)\}/g,
  `data-node-port="true" data-node-id={node.id} data-port-id="default"\n                            onMouseDown={(e) => handlePortMouseDown(e, node.id, "out")}`
);

content = content.replace(
  /data-node-port="true"\s*\n\s*onMouseDown=\{\(e\) => handlePortMouseDown\(e, node\.id, "out", "yes"\)\}/g,
  `data-node-port="true" data-node-id={node.id} data-port-id="yes"\n                            onMouseDown={(e) => handlePortMouseDown(e, node.id, "out", "yes")}`
);

content = content.replace(
  /data-node-port="true"\s*\n\s*onMouseDown=\{\(e\) => handlePortMouseDown\(e, node\.id, "out", "no"\)\}/g,
  `data-node-port="true" data-node-id={node.id} data-port-id="no"\n                            onMouseDown={(e) => handlePortMouseDown(e, node.id, "out", "no")}`
);

content = content.replace(
  /data-node-port="true"\s*\n\s*onMouseDown=\{\(e\) => handlePortMouseDown\(e, node\.id, "out", branch\.id\)\}/g,
  `data-node-port="true" data-node-id={node.id} data-port-id={branch.id}\n                                onMouseDown={(e) => handlePortMouseDown(e, node.id, "out", branch.id)}`
);

content = content.replace(
  /data-node-port="true"\s*\n\s*onMouseDown=\{\(e\) => handlePortMouseDown\(e, node\.id, "out", trigger\.id\)\}/g,
  `data-node-port="true" data-node-id={node.id} data-port-id={trigger.id}\n                                  onMouseDown={(e) => handlePortMouseDown(e, node.id, "out", trigger.id)}`
);

content = content.replace(
  /data-node-port="true"\s*\n\s*onMouseDown=\{\(e\) => handlePortMouseDown\(e, node\.id, "out", "timeout"\)\}/g,
  `data-node-port="true" data-node-id={node.id} data-port-id="timeout"\n                                  onMouseDown={(e) => handlePortMouseDown(e, node.id, "out", "timeout")}`
);

content = content.replace(
  /data-node-port="true"\s*\n\s*onMouseDown=\{\(e\) => handlePortMouseDown\(e, node\.id, "out", "error"\)\}/g,
  `data-node-port="true" data-node-id={node.id} data-port-id="error"\n                                onMouseDown={(e) => handlePortMouseDown(e, node.id, "out", "error")}`
);

fs.writeFileSync('src/components/sequences/UnifiedSequenceBuilder.tsx', content, 'utf8');
console.log("Done");
