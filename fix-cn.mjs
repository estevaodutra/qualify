import fs from "fs";

const files = [
  "C:\\Users\\NOVO USUARIO\\.gemini\\antigravity\\qualify\\src\\components\\scheduling\\CalendarCard.tsx",
  "C:\\Users\\NOVO USUARIO\\.gemini\\antigravity\\qualify\\src\\pages\\CallPanel.tsx",
  "C:\\Users\\NOVO USUARIO\\.gemini\\antigravity\\qualify\\src\\pages\\Instances.tsx",
  "C:\\Users\\NOVO USUARIO\\.gemini\\antigravity\\qualify\\src\\pages\\Leads.tsx",
  "C:\\Users\\NOVO USUARIO\\.gemini\\antigravity\\qualify\\src\\pages\\scheduling\\CalendarsPage.tsx",
  "C:\\Users\\NOVO USUARIO\\.gemini\\antigravity\\qualify\\src\\pages\\Settings.tsx"
];

for (const file of files) {
  let content = fs.readFileSync(file, "utf-8");
  if (!content.includes("import { cn }")) {
    // Find the last import statement to insert after it, or just insert at the top
    const lines = content.split('\n');
    let lastImportIdx = -1;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].startsWith("import ")) {
        lastImportIdx = i;
      }
    }
    
    if (lastImportIdx !== -1) {
      lines.splice(lastImportIdx + 1, 0, "import { cn } from \"@/lib/utils\";");
    } else {
      lines.unshift("import { cn } from \"@/lib/utils\";");
    }
    
    fs.writeFileSync(file, lines.join('\n'), "utf-8");
    console.log("Fixed:", file);
  }
}
