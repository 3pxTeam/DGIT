// Git 관련 함수들

// 변경사항 커밋
async function commitChanges() {
    if (!currentProject) {
        showToast('프로젝트가 선택되지 않았습니다', 'warning');
        return;
    }

    try {
        // 현재 상태 확인
        const statusResult = await window.electron.dgit.status(currentProject.path);
        let statusInfo = '상태를 확인할 수 없습니다';
        let changedFiles = [];

        if (statusResult.success) {
            // DGit 상태 출력 파싱 개선
            const statusOutput = statusResult.output.trim();
            console.log('DGit status output:', statusOutput);

            // 빈 출력이거나 "nothing to commit" 메시지가 있으면 변경사항 없음
            if (!statusOutput || statusOutput.includes('nothing to commit') || statusOutput.includes('working tree clean')) {
                // 스테이징된 파일이 있는지 확인
                const addResult = await window.electron.dgit.command('status', ['--porcelain'], currentProject.path);
                if (addResult.success && addResult.output.trim()) {
                    // 스테이징된 파일이 있음
                    const stagedLines = addResult.output.split('\n').filter(line => line.trim());
                    changedFiles = stagedLines.map(line => {
                        const status = line.substring(0, 2);
                        const file = line.substring(3);
                        return { status, file };
                    });
                    statusInfo = `${changedFiles.length}개 파일이 스테이징됨`;
                } else {
                    showToast('커밋할 변경사항이 없습니다. 먼저 "모든 파일 추가" 버튼을 눌러주세요.', 'warning');
                    return;
                }
            } else {
                // 변경된 파일 파싱
                const statusLines = statusOutput.split('\n').filter(line => line.trim());

                if (statusLines.length === 0) {
                    showToast('커밋할 변경사항이 없습니다. 먼저 "모든 파일 추가" 버튼을 눌러주세요.', 'warning');
                    return;
                }

                changedFiles = statusLines.map(line => {
                    // DGit 상태 형식에 맞게 파싱
                    const trimmedLine = line.trim();
                    if (trimmedLine.length < 3) return null;
                    const status = trimmedLine.substring(0, 2);
                    const file = trimmedLine.substring(3);
                    return {
                        status: status || 'M',
                        file: file || trimmedLine
                    };
                }).filter(item => item && item.file);

                const totalCount = changedFiles.length;
                if (totalCount > 0) {
                    statusInfo = `${totalCount}개 파일이 변경됨`;
                } else {
                    showToast('커밋할 변경사항이 없습니다. 먼저 "모든 파일 추가" 버튼을 눌러주세요.', 'warning');
                    return;
                }
            }
        } else {
            showToast('프로젝트 상태를 확인할 수 없습니다', 'error');
            return;
        }

        showModal('변경사항 커밋', '', `
            <div class="commit-dialog">
                <div class="commit-header">
                    <div class="commit-title">변경사항을 커밋하시겠습니까?</div>
                    <div class="commit-subtitle">${statusInfo}</div>
                </div>

                <div class="commit-files-preview">
                    ${changedFiles.slice(0, 5).map(file => `
                        <div class="commit-file-item">
                            <div class="commit-file-status ${file.status}"></div>
                            <div class="commit-file-name">${file.file}</div>
                        </div>
                    `).join('')}
                    ${changedFiles.length > 5 ? `
                        <div class="commit-file-more">그 외 ${changedFiles.length - 5}개 파일...</div>
                    ` : ''}
                </div>

                <div class="commit-message-section">
                    <label class="commit-message-label">커밋 메시지</label>
                    <textarea
                        id="commitMessage"
                        placeholder="변경사항을 설명해주세요..."
                        class="commit-message-input"
                    ></textarea>
                </div>
            </div>
        `, () => {
            const message = document.getElementById('commitMessage').value;
            if (message.trim()) {
                performCommit(message);
            } else {
                showToast('커밋 메시지를 입력해주세요', 'warning');
            }
        });
    } catch (error) {
        console.error('커밋 준비 실패:', error);
        showToast('커밋 준비 중 오류가 발생했습니다', 'error');
    }
}

