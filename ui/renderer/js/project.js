// 프로젝트 관련 함수들

// DGit CLI 사용 가능 여부 확인
async function checkDGitAvailability() {
    try {
        const result = await window.electron.dgit.command('help');
        return result.success;
    } catch (error) {
        return false;
    }
}

// 저장소 확인
async function checkIfRepository(projectPath) {
    try {
        const result = await window.electron.dgit.status(projectPath);
        return result.success;
    } catch (error) {
        console.log('Repository check error:', error);
        return false;
    }
}

// DGit 없이 프로젝트 선택
async function selectProjectWithoutDGit() {
    closeModal();

    try {
        const result = await window.electron.selectFolder();

        if (result.success) {
            const projectInfo = {
                name: result.name,
                path: result.path
            };

            await openProjectWithoutDGit(projectInfo);
        } else {
            showToast('폴더 선택이 취소되었습니다', 'warning');
        }
    } catch (error) {
        console.error('프로젝트 선택 실패:', error);
        showToast('프로젝트 선택 중 오류가 발생했습니다', 'error');
    }
}

// DGit 기능 없이 프로젝트 열기
async function openProjectWithoutDGit(projectInfo) {
    closeModal();

    currentProject = projectInfo;
    document.getElementById('homeScreen').style.display = 'none';
    document.getElementById('workspace').classList.add('active');
    document.getElementById('projectName').textContent = projectInfo.name;
    document.getElementById('projectPath').textContent = projectInfo.path;

    // 최근 프로젝트에 저장
    try {
        await window.electron.recentProjects.save(projectInfo);
        await loadRecentProjects();
    } catch (error) {
        console.error('최근 프로젝트 저장 실패:', error);
    }

    // 파일만 로드 (DGit 기능 제외)
    await loadProjectFilesOnly();

    showToast(`프로젝트 '${projectInfo.name}'을 열었습니다 (DGit 기능 없음)`, 'warning');
}

// 파일만 로드 (DGit 기능 제외)
async function loadProjectFilesOnly() {
    if (!currentProject) return;

    try {
        const result = await window.electron.scanDirectory(currentProject.path);

        if (result.success) {
            const files = result.files.map(file => ({
                name: file.name,
                type: file.type,
                size: formatFileSize(file.size),
                modified: formatDate(file.modified),
                status: 'unknown',
                path: file.path
            }));

            renderFiles(files);

            // 빈 커밋 히스토리와 상태 표시
            renderCommits([]);
            updateTerminalStatus('DGit CLI를 사용할 수 없습니다. 파일 보기만 가능합니다.');
        } else {
            showToast('파일을 스캔할 수 없습니다', 'error');
        }
    } catch (error) {
        console.error('파일 로드 실패:', error);
        showToast('파일 로드 중 오류가 발생했습니다', 'error');
    }
}

// 저장소 초기화
async function initializeRepository(projectInfo) {
    closeModal();

    try {
        showToast('DGit 저장소를 초기화하는 중...', 'info');

        const result = await window.electron.dgit.command('init', [], projectInfo.path);

        if (result.success) {
            showToast('DGit 저장소가 초기화되었습니다', 'success');
            await openProjectDirectly(projectInfo);
        } else {
            showToast('저장소 초기화에 실패했습니다', 'error');
        }
    } catch (error) {
        console.error('저장소 초기화 실패:', error);
        showToast('저장소 초기화 중 오류가 발생했습니다', 'error');
    }
}

// 프로젝트 열기
async function openProject(projectInfo) {
    // DGit 저장소 존재 여부 확인
    try {
        const statusResult = await window.electron.dgit.command('status', [], projectInfo.path);

        // DGit 저장소가 없는 경우 초기화 프롬프트 표시
        if (!statusResult.success && statusResult.error && statusResult.error.includes('not a DGit repository')) {
            showDGitInitPrompt(projectInfo);
            return;
        }
    } catch (error) {
        // DGit 명령 실행 실패 시 초기화 프롬프트 표시
        showDGitInitPrompt(projectInfo);
        return;
    }

    // DGit 저장소가 있는 경우 정상적으로 프로젝트 열기
    await openProjectDirectly(projectInfo);
}

