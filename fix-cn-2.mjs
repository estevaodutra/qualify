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
    fs.writeFileSync(file, "import { cn } from \"@/lib/utils\";\n" + content, "utf-8");
    console.log("Fixed:", file);
  }
}
