import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const files = execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8' }).split('\0').filter(Boolean);
const failures = [];
for (const file of files) {
  if (/(^|\/)\.env(?:\.|$)/.test(file) && !file.endsWith('.env.example')) failures.push(`${file}: tracked environment file`);
  if (!/\.(?:[cm]?[jt]sx?|json|ya?ml|md|sql|toml|env|example)$/.test(file) || file.endsWith('package-lock.json')) continue;
  const text = readFileSync(file, 'utf8');
  if (/ccsk-[a-f0-9]{64}|(?:ghp|gho|ghs)_[A-Za-z0-9]{30,}|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/.test(text)) failures.push(`${file}: credential-like content`);
  if (/postgres(?:ql)?:\/\/[^\s:@]+:[^\s@]{4,}@/.test(text)) failures.push(`${file}: database credentials`);
  if (/eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{15,}/.test(text)) failures.push(`${file}: embedded JWT`);
}
if (failures.length) { console.error(failures.join('\n')); process.exitCode = 1; }
else console.log(`Secret checks passed for ${files.length} tracked paths. Historical exposure still requires credential rotation.`);