async function performCommit(message) {
    closeModal();

    if (!currentProject) {
        showToast('프로젝트가 선택되지 않았습니다', 'error');
        return;
    }

    try {
        // 커밋 프로그레스 모달 표시
        showModal('커밋 진행 중', '', `
            <div style="padding: 20px;">
                <div id="commitProgressBar" style="margin-bottom: 20px;"></div>
                <div id="commitProgressText" style="text-align: center; color: var(--text-secondary);">
                    커밋을 시작합니다...
                </div>
            </div>
        `);

        // 1. 먼저 변경된 파일 수 확인
        // eslint-disable-next-line no-undef
        updateProgressBar('commitProgressBar', 5, '변경사항 분석 중...');
        document.getElementById('commitProgressText').textContent = '변경된 파일을 분석하고 있습니다...';

        const statusResult = await window.electron.dgit.status(currentProject.path);
        let totalFiles = 0;

        if (statusResult.success && statusResult.output.trim()) {
            const statusLines = statusResult.output.split('\n').filter(line => line.trim());
            totalFiles = statusLines.length;
        }

        // totalFiles가 0이면 기본값 사용 (예외 처리)
        if (totalFiles === 0) {
            totalFiles = 1; // 최소 1개로 설정하여 0으로 나누기 방지
        }

        // 터미널에 로그 추가
        const terminalLog = document.getElementById('terminalLog');
        terminalLog.innerHTML += `
            <div style="margin-bottom: 8px;">
                <span style="color: var(--accent-blue);">ⳳ</span>
                <span style="color: var(--text-secondary);">[${new Date().toLocaleTimeString()}]</span>
                커밋 시작: ${message} (${totalFiles}개 파일)
            </div>
        `;
        terminalLog.scrollTop = terminalLog.scrollHeight;

        // 2. 파일 추가 시작 (10% ~ 70%)
        // eslint-disable-next-line no-undef
        updateProgressBar('commitProgressBar', 10, '파일 추가 중...');
        document.getElementById('commitProgressText').textContent = `${totalFiles}개 파일을 스테이징 영역에 추가하고 있습니다...`;

        // 실제 add 명령 실행
        const addResult = await window.electron.dgit.command('add', ['.'], currentProject.path);

        if (!addResult.success) {
            throw new Error(`파일 추가 실패: ${addResult.error}`);
        }

        // 파일 추가 완료 시 70%까지
        const addProgress = 70;
        // eslint-disable-next-line no-undef
        updateProgressBar('commitProgressBar', addProgress, `${totalFiles}개 파일 스테이징 완료`);
        document.getElementById('commitProgressText').textContent = '커밋을 생성하고 있습니다...';

        terminalLog.innerHTML += `
            <div style="margin-bottom: 8px;">
                <span style="color: var(--accent-blue);">📁</span>
                <span style="color: var(--text-secondary);">[${new Date().toLocaleTimeString()}]</span>
                ${totalFiles}개 파일 추가 완료
            </div>
        `;
        terminalLog.scrollTop = terminalLog.scrollHeight;

        // 3. 커밋 실행 (70% ~ 90%)
        // eslint-disable-next-line no-undef
        updateProgressBar('commitProgressBar', 85, '커밋 실행 중...');
        document.getElementById('commitProgressText').textContent = '변경사항을 저장소에 기록하고 있습니다...';

        const commitResult = await window.electron.dgit.command('commit', ['-m', message], currentProject.path);

        if (commitResult.success) {
            // 100% - 완료
            // eslint-disable-next-line no-undef
            updateProgressBar('commitProgressBar', 100, '커밋 완료!');
            document.getElementById('commitProgressText').textContent = '커밋이 성공적으로 완료되었습니다!';

            // 성공 로그 추가
            terminalLog.innerHTML += `
                <div style="margin-bottom: 8px;">
                    <span style="color: var(--accent-green);">✓</span>
                    <span style="color: var(--text-secondary);">[${new Date().toLocaleTimeString()}]</span>
                    커밋 완료: ${message} (${totalFiles}개 파일)
                </div>
            `;
            terminalLog.scrollTop = terminalLog.scrollHeight;

            // 잠시 후 모달 닫기
            setTimeout(() => {
                closeModal();
                showToast('커밋이 성공적으로 완료되었습니다', 'success');
            }, 1500);

            // 프로젝트 데이터 새로고침
            await loadProjectData();
        } else {
            // 실패 처리
            document.getElementById('commitProgressText').textContent = '커밋 실행 중 오류가 발생했습니다.';
            // eslint-disable-next-line no-undef
            updateProgressBar('commitProgressBar', 100, '오류 발생');

            setTimeout(() => {
                closeModal();
                showToast(`커밋 실패: ${commitResult.error || '알 수 없는 오류'}`, 'error');
            }, 2000);
        }
    } catch (error) {
        console.error('커밋 실행 실패:', error);

        if (document.getElementById('commitProgressText')) {
            document.getElementById('commitProgressText').textContent = '커밋 중 오류가 발생했습니다.';
            // eslint-disable-next-line no-undef
            updateProgressBar('commitProgressBar', 100, '오류');
        }

        setTimeout(() => {
            closeModal();
            showToast('커밋 중 오류가 발생했습니다', 'error');
        }, 2000);
    }
}

