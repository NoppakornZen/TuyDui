import { readFile, writeFile } from 'node:fs/promises';
import { parseEnv } from 'node:util';

const root = new URL('../', import.meta.url);
let previous = {};
try { previous = parseEnv(await readFile(new URL('.env.local', root), 'utf8')); }
catch (error) { if (error.code !== 'ENOENT') throw error; }

for (const directory of ['frontend', 'backend']) {
  const example = await readFile(new URL(`${directory}/.env.example`, root), 'utf8');
  const values = parseEnv(example);
  for (const key of Object.keys(values)) {
    const oldKey = key === 'SUPABASE_URL' ? 'NEXT_PUBLIC_SUPABASE_URL' : key;
    if (previous[oldKey] !== undefined) values[key] = previous[oldKey];
  }
  if (directory === 'backend') {
    for (const [key, value] of Object.entries(previous)) {
      if (!key.startsWith('NEXT_PUBLIC_') && key !== 'BACKEND_URL') values[key] = value;
    }
  }
  const contents = Object.entries(values).map(([key, value]) => `${key}=${JSON.stringify(value)}`).join('\n') + '\n';
  try {
    await writeFile(new URL(`${directory}/.env.local`, root), contents, { flag: 'wx' });
    console.log(`Created ${directory}/.env.local`);
  } catch (error) {
    if (error.code !== 'EEXIST') throw error;
    console.log(`Kept existing ${directory}/.env.local`);
  }
}
