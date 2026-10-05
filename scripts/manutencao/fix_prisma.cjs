const fs = require('fs');
const path = require('path');

function fixFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8');
  if (!content.includes('import { prisma } from "@/lib/prisma";')) return;
  
  // Remove the top-level import
  content = content.replace('import { prisma } from "@/lib/prisma";\n', '');
  
  // Inject dynamic import inside the handler functions
  // We look for GET:, POST:, PATCH:, DELETE: followed by async
  const methods = ['GET', 'POST', 'PATCH', 'DELETE', 'PUT'];
  for (const method of methods) {
    const regex = new RegExp(`(${method}:\\s*async\\s*\\([^\\)]*\\)\\s*=>\\s*\\{)`, 'g');
    content = content.replace(regex, `$1\n        const { prisma } = await import("@/lib/prisma");`);
  }
  
  fs.writeFileSync(filePath, content, 'utf-8');
  console.log('Fixed', filePath);
}

function walkDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      walkDir(fullPath);
    } else if (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx')) {
      fixFile(fullPath);
    }
  }
}

walkDir(path.join(process.cwd(), 'src', 'routes', 'api'));
