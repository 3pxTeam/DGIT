// 전역 변수
let currentProject = null;
let activeContent = 'files';
let notificationsEnabled = true;

// 초기화
document.addEventListener('DOMContentLoaded', function() {
    // 로딩 화면 표시 후 메인 앱으로 전환
    setTimeout(() => {
        document.getElementById('splashScreen').style.display = 'none';
        document.getElementById('appContainer').classList.add('visible');
        initializeApp();
    }, 2000);
});

// 앱 초기화
async function initializeApp() {
    try {
        // 설정 로드
        await loadAppConfig();

        // 최근 프로젝트 로드
        await loadRecentProjects();

        console.log('앱 초기화 완료');
    } catch (error) {
        console.error('앱 초기화 실패:', error);
    }
}

// 앱 설정 로드
async function loadAppConfig() {
    try {
        const result = await window.electron.config.load();
        if (result.success) {
            const config = result.config;
            if (config.notifications !== undefined) {
                notificationsEnabled = config.notifications;
                updateNotificationUI();
            }
        }
    } catch (error) {
        console.error('설정 로드 실패:', error);
    }
}

// 알림 UI 업데이트
function updateNotificationUI() {
    const toggleButton = document.getElementById('notificationToggle');
    const toggleText = document.getElementById('notificationToggleText');

    if (toggleButton && toggleText) {
        if (notificationsEnabled) {
            toggleButton.className = 'btn btn-primary';
            toggleText.textContent = '켜짐';
        } else {
            toggleButton.className = 'btn btn-secondary';
            toggleText.textContent = '꺼짐';
        }
    }
}

// 최근 프로젝트 로드
async function loadRecentProjects() {
    try {
        const result = await window.electron.recentProjects.load();
        if (result.success) {
            window.recentProjectsList = result.projects || [];
        }
    } catch (error) {
        console.error('최근 프로젝트 로드 실패:', error);
        window.recentProjectsList = [];
    }
}

// 홈 화면 버튼 함수들
async function selectNewProject() {
    try {
        // 먼저 DGit CLI 사용 가능 여부 확인
        const isDGitAvailable = await checkDGitAvailability();

        if (!isDGitAvailable) {
            showModal('DGit CLI 없음', 'DGit CLI를 찾을 수 없습니다', `
                <div style="padding: 20px; text-align: center;">
                    <p style="margin-bottom: 20px; color: var(--text-secondary);">
                        DGit CLI가 설치되어 있지 않거나 경로를 찾을 수 없습니다.<br>
                        그래도 프로젝트를 열어서 파일을 확인할 수 있습니다.
                    </p>
                    <button class="btn btn-primary" onclick="selectProjectWithoutDGit()">
                        DGit 없이 프로젝트 열기
                    </button>
                </div>
            `);
            return;
        }

        const result = await window.electron.selectFolder();

        if (result.success) {
            const projectInfo = {
                name: result.name,
                path: result.path
            };

            // DGit 저장소 초기화 확인
            const isRepo = await checkIfRepository(result.path);

            if (!isRepo) {
                showModal('DGit 저장소 초기화', '이 폴더는 DGit 저장소가 아닙니다', `
                    <div style="padding: 20px;">
                        <p style="margin-bottom: 20px; color: var(--text-secondary);">
                            선택한 폴더에 DGit 저장소를 초기화하시겠습니까?<br>
                            또는 DGit 없이 파일만 확인할 수도 있습니다.
                        </p>
                        <div style="background: var(--bg-tertiary); padding: 12px; border-radius: 6px; margin-bottom: 20px;">
                            <strong>폴더:</strong> ${result.path}
                        </div>
                        <div style="display: flex; gap: 12px; justify-content: center;">
                            <button class="btn btn-primary" onclick="initializeRepository(${JSON.stringify(projectInfo).replace(/"/g, '&quot;')})">
                                DGit 저장소 초기화
                            </button>
                            <button class="btn btn-secondary" onclick="openProjectWithoutDGit(${JSON.stringify(projectInfo).replace(/"/g, '&quot;')})">
                                DGit 없이 열기
                            </button>
                        </div>
                    </div>
                `);
            } else {
                await openProject(projectInfo);
            }
        } else {
            showToast('폴더 선택이 취소되었습니다', 'warning');
        }
    } catch (error) {
        console.error('프로젝트 선택 실패:', error);
        showToast('프로젝트 선택 중 오류가 발생했습니다', 'error');
    }
}

async function openCurrentProject() {
    // 최근 프로젝트 목록에서 가장 최근 프로젝트 가져오기
    const recentProjects = window.recentProjectsList || [];

    if (recentProjects.length > 0) {
        const mostRecentProject = recentProjects[0];
        await openProject(mostRecentProject);
    } else {
        showToast('진행 중인 프로젝트가 없습니다', 'warning');
    }
}