// DGit 초기화 프롬프트 표시
function showDGitInitPrompt(projectInfo) {
    showModal('DGit 저장소 초기화', '이 프로젝트에는 DGit 저장소가 없습니다', `
        <div style="padding: 20px; text-align: center;">
            <div style="margin-bottom: 20px;">
                <div style="font-size: 3rem; margin-bottom: 16px;">📦</div>
                <h3 style="margin-bottom: 12px; color: var(--text-primary);">DGit 저장소가 필요합니다</h3>
                <p style="color: var(--text-secondary); line-height: 1.5;">
                    이 프로젝트에서 버전 관리를 사용하려면<br>
                    DGit 저장소를 초기화해야 합니다.
                </p>
            </div>
            <div style="display: flex; gap: 12px; justify-content: center;">
                <button class="btn btn-secondary" onclick="closeModal()">취소</button>
                <button class="btn btn-primary" onclick="initializeRepository(${JSON.stringify(projectInfo).replace(/"/g, '&quot;')})">
                    저장소 초기화
                </button>
                <button class="btn btn-secondary" onclick="openProjectWithoutDGit(${JSON.stringify(projectInfo).replace(/"/g, '&quot;')})">
                    DGit 없이 열기
                </button>
            </div>
        </div>
    `);
}

// 프로젝트 직접 열기 (DGit 저장소 확인 완료 후)
async function openProjectDirectly(projectInfo) {
    currentProject = projectInfo;
    document.getElementById('homeScreen').style.display = 'none';
    document.getElementById('workspace').classList.add('active');
    document.getElementById('projectName').textContent = projectInfo.name;
    document.getElementById('projectPath').textContent = projectInfo.path;

    // 최근 프로젝트에 저장
    try {
        await window.electron.recentProjects.save(projectInfo);
        await loadRecentProjects(); // 목록 새로고침
    } catch (error) {
        console.error('최근 프로젝트 저장 실패:', error);
    }

    // 프로젝트 데이터 로드
    await loadProjectData();

    showToast(`프로젝트 '${projectInfo.name}'을 열었습니다`, 'success');
}

// 프로젝트 데이터 로드
async function loadProjectData() {
    if (!currentProject) return;

    try {
        // 프로젝트 파일 스캔
        await loadProjectFiles();

        // 커밋 히스토리 로드
        await loadCommitHistory();

        // DGit 상태 확인
        await updateProjectStatus();

    } catch (error) {
        console.error('프로젝트 데이터 로드 실패:', error);
        showToast('프로젝트 데이터를 로드하는 중 오류가 발생했습니다', 'error');
    }
}

// 프로젝트 파일 로드 (프로그레스 바 포함)
async function loadProjectFiles() {
    if (!currentProject) return;

    try {
        // 초기 프로그레스 바 표시
        showProgressBar('fileList', 0, '프로젝트 스캔 시작...');

        // 1단계: 디렉토리 스캔 시작 (0% ~ 20%)
        showProgressBar('fileList', 5, '디렉토리를 분석하는 중...');

        const result = await window.electron.scanDirectory(currentProject.path);

        if (result.success) {
            const totalFiles = result.files.length;

            // 파일이 없는 경우 예외 처리
            if (totalFiles === 0) {
                hideLoadingSpinner('fileList');
                renderFiles([]);
                return;
            }

            // 2단계: 파일 목록 로드 완료 (20%)
            showProgressBar('fileList', 20, `${totalFiles}개 파일 발견`);

            // 3단계: 파일 정보 처리 (20% ~ 70%)
            let processedFiles = 0;
            const files = [];

            for (const file of result.files) {
                // 각 파일 처리
                const processedFile = {
                    name: file.name,
                    type: file.type,
                    size: formatFileSize(file.size),
                    modified: formatDate(file.modified),
                    status: 'unknown',
                    path: file.path
                };

                files.push(processedFile);
                processedFiles++;

                // 진행률 계산 (20% ~ 70% 범위)
                const fileProgress = 20 + Math.round((processedFiles / totalFiles) * 50);
                showProgressBar('fileList', fileProgress, `파일 정보 처리 중... ${processedFiles}/${totalFiles}`);

                // UI 블로킹 방지를 위한 비동기 처리
                if (processedFiles % 10 === 0) {
                    await new Promise(resolve => setTimeout(resolve, 1));
                }
            }

            // 4단계: Git 상태 확인 (70% ~ 90%)
            showProgressBar('fileList', 75, 'Git 상태 확인 중...');

            // DGit 상태로 파일 상태 업데이트
            await updateFileStatuses(files);

            // 5단계: 렌더링 준비 (90% ~ 100%)
            showProgressBar('fileList', 95, '파일 목록 렌더링 중...');

            // 잠시 대기 후 완료
            await new Promise(resolve => setTimeout(resolve, 200));
            showProgressBar('fileList', 100, `${totalFiles}개 파일 로드 완료!`);

            // 잠시 후 실제 파일 목록 표시
            setTimeout(() => {
                hideLoadingSpinner('fileList');
                renderFiles(files);
            }, 800);

        } else {
            hideLoadingSpinner('fileList');
            showToast('파일을 스캔할 수 없습니다', 'error');
        }
    } catch (error) {
        console.error('파일 로드 실패:', error);
        hideLoadingSpinner('fileList');
        showToast('파일 로드 중 오류가 발생했습니다', 'error');
    }
}

