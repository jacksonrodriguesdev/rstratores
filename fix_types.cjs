const fs = require('fs');
const path = require('path');

function moveTypes(name) {
  const tsPath = path.join(__dirname, `src/lib/${name}.ts`);
  const serverPath = path.join(__dirname, `src/lib/${name}.server.ts`);
  
  if (!fs.existsSync(tsPath) || !fs.existsSync(serverPath)) return;
  
  let tsContent = fs.readFileSync(tsPath, 'utf8');
  let serverContent = fs.readFileSync(serverPath, 'utf8');
  
  // Extract export type ... = { ... } from serverContent
  const typeRegex = /export type [A-Za-z0-9_]+ = \{[\s\S]*?\n\};/g;
  const types = [];
  let match;
  while ((match = typeRegex.exec(serverContent)) !== null) {
    types.push(match[0]);
  }
  
  if (types.length === 0) return;
  
  // Remove types from serverContent
  serverContent = serverContent.replace(typeRegex, '').trim();
  
  // Add types to tsContent
  // First remove the old import type ... from "./...server"
  tsContent = tsContent.replace(/import type \{.*?\} from ["'].*?\.server["'];?\n?/g, '');
  tsContent = tsContent.replace(/export type \{.*?\} from ["'].*?\.server["'];?\n?/g, '');
  
  // Prepend types
  tsContent = types.join('\n\n') + '\n\n' + tsContent;
  
  // Also we need to import these types in serverContent if they are used there
  const typeNames = types.map(t => t.match(/export type ([A-Za-z0-9_]+)/)[1]);
  serverContent = `import type { ${typeNames.join(', ')} } from "./${name}";\n` + serverContent;
  
  fs.writeFileSync(tsPath, tsContent);
  fs.writeFileSync(serverPath, serverContent);
  console.log(`Moved types for ${name}`);
}

['products', 'homepage', 'categories', 'banners', 'auth'].forEach(moveTypes);