async function showRecentProjects() {
    const recentProjects = window.recentProjectsList || [];

    if (recentProjects.length === 0) {
        showModal('지난 프로젝트', '최근 작업한 프로젝트가 없습니다', `
            <div style="text-align: center; padding: 40px; color: var(--text-secondary);">
                <p>아직 작업한 프로젝트가 없습니다.</p>
                <p>새 프로젝트를 선택하여 시작해보세요.</p>
            </div>
        `);
        return;
    }

    const projectList = recentProjects.map(project => `
        <div class="file-item" onclick="openRecentProject('${project.path}', '${project.name}')">
            <div class="file-thumbnail">📁</div>
            <div class="file-info">
                <div class="file-name">${project.name}</div>
                <div class="file-details">${project.path} • ${formatDate(project.lastOpened)}</div>
            </div>
        </div>
    `).join('');

    showModal('지난 프로젝트', '최근 작업한 프로젝트를 선택하세요', `
        <div class="file-list">
            ${projectList}
        </div>
    `);
}

function openRecentProject(path, name) {
    closeModal();
    openProject({ name, path });
}

// 홈으로 돌아가기
function goHome() {
    document.getElementById('workspace').classList.remove('active');
    document.getElementById('homeScreen').style.display = 'flex';
    currentProject = null;
}

// 사이드바 콘텐츠 표시
function showContent(contentType) {
    // 모든 콘텐츠 섹션 숨기기
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.remove('active');
        section.classList.add('hidden');
    });

    // 사이드바 활성화 상태 변경
    document.querySelectorAll('.nav-link').forEach(item => {
        item.classList.remove('active');
    });

    // 선택된 콘텐츠 표시
    const contentElement = document.getElementById(`${contentType}Content`);
    if (contentElement) {
        contentElement.classList.remove('hidden');
        contentElement.classList.add('active');
    }

    // 클릭된 네비게이션 링크 활성화
    if (event && event.target) {
        event.target.closest('.nav-link').classList.add('active');
    }

    activeContent = contentType;
}

// 터미널 탭 전환
function showTerminalTab(tabType) {
    document.querySelectorAll('.terminal-tab').forEach(tab => {
        tab.classList.remove('active');
    });

    event.target.classList.add('active');

    if (tabType === 'log') {
        document.getElementById('terminalLog').classList.remove('hidden');
        document.getElementById('terminalStatus').classList.add('hidden');
    } else {
        document.getElementById('terminalLog').classList.add('hidden');
        document.getElementById('terminalStatus').classList.remove('hidden');
    }
}

// 터미널 토글
function toggleTerminal() {
    const terminalPanel = document.getElementById('terminalPanel');
    const toggleBtn = document.getElementById('terminalToggleBtn');

    if (terminalPanel.classList.contains('collapsed')) {
        terminalPanel.classList.remove('collapsed');
        toggleBtn.textContent = '✕';
    } else {
        terminalPanel.classList.add('collapsed');
        toggleBtn.textContent = '+';
    }
}

// 알림 토글
function toggleNotifications() {
    notificationsEnabled = !notificationsEnabled;

    const toggleButton = document.getElementById('notificationToggle');
    const toggleText = document.getElementById('notificationToggleText');

    if (notificationsEnabled) {
        toggleButton.className = 'btn btn-primary';
        toggleText.textContent = '켜짐';
        showToast('알림이 활성화되었습니다', 'success');
    } else {
        toggleButton.className = 'btn btn-secondary';
        toggleText.textContent = '꺼짐';
        showToast('알림이 비활성화되었습니다', 'warning');
    }

    // 설정 저장
    saveNotificationSettings();
}

// 알림 설정 저장
async function saveNotificationSettings() {
    try {
        const config = await window.electron.config.load();
        if (config.success) {
            config.config.notifications = notificationsEnabled;
            await window.electron.config.save(config.config);
        }
    } catch (error) {
        console.error('알림 설정 저장 실패:', error);
    }
}

// 키보드 단축키
document.addEventListener('keydown', function(e) {
    if (e.metaKey || e.ctrlKey) {
        switch(e.key) {
            case 'n':
                e.preventDefault();
                selectNewProject();
                break;
            case 'o':
                e.preventDefault();
                openCurrentProject();
                break;
            case 's':
                e.preventDefault();
                if (currentProject) {
                    commitChanges();
                }
                break;
            case 'w':
                e.preventDefault();
                goHome();
                break;
            case 'r':
                e.preventDefault();
                showToast('상태를 새로고침했습니다', 'success');
                break;
        }
    }

    if (e.key === 'Escape') {
        if (document.getElementById('modalOverlay').classList.contains('show')) {
            closeModal();
        } else if (currentProject) {
            goHome();
        }
    }
});

// 모달 오버레이 클릭시 닫기
document.getElementById('modalOverlay').addEventListener('click', function(e) {
    if (e.target === this) {
        closeModal();
    }
});