// 모든 파일 추가
async function addAllFiles() {
    if (!currentProject) {
        showToast('프로젝트가 선택되지 않았습니다', 'warning');
        return;
    }

    try {
        const result = await window.electron.dgit.command('add', ['.'], currentProject.path);

        if (result.success) {
            showToast('모든 파일이 스테이징 영역에 추가되었습니다', 'success');
            await loadProjectData(); // 파일 상태 새로고침
        } else {
            showToast('파일 추가 중 오류가 발생했습니다', 'error');
        }
    } catch (error) {
        console.error('파일 추가 실패:', error);
        showToast('파일 추가 중 오류가 발생했습니다', 'error');
    }
}

// 파일 복원
async function restoreFiles() {
    if (!currentProject) {
        showToast('프로젝트가 선택되지 않았습니다', 'warning');
        return;
    }

    showModal('파일 복원', '변경사항을 복원하시겠습니까?', `
        <div style="padding: 20px;">
            <p style="margin-bottom: 20px; color: var(--text-secondary);">
                이 작업은 모든 변경사항을 마지막 커밋 상태로 되돌립니다.<br>
                <strong style="color: var(--accent-red);">주의: 이 작업은 되돌릴 수 없습니다.</strong>
            </p>
            <div style="display: flex; gap: 12px; justify-content: center;">
                <button class="btn btn-secondary" onclick="closeModal()">취소</button>
                <button class="btn btn-danger" onclick="performRestore()" style="background: #ff3b30 !important;">복원 실행</button>
            </div>
        </div>
    `);
}

// 복원 실행
async function performRestore() {
    closeModal();

    try {
        showToast('파일을 복원하는 중...', 'info');

        // 터미널에 로그 추가
        const terminalLog = document.getElementById('terminalLog');
        terminalLog.innerHTML += `
            <div style="margin-bottom: 8px;">
                <span style="color: var(--accent-blue);">ⳳ</span>
                <span style="color: var(--text-secondary);">[${new Date().toLocaleTimeString()}]</span>
                파일 복원 시작...
            </div>
        `;
        terminalLog.scrollTop = terminalLog.scrollHeight;

        // DGit reset --hard HEAD 명령 사용 (더 확실한 복원)
        const result = await window.electron.dgit.command('reset', ['--hard', 'HEAD'], currentProject.path);

        if (result.success) {
            // 성공 로그 추가
            terminalLog.innerHTML += `
                <div style="margin-bottom: 8px;">
                    <span style="color: var(--accent-green);">✓</span>
                    <span style="color: var(--text-secondary);">[${new Date().toLocaleTimeString()}]</span>
                    파일 복원 완료
                </div>
            `;
            terminalLog.scrollTop = terminalLog.scrollHeight;

            showToast('파일이 성공적으로 복원되었습니다', 'success');
            await loadProjectData(); // 파일 상태 새로고침
        } else {
            // 실패 로그 추가
            terminalLog.innerHTML += `
                <div style="margin-bottom: 8px;">
                    <span style="color: var(--accent-red);">✗</span>
                    <span style="color: var(--text-secondary);">[${new Date().toLocaleTimeString()}]</span>
                    파일 복원 실패: ${result.error || '알 수 없는 오류'}
                </div>
            `;
            terminalLog.scrollTop = terminalLog.scrollHeight;

            showToast(`파일 복원 실패: ${result.error || '알 수 없는 오류'}`, 'error');
        }
    } catch (error) {
        console.error('파일 복원 실패:', error);

        // 에러 로그 추가
        const terminalLog = document.getElementById('terminalLog');
        terminalLog.innerHTML += `
            <div style="margin-bottom: 8px;">
                <span style="color: var(--accent-red);">✗</span>
                <span style="color: var(--text-secondary);">[${new Date().toLocaleTimeString()}]</span>
                파일 복원 오류: ${error.message}
            </div>
        `;
        terminalLog.scrollTop = terminalLog.scrollHeight;

        showToast('파일 복원 중 오류가 발생했습니다', 'error');
    }
}

