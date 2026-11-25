#!/usr/bin/env node

/**
 * RadShift_K34 깃허브 연동 & 버전 관리 통합 매니저
 *
 * 지원 기능:
 * 1. 정보보기 (info): 현재 버전, 빌드 번호, 커밋 이력, 릴리즈 목록 조회
 * 2. 버전 선언 (bump): patch/minor/major/직접입력, 커밋 로그 기반 업데이트 내역 자동 파싱, CHANGELOG/version.json 갱신 및 Git Tag 생성
 * 3. 깃허브 푸시 (push): 최신 커밋 및 태그 원격 저장소 푸시 (권한 오류 시 친절 안내)
 * 4. 버전별 푸시 (push-tag): 특정 버전 태그만 원격 저장소로 푸시
 * 5. 버전 복원 (restore): 특정 버전 태그 시점으로 안전 복원 (복원 전용 브랜치 분기 또는 워킹 트리 롤백)
 * 6. 원스톱 릴리즈 (release-push): 버전 선언 -> 문서 자동 생성 -> 태그 생성 -> 깃허브 푸시 일괄 처리
 * 7. 대화형 메뉴 (interactive): 인자 없이 실행 시 직관적인 번호 선택 콘솔 UI 구동
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import readline from 'readline';

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

// -------------------------------------------------------------
// Helper: Safe Git Execution
// -------------------------------------------------------------
function runGit(cmd, options = {}) {
  try {
    return execSync(`git ${cmd}`, { cwd: rootDir, encoding: 'utf8', stdio: options.stdio || 'pipe' }).trim();
  } catch (err) {
    if (options.throwOnError) throw err;
    return null;
  }
}

// -------------------------------------------------------------
// Helper: Read Metadata
// -------------------------------------------------------------
function getProjectMetadata() {
  let pkg = { version: '1.0.0' };
  try {
    pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  } catch (e) {}

  let versionData = {
    version: pkg.version,
    buildNumber: 1,
    lastReleaseDate: new Date().toISOString().split('T')[0],
    updates: [],
  };

  if (fs.existsSync(versionJsonPath)) {
    try {
      versionData = JSON.parse(fs.readFileSync(versionJsonPath, 'utf8'));
    } catch (e) {}
  }

  const currentBranch = runGit('rev-parse --abbrev-ref HEAD') || 'main';
  const currentCommit = runGit('rev-parse --short HEAD') || 'unknown';
  const remoteUrl = runGit('config --get remote.origin.url') || '설정되지 않음';

  // Get local tags sorted by creator date
  const tagsRaw = runGit('tag --sort=-creatordate') || '';
  const tags = tagsRaw ? tagsRaw.split('\n').map((t) => t.trim()).filter(Boolean) : [];

  return {
    pkg,
    versionData,
    currentVersion: pkg.version || versionData.version || '1.0.0',
    buildNumber: versionData.buildNumber || 1,
    currentBranch,
    currentCommit,
    remoteUrl,
    tags,
  };
}

// -------------------------------------------------------------
// 1. 정보보기 (Info)
// -------------------------------------------------------------
function showInfo() {
  const meta = getProjectMetadata();

  console.log('\n======================================================');
  console.log(' 📌 RadShift_K34 프로젝트 및 버전 정보');
  console.log('======================================================');
  console.log(`- 현재 버전 (SemVer) : v${meta.currentVersion}`);
  console.log(`- 현재 빌드 번호     : #${meta.buildNumber}`);
  console.log(`- 현재 Git 브랜치    : ${meta.currentBranch}`);
  console.log(`- 최신 커밋 해시     : ${meta.currentCommit}`);
  console.log(`- 깃허브 원격 저장소 : ${meta.remoteUrl}`);
  console.log(`- 생성된 버전 태그   : ${meta.tags.length > 0 ? meta.tags.join(', ') : '없음'}`);

  if (meta.versionData.updates && meta.versionData.updates.length > 0) {
    console.log('\n[최근 릴리즈 이력 (최대 3건)]');
    meta.versionData.updates.slice(0, 3).forEach((u, idx) => {
      console.log(`  ${idx + 1}. [v${u.version}] ${u.date} - ${u.title || '업데이트'}`);
      if (u.notes && u.notes.length > 0) {
        u.notes.slice(0, 3).forEach((n) => console.log(`     * ${n}`));
      }
    });
  }
  console.log('======================================================\n');
}

// -------------------------------------------------------------
// Helper: Collect & Categorize Commits
// -------------------------------------------------------------
function collectCommitsSinceLastTag() {
  const meta = getProjectMetadata();
  let lastTag = meta.tags[0] || '';
  let logCmd = lastTag ? `log ${lastTag}..HEAD --oneline` : 'log -n 25 --oneline';

  let logOutput = runGit(logCmd) || '';
  let commits = [];
  if (logOutput) {
    commits = logOutput
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)
      .map((line) => {
        const parts = line.split(' ');
        return { hash: parts[0], message: parts.slice(1).join(' ') };
      });
  }

  const categorized = {
    added: [],
    fixed: [],
    changed: [],
    docs: [],
    security: [],
    chore: [],
  };

  let hasBreaking = false;
  let hasFeat = false;
  let hasFix = false;

  for (const { message } of commits) {
    const lower = message.toLowerCase();
    if (lower.includes('breaking change') || lower.includes('!')) hasBreaking = true;

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

  return { commits, categorized, hasBreaking, hasFeat, hasFix, lastTag };
}

// -------------------------------------------------------------
// 2. 버전 선언 및 문서 자동 생성 (Bump Version)
// -------------------------------------------------------------
function bumpVersion(bumpTarget = 'auto', options = {}) {
  const meta = getProjectMetadata();
  const { commits, categorized, hasBreaking, hasFeat } = collectCommitsSinceLastTag();

  let [major, minor, patch] = meta.currentVersion.split('.').map(Number);
  if (isNaN(major)) major = 1;
  if (isNaN(minor)) minor = 0;
  if (isNaN(patch)) patch = 0;

  let newVersion = meta.currentVersion;
  let determinedType = bumpTarget;

  if (bumpTarget === 'auto') {
    if (hasBreaking) determinedType = 'major';
    else if (hasFeat) determinedType = 'minor';
    else determinedType = 'patch';
  }

  if (determinedType === 'major') {
    newVersion = `${major + 1}.0.0`;
  } else if (determinedType === 'minor') {
    newVersion = `${major}.${minor + 1}.0`;
  } else if (determinedType === 'patch') {
    newVersion = `${major}.${minor}.${patch + 1}`;
  } else if (/^\d+\.\d+\.\d+$/.test(determinedType)) {
    newVersion = determinedType;
  } else {
    console.error(`❌ 유효하지 않은 버전 또는 타입입니다: ${bumpTarget}`);
    return null;
  }

  // Check if tag already exists
  if (meta.tags.includes(`v${newVersion}`)) {
    console.warn(`⚠️ 태그 v${newVersion}는 이미 존재합니다. 빌드 번호만 증가하거나 다른 버전을 지정하세요.`);
  }

  const todayStr = new Date().toISOString().split('T')[0];
  const newBuildNumber = meta.buildNumber + 1;
  const releaseTitle = options.title || (commits.length > 0 ? commits[0].message : `Release v${newVersion}`);

  // User extra notes
  if (options.notes && Array.isArray(options.notes)) {
    categorized.changed.push(...options.notes);
  } else if (typeof options.notes === 'string' && options.notes.trim()) {
    categorized.changed.push(options.notes.trim());
  }

  console.log(`\n======================================================`);
  console.log(`🚀 버전 선언 및 릴리즈 노트 생성: v${meta.currentVersion} -> v${newVersion}`);
  console.log(`- 릴리즈 일자: ${todayStr} (빌드 #${newBuildNumber})`);
  console.log(`- 릴리즈 제목: ${releaseTitle}`);
  console.log(`======================================================`);

  // A. Update package.json
  const pkg = meta.pkg;
  pkg.version = newVersion;
  fs.writeFileSync(packageJsonPath, JSON.stringify(pkg, null, 2) + '\n', 'utf8');

  // B. Prepare update item for version.json
  const summaryNotes = [];
  if (categorized.added.length > 0) summaryNotes.push(...categorized.added.map((s) => `[신규] ${s}`));
  if (categorized.fixed.length > 0) summaryNotes.push(...categorized.fixed.map((s) => `[수정] ${s}`));
  if (categorized.changed.length > 0) summaryNotes.push(...categorized.changed.map((s) => `[개선] ${s}`));
  if (categorized.docs.length > 0) summaryNotes.push(...categorized.docs.map((s) => `[문서] ${s}`));
  if (summaryNotes.length === 0) summaryNotes.push('정기 유지보수 및 내부 성능 최적화');

  const updateItem = {
    version: newVersion,
    date: todayStr,
    build: newBuildNumber,
    title: releaseTitle,
    notes: summaryNotes,
    breaking: hasBreaking,
  };

  const versionData = meta.versionData;
  versionData.version = newVersion;
  versionData.buildNumber = newBuildNumber;
  versionData.lastReleaseDate = todayStr;
  versionData.updates = [updateItem, ...(versionData.updates || []).filter((u) => u.version !== newVersion)];
  fs.writeFileSync(versionJsonPath, JSON.stringify(versionData, null, 2) + '\n', 'utf8');

  // C. Update CHANGELOG.md
  let changelogContent = '';
  if (fs.existsSync(changelogPath)) {
    changelogContent = fs.readFileSync(changelogPath, 'utf8');
  } else {
    changelogContent = '# Changelog\n\nAll notable changes to this project will be documented in this file.\n\n';
  }

  let releaseMdSection = `\n## [${newVersion}] - ${todayStr}\n### ${releaseTitle}\n\n`;
  if (categorized.added.length > 0) {
    releaseMdSection += `### ✨ Added (신규 기능)\n` + categorized.added.map((m) => `- ${m}`).join('\n') + '\n\n';
  }
  if (categorized.changed.length > 0) {
    releaseMdSection += `### 🔄 Changed (변경/개선)\n` + categorized.changed.map((m) => `- ${m}`).join('\n') + '\n\n';
  }
  if (categorized.fixed.length > 0) {
    releaseMdSection += `### 🐛 Fixed (버그 수정)\n` + categorized.fixed.map((m) => `- ${m}`).join('\n') + '\n\n';
  }
  if (categorized.docs.length > 0) {
    releaseMdSection += `### 📝 Documentation (문서)\n` + categorized.docs.map((m) => `- ${m}`).join('\n') + '\n\n';
  }

  if (changelogContent.includes('## [')) {
    const firstHeaderIndex = changelogContent.indexOf('## [');
    changelogContent = changelogContent.slice(0, firstHeaderIndex) + releaseMdSection.trim() + '\n\n' + changelogContent.slice(firstHeaderIndex);
  } else {
    changelogContent += releaseMdSection;
  }
  fs.writeFileSync(changelogPath, changelogContent, 'utf8');

  // D. Create docs/releases/vX.Y.Z.md
  const releaseDocPath = path.join(releasesDir, `v${newVersion}.md`);
  const releaseDocContent = `# Release Notes - v${newVersion}\n\n- **배포 버전**: v${newVersion}\n- **릴리즈 일자**: ${todayStr}\n- **빌드 번호**: #${newBuildNumber}\n- **릴리즈 제목**: ${releaseTitle}\n\n---\n\n${releaseMdSection}`;
  fs.writeFileSync(releaseDocPath, releaseDocContent, 'utf8');

  // E. Git commit & tag
  if (!options.skipGit) {
    try {
      runGit('add package.json version.json CHANGELOG.md docs/releases/', { throwOnError: true });
      // Also stage docs/SPECIFICATION.md if modified
      const status = runGit('status --porcelain') || '';
      if (status.includes('docs/SPECIFICATION.md')) {
        runGit('add docs/SPECIFICATION.md');
      }

      runGit(`commit -m "chore(release): v${newVersion} - ${releaseTitle.replace(/"/g, '\\"')}"`, { throwOnError: true });
      runGit(`tag -a v${newVersion} -m "Release v${newVersion}: ${releaseTitle.replace(/"/g, '\\"')}"`, { throwOnError: true });
      console.log(`✅ Git 커밋 및 태그 생성 완료: v${newVersion}`);
    } catch (gitErr) {
      console.warn('⚠️ Git 커밋 또는 태그 생성 중 경고가 발생했습니다:', gitErr.message);
    }
  }

  console.log(`🎉 v${newVersion} 선언 및 문서 자동 작성이 완료되었습니다!`);
  return { newVersion, releaseTitle, summaryNotes };
}

// -------------------------------------------------------------
// 3. 깃허브 원격 저장소 푸시 (Push)
// -------------------------------------------------------------
function pushToGitHub(options = {}) {
  const meta = getProjectMetadata();
  console.log('\n======================================================');
  console.log(`🚀 깃허브 원격 저장소 푸시 시작`);
  console.log(`- 원격 저장소 : ${meta.remoteUrl}`);
  console.log(`- 현재 브랜치 : ${meta.currentBranch}`);
  console.log(`- 최신 버전   : v${meta.currentVersion}`);
  console.log('======================================================');

  try {
    console.log(`\n[1/2] 커밋 푸시 중 (git push origin ${meta.currentBranch})...`);
    execSync(`git push origin ${meta.currentBranch}`, { cwd: rootDir, stdio: 'inherit' });

    console.log(`\n[2/2] 버전 태그 푸시 중 (git push origin --tags)...`);
    execSync(`git push origin --tags`, { cwd: rootDir, stdio: 'inherit' });

    console.log('\n✅ 깃허브 푸시가 성공적으로 완료되었습니다!');
    console.log(`👉 저장소 확인: ${meta.remoteUrl.replace(/\.git$/, '')}`);
    console.log(`👉 Actions 배포 상태: ${meta.remoteUrl.replace(/\.git$/, '')}/actions`);
    console.log(`👉 웹앱 서비스 주소: https://radshiftk34.github.io/RadShift-K34/\n`);
    return true;
  } catch (error) {
    console.error('\n❌ 깃허브 푸시 중 오류가 발생했습니다.');
    console.error('------------------------------------------------------');
    console.error('💡 [주요 원인 및 해결 방법 안내]');
    console.error('1. 권한 오류 (403 Forbidden / Permission denied):');
    console.error('   - 현재 Windows 자격 증명에 등록된 계정과 저장소 소유자 계정이 다른 경우 발생합니다.');
    console.error('   - [해결 A] 저장소 관리자가 현재 로그인 계정을 협업자(Collaborator)로 초대:');
    console.error('     👉 https://github.com/radshiftk34/RadShift-K34/settings/access');
    console.error('   - [해결 B] radshiftk34 계정의 Personal Access Token(PAT)을 사용하여 푸시:');
    console.error('     git remote set-url origin https://radshiftk34:<YOUR_PAT_TOKEN>@github.com/radshiftk34/RadShift-K34.git');
    console.error('     git push -u origin main --tags');
    console.error('------------------------------------------------------\n');
    return false;
  }
}

// -------------------------------------------------------------
// 4. 특정 버전 태그만 푸시 (Push Specific Tag)
// -------------------------------------------------------------
function pushSpecificTag(targetTag) {
  const meta = getProjectMetadata();
  let tag = targetTag;
  if (!tag) {
    if (meta.tags.length === 0) {
      console.log('❌ 등록된 태그가 없습니다.');
      return false;
    }
    tag = meta.tags[0]; // latest tag
  }

  if (!tag.startsWith('v')) tag = `v${tag}`;

  console.log(`\n🚀 버전 태그 [${tag}] 원격 푸시 중 (git push origin ${tag})...`);
  try {
    execSync(`git push origin ${tag}`, { cwd: rootDir, stdio: 'inherit' });
    console.log(`✅ 태그 [${tag}] 푸시 완료!\n`);
    return true;
  } catch (e) {
    console.error(`❌ 태그 [${tag}] 푸시 실패:`, e.message);
    return false;
  }
}

// -------------------------------------------------------------
// 5. 특정 버전으로 복원 (Restore / Rollback)
// -------------------------------------------------------------
function restoreVersion(targetTag, options = {}) {
  const meta = getProjectMetadata();
  if (meta.tags.length === 0) {
    console.log('❌ 복원 가능한 버전 태그가 존재하지 않습니다.');
    return false;
  }

  let tag = targetTag;
  if (!tag) {
    console.log('\n[사용 가능한 버전 태그 목록]');
    meta.tags.forEach((t, i) => console.log(`  ${i + 1}. ${t}`));
    console.log('\n복원할 버전 태그를 지정해 주세요. (예: node scripts/version-manager.mjs restore v1.0.0)');
    return false;
  }

  if (!tag.startsWith('v') && meta.tags.includes(`v${tag}`)) {
    tag = `v${tag}`;
  }

  if (!meta.tags.includes(tag)) {
    console.error(`❌ 태그 [${tag}]를 찾을 수 없습니다. (현재 태그: ${meta.tags.join(', ')})`);
    return false;
  }

  // Check working tree status
  const status = runGit('status --porcelain') || '';
  if (status.trim().length > 0) {
    console.warn('\n⚠️ 현재 저장소에 커밋되지 않은 수정 내용이 존재합니다.');
    console.warn('복원을 진행하기 전에 현재 변경사항을 커밋하거나 임시 저장(git stash)하는 것을 권장합니다.');
  }

  const timestamp = Math.floor(Date.now() / 1000);
  const newBranchName = `restore/${tag}-${timestamp}`;

  console.log('\n======================================================');
  console.log(`🔄 버전 복원 (Rollback to ${tag})`);
  console.log(`- 복원 대상 태그 : ${tag}`);
  console.log(`- 안전 복원 모드 : 새 브랜치 [${newBranchName}]를 생성하여 체크아웃합니다.`);
  console.log('======================================================');

  try {
    execSync(`git checkout -b ${newBranchName} ${tag}`, { cwd: rootDir, stdio: 'inherit' });
    console.log(`\n✅ 복원 브랜치 [${newBranchName}]가 생성되고 태그 [${tag}] 시점으로 체크아웃되었습니다.`);
    console.log(`👉 해당 시점의 코드를 안전하게 검토하거나 수정할 수 있습니다.`);
    console.log(`👉 기존 메인 브랜치로 돌아가려면: git checkout ${meta.currentBranch}\n`);
    return true;
  } catch (err) {
    console.error('❌ 복원 중 오류 발생:', err.message);
    return false;
  }
}

// -------------------------------------------------------------
// 6. 원스톱 릴리즈 (Release & Push)
// -------------------------------------------------------------
function releaseAndPush(bumpTarget = 'auto', options = {}) {
  const result = bumpVersion(bumpTarget, options);
  if (!result) return false;
  return pushToGitHub(options);
}

// -------------------------------------------------------------
// 7. 대화형 인터랙티브 메뉴 (Interactive Console)
// -------------------------------------------------------------
function startInteractiveMenu() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const prompt = (query) => new Promise((resolve) => rl.question(query, resolve));

  async function showMenu() {
    const meta = getProjectMetadata();
    console.clear();
    console.log('==============================================================');
    console.log('  🚀 RadShift_K34 깃허브 푸시 & 버전 관리 도구 (Version Manager)');
    console.log('==============================================================');
    console.log(`  * 현재 버전: v${meta.currentVersion} (빌드 #${meta.buildNumber}) | 브랜치: ${meta.currentBranch}`);
    console.log(`  * 원격 저장소: ${meta.remoteUrl}`);
    console.log('--------------------------------------------------------------');
    console.log('  [1] 버전 정보 및 최근 릴리즈 내역 조회 (Info)');
    console.log('  [2] 새 버전 선언 및 릴리즈 노트 자동 생성 (Version Bump)');
    console.log('  [3] 깃허브 원격 저장소 푸시 (Push Commits & Tags)');
    console.log('  [4] 특정 버전 태그만 푸시 (Push Specific Tag)');
    console.log('  [5] 특정 버전으로 복원 / 롤백 (Restore / Rollback)');
    console.log('  [6] [원스톱] 버전 선언 + 업데이트 작성 + 깃 푸시 일괄 실행');
    console.log('  [0] 종료 (Exit)');
    console.log('==============================================================');

    const choice = (await prompt('\n원하는 작업 번호를 입력하세요: ')).trim();

    switch (choice) {
      case '1':
        showInfo();
        await prompt('\n엔터 키를 누르면 메뉴로 돌아갑니다...');
        return showMenu();

      case '2': {
        console.log('\n[버전 증가 유형 선택]');
        console.log('  1. Patch (패치/버그 수정: v' + meta.currentVersion + ' -> 자동 계산)');
        console.log('  2. Minor (기능 추가/명세 개정: v' + meta.currentVersion + ' -> 자동 계산)');
        console.log('  3. Major (대규모 개편: v' + meta.currentVersion + ' -> 자동 계산)');
        console.log('  4. 직접 버전 번호 입력 (예: 1.2.0)');
        const subChoice = (await prompt('선택 (기본: 1): ')).trim() || '1';
        let target = 'patch';
        if (subChoice === '2') target = 'minor';
        else if (subChoice === '3') target = 'major';
        else if (subChoice === '4') {
          target = (await prompt('버전 번호를 입력하세요 (예: 1.2.5): ')).trim();
        }

        const title = (await prompt('릴리즈 제목(요약)을 입력하세요 (엔터 시 커밋 로그 기준): ')).trim();
        const note = (await prompt('추가할 업데이트 메모를 입력하세요 (선택 사항): ')).trim();

        bumpVersion(target, { title: title || undefined, notes: note ? [note] : [] });
        await prompt('\n엔터 키를 누르면 메뉴로 돌아갑니다...');
        return showMenu();
      }

      case '3':
        pushToGitHub();
        await prompt('\n엔터 키를 누르면 메뉴로 돌아갑니다...');
        return showMenu();

      case '4': {
        if (meta.tags.length === 0) {
          console.log('❌ 등록된 버전 태그가 없습니다.');
        } else {
          console.log('\n[보유 중인 버전 태그]');
          meta.tags.forEach((t, i) => console.log(`  ${i + 1}. ${t}`));
          const tagInput = (await prompt('푸시할 태그를 입력하세요 (기본: 최신 태그 ' + meta.tags[0] + '): ')).trim() || meta.tags[0];
          pushSpecificTag(tagInput);
        }
        await prompt('\n엔터 키를 누르면 메뉴로 돌아갑니다...');
        return showMenu();
      }

      case '5': {
        if (meta.tags.length === 0) {
          console.log('❌ 복원 가능한 버전 태그가 없습니다.');
        } else {
          console.log('\n[복원 가능한 버전 태그]');
          meta.tags.forEach((t, i) => console.log(`  ${i + 1}. ${t}`));
          const tagInput = (await prompt('복원할 태그를 입력하세요: ')).trim();
          if (tagInput) {
            restoreVersion(tagInput);
          }
        }
        await prompt('\n엔터 키를 누르면 메뉴로 돌아갑니다...');
        return showMenu();
      }

      case '6': {
        console.log('\n[원스톱 릴리즈 & 깃 푸시]');
        const target = (await prompt('버전 유형 (patch / minor / major / 직접입력, 기본: minor): ')).trim() || 'minor';
        const title = (await prompt('릴리즈 제목을 입력하세요 (엔터 시 기본값): ')).trim();
        const note = (await prompt('추가 업데이트 내역 메모 (선택): ')).trim();

        releaseAndPush(target, { title: title || undefined, notes: note ? [note] : [] });
        await prompt('\n엔터 키를 누르면 메뉴로 돌아갑니다...');
        return showMenu();
      }

      case '0':
      case 'q':
      case 'exit':
        console.log('\n프로그램을 종료합니다. 안녕히 가세요!\n');
        rl.close();
        process.exit(0);
        break;

      default:
        console.log('잘못된 선택입니다. 다시 입력해 주세요.');
        await new Promise((r) => setTimeout(r, 1000));
        return showMenu();
    }
  }

  showMenu();
}

// -------------------------------------------------------------
// CLI Argument Parser Entrypoint
// -------------------------------------------------------------
const args = process.argv.slice(2);
const command = args[0] ? args[0].toLowerCase() : null;

if (!command || command === 'menu' || command === '-i' || command === '--interactive') {
  startInteractiveMenu();
} else if (command === 'info' || command === 'status') {
  showInfo();
} else if (command === 'bump' || command === 'release') {
  const target = args[1] || 'auto';
  let title = '';
  let notes = [];
  for (let i = 2; i < args.length; i++) {
    if (args[i] === '--title' && args[i + 1]) title = args[++i];
    if (args[i] === '--notes' && args[i + 1]) notes.push(args[++i]);
  }
  bumpVersion(target, { title, notes });
} else if (command === 'push') {
  pushToGitHub();
} else if (command === 'push-tag') {
  pushSpecificTag(args[1]);
} else if (command === 'restore' || command === 'rollback') {
  restoreVersion(args[1]);
} else if (command === 'release-push') {
  const target = args[1] || 'minor';
  let title = '';
  let notes = [];
  for (let i = 2; i < args.length; i++) {
    if (args[i] === '--title' && args[i + 1]) title = args[++i];
    if (args[i] === '--notes' && args[i + 1]) notes.push(args[++i]);
  }
  releaseAndPush(target, { title, notes });
} else {
  console.log(`\n사용법 안내:`);
  console.log(`  node scripts/version-manager.mjs                       # 대화형 메뉴 구동`);
  console.log(`  node scripts/version-manager.mjs info                  # 버전 정보 및 릴리즈 내역 조회`);
  console.log(`  node scripts/version-manager.mjs bump [patch|minor|..] # 새 버전 선언 및 태그 생성`);
  console.log(`  node scripts/version-manager.mjs push                  # 깃허브 원격 푸시`);
  console.log(`  node scripts/version-manager.mjs push-tag [tag]        # 특정 태그만 푸시`);
  console.log(`  node scripts/version-manager.mjs restore [tag]         # 특정 버전으로 복원`);
  console.log(`  node scripts/version-manager.mjs release-push [target] # 버전선언+문서작성+깃푸시 일괄실행\n`);
}
