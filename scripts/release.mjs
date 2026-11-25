#!/usr/bin/env node

/**
 * RadShift_K34 Automated Versioning & Changelog Generator
 *
 * Usage:
 *   node scripts/release.mjs [patch|minor|major|auto] [--no-git] [--title "Optional Title"]
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const versionJsonPath = path.join(rootDir, 'version.json');
const packageJsonPath = path.join(rootDir, 'package.json');
const changelogPath = path.join(rootDir, 'CHANGELOG.md');
const releasesDir = path.join(rootDir, 'docs', 'releases');

// Ensure releases dir exists
if (!fs.existsSync(releasesDir)) {
  fs.mkdirSync(releasesDir, { recursive: true });
}

// 1. Parse arguments
const args = process.argv.slice(2);
let bumpType = 'auto'; // patch, minor, major, auto
let skipGit = false;
let customTitle = '';

for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  if (['patch', 'minor', 'major', 'auto'].includes(arg)) {
    bumpType = arg;
  } else if (arg === '--no-git') {
    skipGit = true;
  } else if (arg === '--title' && args[i + 1]) {
    customTitle = args[++i];
  }
}

// 2. Read current version & package info
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
const currentVersion = packageJson.version || '1.0.0';

let versionData = {
  version: currentVersion,
  buildNumber: 1,
  updates: [],
};

if (fs.existsSync(versionJsonPath)) {
  try {
    versionData = JSON.parse(fs.readFileSync(versionJsonPath, 'utf8'));
  } catch (e) {
    console.warn('Failed to parse version.json, creating new.');
  }
}

// 3. Collect Git commits since last release tag
let gitLogCommits = [];
let lastCommitHash = 'HEAD';

try {
  lastCommitHash = execSync('git rev-parse --short HEAD', { cwd: rootDir }).toString().trim();
  
  // Find last tag
  let lastTag = '';
  try {
    lastTag = execSync('git describe --tags --abbrev=0', { cwd: rootDir, stdio: ['pipe', 'pipe', 'ignore'] }).toString().trim();
  } catch (e) {
    // No tags yet
  }

  const logCmd = lastTag ? `git log ${lastTag}..HEAD --oneline` : 'git log -n 20 --oneline';
  const logOutput = execSync(logCmd, { cwd: rootDir }).toString().trim();
  if (logOutput) {
    gitLogCommits = logOutput.split('\n').map((line) => {
      const parts = line.split(' ');
      const hash = parts[0];
      const message = parts.slice(1).join(' ');
      return { hash, message };
    });
  }
} catch (e) {
  console.warn('Git is not available or error occurred while reading commits.');
}

// Categorize commits
const categorized = {
  added: [],
  changed: [],
  fixed: [],
  security: [],
  docs: [],
  chore: [],
};

let hasBreaking = false;
let hasFeat = false;
let hasFix = false;

for (const { message } of gitLogCommits) {
  const lower = message.toLowerCase();
  if (lower.includes('breaking change') || lower.includes('!')) {
    hasBreaking = true;
  }

  if (lower.startsWith('feat:') || lower.startsWith('feat(') || lower.startsWith('add:')) {
    hasFeat = true;
    categorized.added.push(message.replace(/^(feat|add)(\([^\)]+\))?:\s*/i, ''));
  } else if (lower.startsWith('fix:') || lower.startsWith('fix(') || lower.startsWith('bug:')) {
    hasFix = true;
    categorized.fixed.push(message.replace(/^(fix|bug)(\([^\)]+\))?:\s*/i, ''));
  } else if (lower.startsWith('refactor:') || lower.startsWith('perf:') || lower.startsWith('style:')) {
    categorized.changed.push(message.replace(/^(refactor|perf|style)(\([^\)]+\))?:\s*/i, ''));
  } else if (lower.startsWith('security:') || lower.includes('security')) {
    categorized.security.push(message.replace(/^security(\([^\)]+\))?:\s*/i, ''));
  } else if (lower.startsWith('docs:') || lower.startsWith('docs(')) {
    categorized.docs.push(message.replace(/^docs(\([^\)]+\))?:\s*/i, ''));
  } else {
    categorized.chore.push(message.replace(/^(chore|test)(\([^\)]+\))?:\s*/i, ''));
  }
}

// Determine bump type if auto
if (bumpType === 'auto') {
  if (hasBreaking) bumpType = 'major';
  else if (hasFeat) bumpType = 'minor';
  else bumpType = 'patch';
}

// 4. Calculate new semver
const [major, minor, patch] = currentVersion.split('.').map(Number);
let newVersion = currentVersion;

if (bumpType === 'major') {
  newVersion = `${major + 1}.0.0`;
} else if (bumpType === 'minor') {
  newVersion = `${major}.${minor + 1}.0`;
} else if (bumpType === 'patch') {
  newVersion = `${major}.${minor}.${patch + 1}`;
}

const todayStr = new Date().toISOString().split('T')[0];
const newBuildNumber = (versionData.buildNumber || 1) + 1;

console.log(`\n======================================================`);
console.log(`🚀 RadShift_K34 자동 버전 관리 & 릴리즈 업데이트`);
console.log(`- 현재 버전: v${currentVersion}`);
console.log(`- 갱신 버전: v${newVersion} (${bumpType.toUpperCase()})`);
console.log(`- 릴리즈 일자: ${todayStr}`);
console.log(`- 빌드 번호: #${newBuildNumber}`);
console.log(`======================================================\n`);

