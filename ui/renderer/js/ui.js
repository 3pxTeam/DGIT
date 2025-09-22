// UI 관련 함수들

// 파일 목록 렌더링
function renderFiles(files) {
    const fileList = document.getElementById('fileList');

    if (!files || files.length === 0) {
        fileList.innerHTML = `
            <div style="text-align: center; padding: 40px; color: var(--text-secondary);">
                <div style="font-size: 3rem; margin-bottom: 16px;">📁</div>
                <div style="font-size: 1.1rem; margin-bottom: 8px;">프로젝트 파일이 없습니다</div>
                <div style="font-size: 0.9rem;">프로젝트를 스캔하거나 파일을 추가해보세요.</div>
            </div>
        `;
        return;
    }

    fileList.innerHTML = files.map(file => {
        const isImageFile = isPreviewableImage(file.type);
        const thumbnailClass = isImageFile ? 'file-thumbnail has-preview' : 'file-thumbnail';
        const thumbnailContent = isImageFile ? '' : getFileIcon(file.type);
        const thumbnailStyle = isImageFile ? `background-image: url('file://${file.path}')` : '';

        return `
            <div class="file-item">
                <div class="${thumbnailClass}"
                     style="${thumbnailStyle}"
                     onclick="${isImageFile ? `showImagePreview('${file.path}', '${file.name}')` : ''}"
                     title="${isImageFile ? '클릭하여 미리보기' : ''}">
                    ${thumbnailContent}
                </div>
                <div class="file-info" onclick="selectFile('${file.name}')">
                    <div class="file-name">${file.name}</div>
                    <div class="file-details">${file.size} • ${file.modified}</div>
                </div>
                <div class="file-status" style="background: ${getStatusColor(file.status)}"></div>
            </div>
        `;
    }).join('');
}