// 커밋 히스토리 로드
async function loadCommitHistory() {
    if (!currentProject) return;

    try {
        const result = await window.electron.dgit.log(currentProject.path, 10);

        if (result.success) {
            const commits = parseCommitLog(result.output);
            renderCommits(commits);
        } else {
            // 저장소가 초기화되지 않은 경우
            renderCommits([]);
        }
    } catch (error) {
        console.error('커밋 히스토리 로드 실패:', error);
        renderCommits([]);
    }
}

// 프로젝트 상태 업데이트
async function updateProjectStatus() {
    if (!currentProject) return;

    try {
        const result = await window.electron.dgit.status(currentProject.path);

        if (result.success) {
            updateTerminalStatus(result.output);
        } else {
            updateTerminalStatus('DGit 저장소가 초기화되지 않았습니다.');
        }
    } catch (error) {
        console.error('상태 업데이트 실패:', error);
        updateTerminalStatus('상태를 확인할 수 없습니다.');
    }
}

// 파일 상태 업데이트
async function updateFileStatuses(files) {
    if (!currentProject) return;

    try {
        const result = await window.electron.dgit.status(currentProject.path);
        if (result.success) {
            const statusMap = parseGitStatus(result.output);

            files.forEach(file => {
                if (statusMap[file.name]) {
                    file.status = statusMap[file.name];
                } else {
                    file.status = 'committed';
                }
            });
        }
    } catch (error) {
        console.error('파일 상태 업데이트 실패:', error);
    }
}

// 프로젝트 변경
async function changeProject() {
    await selectNewProject();
}

// 프로젝트 스캔
async function scanProject() {
    if (!currentProject) {
        showToast('프로젝트가 선택되지 않았습니다', 'warning');
        return;
    }

    try {
        showToast('프로젝트를 스캔하고 있습니다...', 'info');
        await loadProjectData();
        showToast('프로젝트 스캔이 완료되었습니다', 'success');
    } catch (error) {
        console.error('프로젝트 스캔 실패:', error);
        showToast('프로젝트 스캔 중 오류가 발생했습니다', 'error');
    }
}

// Finder에서 보기
async function showInFinder() {
    if (!currentProject) {
        showToast('프로젝트가 선택되지 않았습니다', 'warning');
        return;
    }

    try {
        const result = await window.electron.showInFinder(currentProject.path);

        if (result.success) {
            showToast('Finder에서 프로젝트 폴더를 열었습니다', 'success');
        } else {
            showToast('Finder에서 열기 중 오류가 발생했습니다', 'error');
        }
    } catch (error) {
        console.error('Finder에서 보기 실패:', error);
        showToast('Finder에서 열기 중 오류가 발생했습니다', 'error');
    }
}