// 5. Update package.json
packageJson.version = newVersion;
fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');

// 6. Generate Highlights & Update Entry
const autoHighlights = [];
if (categorized.added.length > 0) {
  autoHighlights.push(`신규 기능 추가: ${categorized.added.slice(0, 3).join(', ')}`);
}
if (categorized.fixed.length > 0) {
  autoHighlights.push(`오류 수정 및 보완: ${categorized.fixed.slice(0, 3).join(', ')}`);
}
if (categorized.security.length > 0) {
  autoHighlights.push(`보안 정책 강화: ${categorized.security.slice(0, 2).join(', ')}`);
}
if (autoHighlights.length === 0) {
  autoHighlights.push(`${bumpType.toUpperCase()} 정기 유지보수 및 업데이트 반영`);
}

const updateEntry = {
  version: newVersion,
  date: todayStr,
  type: bumpType,
  title: customTitle || `${newVersion} 정기 업데이트`,
  highlights: autoHighlights,
  changes: {
    added: categorized.added,
    changed: categorized.changed,
    fixed: categorized.fixed,
    security: categorized.security,
  },
};

versionData.version = newVersion;
versionData.releaseDate = todayStr;
versionData.buildNumber = newBuildNumber;
versionData.gitCommit = lastCommitHash;
versionData.updates = [updateEntry, ...(versionData.updates || [])];

fs.writeFileSync(versionJsonPath, JSON.stringify(versionData, null, 2) + '\n');

// 7. Update CHANGELOG.md (Prepend new release section)
let changelogContent = fs.existsSync(changelogPath) ? fs.readFileSync(changelogPath, 'utf8') : '';

const changelogSection = `
## [${newVersion}] - ${todayStr}

### 주요 내용 (Highlights)
${autoHighlights.map((h) => `- ${h}`).join('\n')}

${categorized.added.length > 0 ? `### Added (신규 기능)\n${categorized.added.map((a) => `- ${a}`).join('\n')}\n` : ''}
${categorized.changed.length > 0 ? `### Changed (변경 사항)\n${categorized.changed.map((c) => `- ${c}`).join('\n')}\n` : ''}
${categorized.fixed.length > 0 ? `### Fixed (버그 수정)\n${categorized.fixed.map((f) => `- ${f}`).join('\n')}\n` : ''}
${categorized.security.length > 0 ? `### Security (보안)\n${categorized.security.map((s) => `- ${s}`).join('\n')}\n` : ''}
`;

// Insert after "# Changelog" header
const headerMatch = changelogContent.match(/# Changelog[^\n]*\n+/);
if (headerMatch) {
  const insertIndex = headerMatch.index + headerMatch[0].length;
  changelogContent = changelogContent.slice(0, insertIndex) + changelogSection + changelogContent.slice(insertIndex);
} else {
  changelogContent = `# Changelog\n\n${changelogSection}\n` + changelogContent;
}

fs.writeFileSync(changelogPath, changelogContent);

// 8. Write individual release markdown file
const releaseFilePath = path.join(releasesDir, `v${newVersion}.md`);
const releaseFileContent = `# RadShift_K34 Release Notes - v${newVersion}

- **버전**: \`v${newVersion}\`
- **배포일자**: \`${todayStr}\`
- **빌드 번호**: \`${newBuildNumber}\`
- **커밋 해시**: \`${lastCommitHash}\`
- **저장소**: [https://github.com/radshiftk34/RadShift-K34](https://github.com/radshiftk34/RadShift-K34)

---

## 1. 개요 및 요약
${autoHighlights.map((h) => `- ${h}`).join('\n')}

---

## 2. 세부 변경 내역

${categorized.added.length > 0 ? `### 2.1 Added (신규 추가)\n${categorized.added.map((a) => `- ${a}`).join('\n')}\n` : ''}
${categorized.changed.length > 0 ? `### 2.2 Changed (개선 및 변경)\n${categorized.changed.map((c) => `- ${c}`).join('\n')}\n` : ''}
${categorized.fixed.length > 0 ? `### 2.3 Fixed (오류 수정)\n${categorized.fixed.map((f) => `- ${f}`).join('\n')}\n` : ''}
${categorized.security.length > 0 ? `### 2.4 Security (보안 적용)\n${categorized.security.map((s) => `- ${s}`).join('\n')}\n` : ''}
`;

fs.writeFileSync(releaseFilePath, releaseFileContent);

// 9. Git commit & tag if requested
if (!skipGit) {
  try {
    execSync(`git add package.json version.json CHANGELOG.md docs/releases/`, { cwd: rootDir });
    execSync(`git commit -m "chore(release): v${newVersion}"`, { cwd: rootDir });
    execSync(`git tag v${newVersion}`, { cwd: rootDir });
    console.log(`✅ Git 커밋 및 태그 생성 완료: v${newVersion}`);
  } catch (err) {
    console.warn(`Git 커밋/태그 생성 중 알림: ${err.message}`);
  }
}

console.log(`\n🎉 v${newVersion} 버전 생성 및 업데이트 문서 작성이 완료되었습니다!`);
console.log(`- version.json 갱신`);
console.log(`- CHANGELOG.md 갱신`);
console.log(`- docs/releases/v${newVersion}.md 생성\n`);
