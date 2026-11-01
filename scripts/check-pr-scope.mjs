import { execFileSync } from 'node:child_process';

const base = process.env.PR_BASE_SHA;
const head = process.env.PR_HEAD_SHA || 'HEAD';
if (!base || !/^[a-f0-9]{40}$/.test(base) || !/^(HEAD|[a-f0-9]{40})$/.test(head)) throw new Error('PR_BASE_SHA and PR_HEAD_SHA must be verified commit SHAs.');
const files = execFileSync('git', ['diff', '--name-only', '-z', `${base}...${head}`], { encoding: 'utf8' }).split('\0').filter(Boolean);
const frontendOnly = process.env.PR_BRANCH?.startsWith('frontend/') || process.env.PR_LABELS?.split(',').includes('frontend-only');
const presentation = /^(frontend\/app\/|frontend\/public\/|frontend\/tests\/)/;
const protectedFiles = /^(frontend\/app\/(auth\/|components\/AuthProvider\.tsx)|frontend\/app\/components\/LocaleProvider\.tsx)/;
const disallowed = frontendOnly ? files.filter((file) => !presentation.test(file) || protectedFiles.test(file)) : [];
if (disallowed.length) { console.error('Frontend-only PR changes protected files:\n' + disallowed.join('\n')); process.exitCode = 1; }
else console.log(`${frontendOnly ? 'Frontend-only' : 'Integration'} scope checked: ${files.length} changed files. Protected changes require CODEOWNER review.`);