// 커밋 목록 렌더링
function renderCommits(commits) {
    const commitList = document.getElementById('commitList');

    if (commits.length === 0) {
        commitList.innerHTML = `
            <div style="text-align: center; padding: 40px; color: var(--text-secondary);">
                <div style="font-size: 3rem; margin-bottom: 16px;">📝</div>
                <div style="font-size: 1.1rem; margin-bottom: 8px;">아직 커밋이 없습니다</div>
                <div style="font-size: 0.9rem;">첫 번째 커밋을 만들어보세요!</div>
            </div>
        `;
        return;
    }

    commitList.innerHTML = commits.map((commit, index) => {
        const authorInitial = commit.author ? commit.author.charAt(0).toUpperCase() : 'U';
        const isLast = index === commits.length - 1;

        return `
            <div class="commit-item" onclick="viewCommit('${commit.hash}')">
                <div class="commit-timeline">
                    <div class="commit-dot"></div>
                    ${!isLast ? '<div class="commit-line"></div>' : ''}
                </div>
                <div class="commit-avatar">${authorInitial}</div>
                <div class="commit-details">
                    <div class="commit-message">${commit.message || '커밋 메시지 없음'}</div>
                    <div class="commit-meta">
                        <span class="commit-date">${commit.date || '날짜 없음'}</span>
                        ${commit.version ? `<span class="commit-version">v${commit.version}</span>` : ''}
                        <span class="commit-hash">${commit.hash}</span>
                    </div>
                    <div class="commit-stats">
                        ${commit.files > 0 ? `<span class="commit-stat">📄 ${commit.files} files</span>` : ''}
                    </div>
                    <div class="commit-actions">
                        <button class="commit-action-btn" onclick="event.stopPropagation(); restoreToCommit('${commit.hash}')">
                            복원
                        </button>
                        <button class="commit-action-btn" onclick="event.stopPropagation(); viewCommitDiff('${commit.hash}')">
                            변경사항
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// 이미지 파일 미리보기 가능 여부 확인
function isPreviewableImage(type) {
    const previewableTypes = ['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp'];
    return previewableTypes.includes(type.toLowerCase());
}

// 이미지 미리보기 표시
function showImagePreview(imagePath, fileName) {
    const modal = document.getElementById('imagePreviewModal');
    const img = document.getElementById('imagePreviewImg');
    const info = document.getElementById('imagePreviewInfo');

    img.src = `file://${imagePath}`;
    info.textContent = fileName;
    modal.classList.add('show');
}

// 이미지 미리보기 닫기
function closeImagePreview() {
    const modal = document.getElementById('imagePreviewModal');
    modal.classList.remove('show');
}

// 파일 선택
function selectFile(fileName) {
    console.log('파일 선택:', fileName);
    // 파일 선택 로직 구현
}

// 모달 관련 함수들
function showModal(title, subtitle, body, confirmCallback = null) {
    document.getElementById('modalTitle').textContent = title;
    document.getElementById('modalSubtitle').textContent = subtitle;
    document.getElementById('modalBody').innerHTML = body;
    document.getElementById('modalOverlay').classList.add('show');

    // 확인 버튼 콜백 설정
    window.currentModalCallback = confirmCallback;
}

function closeModal() {
    document.getElementById('modalOverlay').classList.remove('show');
    window.currentModalCallback = null;
}

function confirmModal() {
    if (window.currentModalCallback) {
        window.currentModalCallback();
    } else {
        closeModal();
    }
}

// 토스트 알림
function showToast(message, type = 'info') {
    // 알림이 비활성화된 경우 표시하지 않음
    if (!notificationsEnabled) {
        return;
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.style.cssText = `
        position: fixed;
        top: 60px;
        right: 20px;
        background: var(--bg-secondary);
        border: 1px solid var(--border-color);
        border-radius: 8px;
        padding: 12px 16px;
        min-width: 250px;
        max-width: 400px;
        z-index: 10000;
        animation: toastSlideIn 0.3s ease;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        border-left: 4px solid ${type === 'success' ? 'var(--accent-green)' : type === 'error' ? 'var(--accent-red)' : type === 'warning' ? 'var(--accent-orange)' : 'var(--accent-blue)'};
    `;

    toast.innerHTML = `
        <div style="display: flex; align-items: center; gap: 8px;">
            <span style="font-size: 1.2rem;">${type === 'success' ? '✅' : type === 'error' ? '❌' : type === 'warning' ? '⚠️' : 'ℹ️'}</span>
            <span style="color: var(--text-primary); font-weight: 500;">${message}</span>
        </div>
    `;

    document.body.appendChild(toast);

    // 시스템 알림도 표시
    if (window.electron && window.electron.showNotification) {
        try {
            window.electron.showNotification('DGit MAC', message);
        } catch (error) {
            console.log('시스템 알림 표시 실패:', error);
        }
    }

    // 3초 후 자동 제거
    setTimeout(() => {
        toast.style.animation = 'toastSlideIn 0.3s ease reverse';
        setTimeout(() => {
            if (toast.parentNode) {
                toast.remove();
            }
        }, 300);
    }, 3000);
}

// 터미널 상태 업데이트
function updateTerminalStatus(statusOutput) {
    const terminalStatus = document.getElementById('terminalStatus');
    if (terminalStatus) {
        terminalStatus.innerHTML = `<pre style="margin: 0; font-family: inherit;">${statusOutput}</pre>`;
    }
}

// 커밋 상세보기
async function viewCommit(hash) {
    if (!currentProject) return;

    try {
        // 실제 커밋 정보 가져오기
        const result = await window.electron.dgit.command('show', ['--name-only', hash], currentProject.path);

        let commitDetails = `
            <div style="padding: 20px;">
                <h4 style="margin-bottom: 16px;">커밋 해시: ${hash}</h4>
        `;

        if (result.success) {
            const lines = result.output.split('\n');
            const commitMessage = lines.find(line => line.trim() && !line.startsWith('commit') && !line.startsWith('Author') && !line.startsWith('Date')) || '커밋 메시지 없음';

            commitDetails += `
                <h4 style="margin: 20px 0 16px 0;">커밋 메시지:</h4>
                <p style="color: var(--text-secondary); background: var(--bg-tertiary); padding: 12px; border-radius: 6px;">
                    ${commitMessage}
                </p>
            `;
        } else {
            commitDetails += `
                <p style="color: var(--text-secondary);">커밋 정보를 불러올 수 없습니다.</p>
            `;
        }

        commitDetails += `</div>`;

        showModal('커밋 상세정보', `커밋 ${hash}`, commitDetails);
    } catch (error) {
        console.error('커밋 정보 로드 실패:', error);
        showModal('커밋 상세정보', `커밋 ${hash}`, `
            <div style="padding: 20px;">
                <p style="color: var(--text-secondary);">커밋 정보를 불러오는 중 오류가 발생했습니다.</p>
            </div>
        `);
    }
}

// 커밋 변경사항 보기
async function viewCommitDiff(commitHash) {
    if (!currentProject) {
        showToast('프로젝트가 선택되지 않았습니다', 'warning');
        return;
    }

    try {
        const result = await window.electron.dgit.command('show', ['--name-only', commitHash], currentProject.path);

        if (result.success) {
            const files = result.output.split('\n').filter(line => line.trim() && !line.startsWith('commit'));

            showModal('커밋 변경사항', `커밋 ${commitHash}의 변경된 파일`, `
                <div style="max-height: 300px; overflow-y: auto;">
                    ${files.length > 0 ? files.map(file => `
                        <div style="padding: 8px; background: var(--bg-secondary); margin-bottom: 4px; border-radius: 4px;">
                            📄 ${file}
                        </div>
                    `).join('') : '<p>변경된 파일이 없습니다.</p>'}
                </div>
            `);
        } else {
            showToast('커밋 변경사항을 가져올 수 없습니다', 'error');
        }
    } catch (error) {
        console.error('커밋 변경사항 조회 실패:', error);
        showToast('커밋 변경사항 조회에 실패했습니다', 'error');
    }
}

// 파일 아이콘 가져오기
function getFileIcon(type) {
    const icons = {
        'psd': '🎨',
        'ai': '🖌️',
        'sketch': '✏️',
        'figma': '🎯',
        'xd': '💜',
        'png': '🖼️',
        'jpg': '📸',
        'jpeg': '📸',
        'gif': '🎬',
        'svg': '🎭',
        'pdf': '📄',
        'txt': '📝',
        'md': '📖',
        'json': '⚙️',
        'js': '⚡',
        'css': '🎨',
        'html': '🌐',
        'zip': '📦',
        'rar': '📦'
    };
    return icons[type.toLowerCase()] || '📄';
}

// 파일 상태 색상 가져오기
function getStatusColor(status) {
    const colors = {
        'modified': 'var(--accent-orange)',
        'staged': 'var(--accent-blue)',
        'committed': 'var(--accent-green)',
        'added': 'var(--accent-green)',
        'deleted': 'var(--accent-red)',
        'untracked': 'var(--text-secondary)',
        'unknown': 'var(--text-secondary)'
    };
    return colors[status] || 'var(--text-secondary)';
}

// 로딩 스피너 표시
function showLoadingSpinner(container, message = '로딩 중...') {
    const spinner = document.createElement('div');
    spinner.className = 'loading-container';
    spinner.innerHTML = `
        <div style="display: flex; flex-direction: column; align-items: center; padding: 40px;">
            <div class="loading-spinner"></div>
            <div style="margin-top: 16px; color: var(--text-secondary); font-size: 0.9rem;">
                ${message}
            </div>
        </div>
    `;

    if (typeof container === 'string') {
        container = document.getElementById(container);
    }

    if (container) {
        container.innerHTML = '';
        container.appendChild(spinner);
    }
}

// 로딩 스피너 숨기기
function hideLoadingSpinner(container) {
    if (typeof container === 'string') {
        container = document.getElementById(container);
    }

    if (container) {
        const loadingContainer = container.querySelector('.loading-container');
        if (loadingContainer) {
            loadingContainer.remove();
        }
    }
}

// 애니메이션 효과 추가
function addAnimation(element, animationClass) {
    element.classList.add(animationClass);
    element.addEventListener('animationend', () => {
        element.classList.remove(animationClass);
    }, { once: true });
}

// 햅틱 피드백 시뮬레이션
function triggerHapticFeedback(element, intensity = 'light') {
    if (element) {
        element.classList.add(`haptic-${intensity}`);
        setTimeout(() => {
            element.classList.remove(`haptic-${intensity}`);
        }, intensity === 'light' ? 100 : 150);
    }
}

// 빈 상태 표시
function showEmptyState(container, icon, title, description, actionButton = null) {
    const emptyState = `
        <div style="text-align: center; padding: 60px 40px; color: var(--text-secondary);">
            <div style="font-size: 4rem; margin-bottom: 24px; opacity: 0.7;">${icon}</div>
            <div style="font-size: 1.3rem; margin-bottom: 12px; color: var(--text-primary);">${title}</div>
            <div style="font-size: 1rem; line-height: 1.5; margin-bottom: 24px;">${description}</div>
            ${actionButton ? `<div>${actionButton}</div>` : ''}
        </div>
    `;

    if (typeof container === 'string') {
        container = document.getElementById(container);
    }

    if (container) {
        container.innerHTML = emptyState;
    }
}

// 에러 상태 표시
function showErrorState(container, title, description, retryCallback = null) {
    const errorState = `
        <div style="text-align: center; padding: 60px 40px; color: var(--text-secondary);">
            <div style="font-size: 4rem; margin-bottom: 24px; color: var(--accent-red);">⚠️</div>
            <div style="font-size: 1.3rem; margin-bottom: 12px; color: var(--accent-red);">${title}</div>
            <div style="font-size: 1rem; line-height: 1.5; margin-bottom: 24px;">${description}</div>
            ${retryCallback ? `
                <button class="btn btn-primary" onclick="${retryCallback}">
                    다시 시도
                </button>
            ` : ''}
        </div>
    `;

    if (typeof container === 'string') {
        container = document.getElementById(container);
    }

    if (container) {
        container.innerHTML = errorState;
    }
}

// 진행률 바 표시
function showProgressBar(container, progress = 0, message = '') {
    const progressBar = `
        <div style="padding: 20px;">
            <div style="margin-bottom: 12px; color: var(--text-secondary); font-size: 0.9rem;">
                ${message}
            </div>
            <div class="progress-bar">
                <div class="progress-fill" style="width: ${progress}%;"></div>
            </div>
            <div style="margin-top: 8px; text-align: center; color: var(--text-secondary); font-size: 0.8rem;">
                ${progress}%
            </div>
        </div>
    `;

    if (typeof container === 'string') {
        container = document.getElementById(container);
    }

    if (container) {
        container.innerHTML = progressBar;
    }
}

// 컨텍스트 메뉴 표시
function showContextMenu(x, y, items) {
    // 기존 컨텍스트 메뉴 제거
    const existingMenu = document.querySelector('.context-menu');
    if (existingMenu) {
        existingMenu.remove();
    }

    const contextMenu = document.createElement('div');
    contextMenu.className = 'context-menu';
    contextMenu.style.left = x + 'px';
    contextMenu.style.top = y + 'px';
    contextMenu.style.display = 'block';

    const menuItems = items.map(item => {
        if (item.separator) {
            return '<div class="context-menu-separator"></div>';
        }
        return `
            <div class="context-menu-item" onclick="${item.onclick}">
                ${item.icon ? `<span style="margin-right: 8px;">${item.icon}</span>` : ''}
                ${item.label}
            </div>
        `;
    }).join('');

    contextMenu.innerHTML = menuItems;
    document.body.appendChild(contextMenu);

    // 화면 경계 확인 및 조정
    const rect = contextMenu.getBoundingClientRect();
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;

    if (rect.right > windowWidth) {
        contextMenu.style.left = (windowWidth - rect.width - 10) + 'px';
    }
    if (rect.bottom > windowHeight) {
        contextMenu.style.top = (windowHeight - rect.height - 10) + 'px';
    }

    // 클릭 시 메뉴 닫기
    const closeMenu = (e) => {
        if (!contextMenu.contains(e.target)) {
            contextMenu.remove();
            document.removeEventListener('click', closeMenu);
        }
    };

    setTimeout(() => {
        document.addEventListener('click', closeMenu);
    }, 0);
}

// 드래그 앤 드롭 영역 설정
function setupDropZone(element, onDrop, onDragOver = null) {
    element.addEventListener('dragover', (e) => {
        e.preventDefault();
        element.classList.add('drag-over');
        if (onDragOver) onDragOver(e);
    });

    element.addEventListener('dragleave', (e) => {
        e.preventDefault();
        element.classList.remove('drag-over');
    });

    element.addEventListener('drop', (e) => {
        e.preventDefault();
        element.classList.remove('drag-over');
        if (onDrop) onDrop(e);
    });
}

// 키보드 단축키 힌트 표시
function showKeyboardShortcuts() {
    const shortcuts = `
        <div style="padding: 20px;">
            <h3 style="margin-bottom: 20px;">키보드 단축키</h3>
            <div style="display: grid; gap: 12px;">
                <div style="display: flex; justify-content: space-between; padding: 8px; background: var(--bg-secondary); border-radius: 6px;">
                    <span>새 프로젝트</span>
                    <kbd style="background: var(--bg-tertiary); padding: 4px 8px; border-radius: 4px; font-family: monospace;">⌘ + N</kbd>
                </div>
                <div style="display: flex; justify-content: space-between; padding: 8px; background: var(--bg-secondary); border-radius: 6px;">
                    <span>커밋</span>
                    <kbd style="background: var(--bg-tertiary); padding: 4px 8px; border-radius: 4px; font-family: monospace;">⌘ + S</kbd>
                </div>
                <div style="display: flex; justify-content: space-between; padding: 8px; background: var(--bg-secondary); border-radius: 6px;">
                    <span>홈으로</span>
                    <kbd style="background: var(--bg-tertiary); padding: 4px 8px; border-radius: 4px; font-family: monospace;">⌘ + W</kbd>
                </div>
                <div style="display: flex; justify-content: space-between; padding: 8px; background: var(--bg-secondary); border-radius: 6px;">
                    <span>새로고침</span>
                    <kbd style="background: var(--bg-tertiary); padding: 4px 8px; border-radius: 4px; font-family: monospace;">⌘ + R</kbd>
                </div>
                <div style="display: flex; justify-content: space-between; padding: 8px; background: var(--bg-secondary); border-radius: 6px;">
                    <span>닫기</span>
                    <kbd style="background: var(--bg-tertiary); padding: 4px 8px; border-radius: 4px; font-family: monospace;">Esc</kbd>
                </div>
            </div>
        </div>
    `;

    showModal('키보드 단축키', '자주 사용하는 단축키 목록', shortcuts);
}

// 테마 전환 (다크/라이트)
function toggleTheme() {
    const body = document.body;
    const currentTheme = body.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';

    body.setAttribute('data-theme', newTheme);

    // 테마 설정 저장
    if (window.electron && window.electron.config) {
        window.electron.config.save({ theme: newTheme });
    }

    showToast(`${newTheme === 'dark' ? '다크' : '라이트'} 테마로 변경되었습니다`, 'success');
}

// 풀스크린 토글
function toggleFullscreen() {
    if (window.electron && window.electron.toggleFullscreen) {
        window.electron.toggleFullscreen();
        showToast('풀스크린 모드가 토글되었습니다', 'info');
    }
}

// 개발자 도구 토글
function toggleDevTools() {
    if (window.electron && window.electron.toggleDevTools) {
        window.electron.toggleDevTools();
    }
}