// 특정 커밋으로 복원
async function restoreToCommit(commitHash) {
    if (!currentProject) {
        showToast('프로젝트가 선택되지 않았습니다', 'warning');
        return;
    }

    showModal('커밋으로 복원', `이 커밋으로 복원하시겠습니까?`, `
        <div style="padding: 20px;">
            <p style="margin-bottom: 20px; color: var(--text-secondary);">
                모든 파일이 커밋 <code>${commitHash}</code> 상태로 복원됩니다.<br>
                <strong style="color: var(--accent-red);">주의: 현재 변경사항은 모두 사라집니다.</strong>
            </p>
            <div style="display: flex; gap: 12px; justify-content: center;">
                <button class="btn btn-secondary" onclick="closeModal()">취소</button>
                <button class="btn btn-primary" onclick="performRestoreToCommit('${commitHash}')">복원 실행</button>
            </div>
        </div>
    `);
}

// 커밋으로 복원 실행
async function performRestoreToCommit(commitHash) {
    closeModal();

    try {
        showToast('커밋으로 복원하는 중...', 'info');

        const result = await window.electron.dgit.command('reset', ['--hard', commitHash], currentProject.path);

        if (result.success) {
            showToast(`커밋 ${commitHash}로 성공적으로 복원되었습니다`, 'success');
            await loadProjectData();
        } else {
            showToast(`복원 실패: ${result.error || '알 수 없는 오류'}`, 'error');
        }
    } catch (error) {
        console.error('커밋 복원 실패:', error);
        showToast('커밋 복원 중 오류가 발생했습니다', 'error');
    }
}

// Git 상태 출력 파싱
function parseGitStatus(output) {
    const statusMap = {};
    const lines = output.split('\n');

    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        // DGit 상태 출력 형식 파싱
        const match = trimmed.match(/^([MAD?!])\s+(.+)$/);
        if (match) {
            const [, statusCode, filename] = match;
            const status = getGitStatusText(statusCode);
            statusMap[filename] = status;
        }
    }

    return statusMap;
}

// Git 상태 코드를 텍스트로 변환
function getGitStatusText(statusCode) {
    const statusMap = {
        'M': 'modified',
        'A': 'added',
        'D': 'deleted',
        'R': 'renamed',
        'C': 'copied',
        'U': 'updated',
        '?': 'untracked',
        '!': 'ignored'
    };
    return statusMap[statusCode] || 'unknown';
}

// 커밋 로그 파싱
function parseCommitLog(output) {
    const commits = [];
    if (!output || !output.trim()) return commits;

    const lines = output.split('\n');
    let currentCommit = null;

    for (const line of lines) {
        if (line.startsWith('commit ')) {
            if (currentCommit) {
                commits.push(currentCommit);
            }
            // DGit 형식: "commit 4ea7d8384946 (v2)"
            const commitMatch = line.match(/commit\s+([a-f0-9]+)\s*\(([^)]+)\)/);
            if (commitMatch) {
                currentCommit = {
                    hash: commitMatch[1].substring(0, 7),
                    version: commitMatch[2],
                    message: '',
                    author: '',
                    date: '',
                    files: 0
                };
            }
        } else if (line.startsWith('Author: ') && currentCommit) {
            currentCommit.author = line.substring(8).trim();
        } else if (line.startsWith('Date: ') && currentCommit) {
            const dateStr = line.substring(6).trim();
            currentCommit.date = formatCommitDate(dateStr);
        } else if (line.startsWith('    ') && currentCommit && !currentCommit.message) {
            // 커밋 메시지는 4개 공백으로 들여쓰기됨
            currentCommit.message = line.trim();
        } else if (line.startsWith('    Files: ') && currentCommit) {
            const filesMatch = line.match(/Files:\s+(\d+)/);
            if (filesMatch) {
                currentCommit.files = parseInt(filesMatch[1]);
            }
        }
    }

    if (currentCommit) {
        commits.push(currentCommit);
    }

    return commits;
}

// 커밋 날짜 포맷팅
function formatCommitDate(dateStr) {
    try {
        const date = new Date(dateStr);
        return formatDate(date);
    } catch (error) {
        return dateStr;
    }
}