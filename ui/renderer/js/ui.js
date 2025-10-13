
// 지원 가능한 파일 확장자 데이터 정의 
const supportedExtensionsData = {
    design: [
        { 
            ext: 'psd', 
            name: 'Adobe Photoshop', 
            icon: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="3" y="3" width="18" height="18" rx="4" fill="#0071C5"/><path d="M7 10h1.5v4H7zm3 0h1.5v4H10z" fill="#fff"/><path d="M14 10h1.5v2h2.5v2H14z" fill="#fff"/><text x="12" y="19" font-family="Verdana, sans-serif" font-size="6" fill="#fff" text-anchor="middle" font-weight="bold">PSD</text></svg>`
        },
        { 
            ext: 'ai', 
            name: 'Adobe Illustrator', 
            icon: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="3" y="3" width="18" height="18" rx="4" fill="#FF9A00"/><path d="M7.5 10l-1 4h1.5l.3-1h2.4l.3 1h1.5l-1-4h-4zM8 12.5l.7-2h-.9l-.7 2h.9z" fill="#fff"/><path d="M14 10h1.5v4H14z" fill="#fff"/><text x="12" y="19" font-family="Verdana, sans-serif" font-size="6" fill="#fff" text-anchor="middle" font-weight="bold">AI</text></svg>`
        },
        { 
            ext: 'sketch', 
            name: 'Sketch', 
            icon: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 3L3 9L12 21L21 9L12 3Z" fill="#F7C800"/><path d="M12 3L3 9L12 21L21 9L12 3Z" stroke="#755E00" stroke-width="1.5"/><path d="M12 3L12 21M3 9H21" stroke="#333" stroke-width="0.5"/></svg>`
        },
        { 
            ext: 'fig', 
            name: 'Figma', 
            icon: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="7" r="3.5" fill="#0ACF83"/><circle cx="12" cy="17" r="3.5" fill="#A259FF" fill-opacity="0.9"/><path d="M12 10.5V13.5" stroke="#fff" stroke-width="1.5" stroke-linecap="round"/></svg>`
        },
        { 
            ext: 'xd', 
            name: 'Adobe XD', 
            icon: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="3" y="3" width="18" height="18" rx="4" fill="#A259FF"/><path d="M10.5 8.5v7m3 0V8.5" stroke="#fff" stroke-width="2" stroke-linecap="round"/><path d="M10.5 12h3" stroke="#fff" stroke-width="2" stroke-linecap="round"/><text x="12" y="19" font-family="Verdana, sans-serif" font-size="6" fill="#fff" text-anchor="middle" font-weight="bold">XD</text></svg>`
        },
    ],
    image: [
        { 
            ext: 'png', 
            name: 'Portable Network Graphics', 
            icon: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="3" y="3" width="18" height="18" rx="4" fill="#30D158" fill-opacity="0.8"/><circle cx="8" cy="8" r="2" fill="#fff"/><rect x="5" y="15" width="14" height="4" rx="1" fill="#fff" fill-opacity="0.6"/><path d="M12 5L15 8L18 5" stroke="#fff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`
        },
        { 
            ext: 'jpg', 
            name: 'Joint Photographic Experts Group', 
            icon: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="3" y="3" width="18" height="18" rx="4" fill="#007AFF" fill-opacity="0.8"/><path d="M12 12m-3.5 0a3.5 3.5 0 1 0 7 0a3.5 3.5 0 1 0 -7 0" fill="#fff"/><circle cx="15.5" cy="8.5" r="1.5" fill="#fff"/><text x="12" y="19" font-family="Verdana, sans-serif" font-size="6" fill="#fff" text-anchor="middle" font-weight="bold">JPG</text></svg>`
        },
        { 
            ext: 'jpeg', 
            name: 'JPEG Image', 
            icon: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="3" y="3" width="18" height="18" rx="4" fill="#007AFF" fill-opacity="0.8"/><path d="M12 12m-3.5 0a3.5 3.5 0 1 0 7 0a3.5 3.5 0 1 0 -7 0" fill="#fff"/><circle cx="15.5" cy="8.5" r="1.5" fill="#fff"/><text x="12" y="19" font-family="Verdana, sans-serif" font-size="6" fill="#fff" text-anchor="middle" font-weight="bold">JPG</text></svg>`
        },
        { 
            ext: 'gif', 
            name: 'Graphics Interchange Format', 
            icon: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="3" y="3" width="18" height="18" rx="4" fill="#FF9F0A" fill-opacity="0.8"/><path d="M7.5 10v4m-1-2h2m4.5-2v4" stroke="#fff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M14 10h3.5v1.5h-2v1h2v1.5H14z" fill="#fff"/><text x="12" y="19" font-family="Verdana, sans-serif" font-size="6" fill="#fff" text-anchor="middle" font-weight="bold">GIF</text></svg>`
        },
        { 
            ext: 'svg', 
            name: 'Scalable Vector Graphics', 
            icon: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="3" y="3" width="18" height="18" rx="4" fill="#8E8E93" fill-opacity="0.8"/><path d="M8 8.5h8m-8 7h8m-8-3h8" stroke="#fff" stroke-width="1.5" stroke-linecap="round"/><path d="M12 7l-2.5 3.5l2.5 3.5l2.5-3.5z" fill="#D1D1D6" stroke="#fff" stroke-width="0.5"/><text x="12" y="19" font-family="Verdana, sans-serif" font-size="6" fill="#fff" text-anchor="middle" font-weight="bold">SVG</text></svg>`
        }
    ]
};

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

        //  커밋 메시지 안전하게 처리
        let cleanMessage = (commit.message || '커밋 메시지 없음').trim();
        // 앞뒤 따옴표 제거
        cleanMessage = cleanMessage.replace(/^["']|["']$/g, '');

        // 파일 미리보기 이미지 (기본 그라데이션)
        const commitImageStyle = `
            background: linear-gradient(135deg, 
                ${index % 3 === 0 ? '#007aff, #5856d6' : index % 3 === 1 ? '#30d158, #00c7be' : '#ff9f0a, #ff375f'});
        `;

        return `
            <div class="commit-item" onclick="viewCommit('${commit.hash}')">
                <div class="commit-image" style="${commitImageStyle}">
                    <div class="commit-image-placeholder">
                        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" style="opacity: 0.6;">
                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                            <circle cx="8.5" cy="8.5" r="1.5"></circle>
                            <polyline points="21 15 16 10 5 21"></polyline>
                        </svg>
                    </div>
                </div>
                <div class="commit-content">
                    <div class="commit-message">${cleanMessage}</div>
                    <div class="commit-meta">
                        <span class="commit-date">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <circle cx="12" cy="12" r="10"></circle>
                                <polyline points="12 6 12 12 16 14"></polyline>
                            </svg>
                            ${commit.date || '날짜 없음'}
                        </span>
                        ${commit.version ? `<span class="commit-version">v${commit.version}</span>` : ''}
                        <span class="commit-hash">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
                                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
                            </svg>
                            ${commit.hash}
                        </span>
                        ${commit.files > 0 ? `
                            <span class="commit-files">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path>
                                    <polyline points="13 2 13 9 20 9"></polyline>
                                </svg>
                                ${commit.files} 파일
                            </span>
                        ` : ''}
                    </div>
                    <div class="commit-actions">
                        <button class="commit-action-btn restore-btn" onclick="event.stopPropagation(); restoreToCommit('${commit.hash}')">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="1 4 1 10 7 10"></polyline>
                                <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path>
                            </svg>
                            복원
                        </button>
                        <button class="commit-action-btn diff-btn" onclick="event.stopPropagation(); viewCommitDiff('${commit.hash}')">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="16 18 22 12 16 6"></polyline>
                                <polyline points="8 6 2 12 8 18"></polyline>
                            </svg>
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

    //  수정: 모달이 열릴 때 body 스크롤 방지 및 클릭 차단 방지 
    document.body.classList.add('modal-open');
    //  수정 끝 

    // 확인 버튼 콜백 설정
    window.currentModalCallback = confirmCallback;

    // (참고: index.html에서 closeModal을 직접 호출하는 버튼을 추가했습니다.)
}

function closeModal() {
    document.getElementById('modalOverlay').classList.remove('show');
    
    //  수정: 모달이 닫힐 때 body 스크롤 허용 
    document.body.classList.remove('modal-open');
    //  수정 끝 
    
    window.currentModalCallback = null;
}

function confirmModal() {
    if (window.currentModalCallback) {
        window.currentModalCallback();
    } else {
        closeModal();
    }
}

/**
 * 우측 상단에 토스트 알림을 표시합니다.
 * @param {string} message - 표시할 메시지
 * @param {('success'|'error'|'warning'|'info')} type - 알림 타입 (색상 및 아이콘 결정)
 * @param {number} duration - 알림 유지 시간 (ms)
 */
function showToast(message, type = 'info', duration = 2000) { 
    //알림이 꺼져있으면 토스트도 표시하지 않음
    if (window.notificationsEnabled === false){
        console.log('[Toast] 알림이 비활성화되어 있어 토스트를 표시하지 않습니다.')
        return; 
    }
    
    const container = document.getElementById('toastContainer');
    if (!container) {
        console.warn('Toast container not found.');
        return;
    }

    const toast = document.createElement('div');
    toast.className = `toast ${type} fade-in`;

    const iconMap = {
        'success': '✓',
        'error': '✗',
        'warning': '⚠',
        'info': 'ⓘ'
    };
    
    // 이모지 또는 아이콘을 사용하도록 수정 (components.css의 스타일과 일치)
    const icon = `<span style="font-size: 1.2rem; min-width: 1.2rem; text-align: center;">${iconMap[type] || 'ⓘ'}</span>`;

    toast.innerHTML = `
        ${icon}
        <div style="flex: 1; color: var(--text-primary); font-size: 0.95rem;">${message}</div>
    `;

    // 최신 알림이 위에 보이도록 prepend
    container.prepend(toast);

    // 알림 제거 로직
    setTimeout(() => {
        // 애니메이션 클래스 제거 및 추가
        toast.classList.remove('fade-in');
        toast.classList.add('fade-out');
        
        // fade-out 애니메이션이 끝난 후 DOM에서 제거
        toast.addEventListener('animationend', () => {
            if (toast.classList.contains('fade-out')) {
                toast.remove();
            }
        }, { once: true });

    }, duration);
}


// 터미널 상태 업데이트
function updateTerminalStatus(statusOutput) {
    const terminalStatus = document.getElementById('terminalStatus');
    if (terminalStatus) {
        //  수정: 인라인 스타일로 font-size 10px 강제 적용 
        terminalStatus.innerHTML = `<pre style="margin: 0; font-family: inherit; font-size: 10px;">${statusOutput}</pre>`;
    }
}

// 커밋 상세보기
async function viewCommit(hash) {
    if (!currentProject) return;

    try {
        //  DGit log 명령어로 커밋 정보 가져오기
        const logResult = await window.electron.dgit.log(currentProject.path, 100);

        let commitDetails = `
            <div style="padding: 20px;">
                <h4 style="margin-bottom: 16px;">커밋 해시: ${hash}</h4>
        `;

        if (logResult.success && logResult.output) {
            //  parseCommitLog 함수로 커밋 파싱
            const commits = parseCommitLog(logResult.output);
            const targetCommit = commits.find(c => c.hash === hash || c.hash.startsWith(hash));

            if (targetCommit && targetCommit.message) {
                //  커밋 메시지 안전하게 처리
                let cleanMessage = targetCommit.message.trim();
                cleanMessage = cleanMessage.replace(/^["']|["']$/g, '');

                commitDetails += `
                    <h4 style="margin: 20px 0 16px 0;">커밋 정보:</h4>
                    <div style="background: var(--bg-tertiary); padding: 16px; border-radius: 8px; margin-bottom: 16px;">
                        <div style="margin-bottom: 8px;">
                            <strong style="color: var(--accent-blue);">버전:</strong> 
                            <span style="color: var(--text-primary);">v${targetCommit.version}</span>
                        </div>
                        <div style="margin-bottom: 8px;">
                            <strong style="color: var(--accent-blue);">작성자:</strong> 
                            <span style="color: var(--text-primary);">${targetCommit.author || '알 수 없음'}</span>
                        </div>
                        <div style="margin-bottom: 8px;">
                            <strong style="color: var(--accent-blue);">날짜:</strong> 
                            <span style="color: var(--text-primary);">${targetCommit.date || '알 수 없음'}</span>
                        </div>
                        ${targetCommit.files > 0 ? `
                            <div>
                                <strong style="color: var(--accent-blue);">파일:</strong> 
                                <span style="color: var(--text-primary);">${targetCommit.files}개</span>
                            </div>
                        ` : ''}
                    </div>
                    
                    <h4 style="margin: 20px 0 16px 0;">커밋 메시지:</h4>
                    <p style="color: var(--text-secondary); background: var(--bg-tertiary); padding: 16px; border-radius: 8px; line-height: 1.6; border-left: 4px solid var(--accent-green);">
                        ${cleanMessage}
                    </p>
                `;
            } else {
                commitDetails += `
                    <p style="color: var(--text-secondary); text-align: center; padding: 20px;">
                        커밋 정보를 찾을 수 없습니다.
                    </p>
                `;
            }
        } else {
            commitDetails += `
                <p style="color: var(--text-secondary); text-align: center; padding: 20px;">
                    커밋 정보를 불러올 수 없습니다.
                </p>
            `;
        }

        commitDetails += `
            <div style="display: flex; justify-content: center; margin-top: 20px;">
                <button class="btn btn-secondary" onclick="closeModal()">닫기</button>
            </div>
        </div>`;

        showModal('커밋 상세정보', `커밋 ${hash}`, commitDetails);
    } catch (error) {
        console.error('커밋 정보 로드 실패:', error);
        showModal('커밋 상세정보', `커밋 ${hash}`, `
            <div style="padding: 20px;">
                <p style="color: var(--text-secondary); text-align: center;">커밋 정보를 불러오는 중 오류가 발생했습니다.</p>
                <div style="display: flex; justify-content: center; margin-top: 20px;">
                    <button class="btn btn-secondary" onclick="closeModal()">닫기</button>
                </div>
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
    // supportedExtensionsData에서 SVG 아이콘을 직접 가져오거나, 기존 이모지 대체
    const designIcon = supportedExtensionsData.design.find(d => d.ext === type.toLowerCase());
    if (designIcon) return designIcon.icon;

    const imageIcon = supportedExtensionsData.image.find(i => i.ext === type.toLowerCase());
    if (imageIcon) return imageIcon.icon;

    // 기타 파일 형식에 대한 이모지
    const icons = {
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
        // 상태 코드
        'M': 'var(--accent-orange)', // modified
        'A': 'var(--accent-green)',  // added
        'D': 'var(--accent-red)',    // deleted
        'R': 'var(--accent-purple)', // renamed
        'C': 'var(--accent-blue)',   // copied
        'U': 'var(--accent-red)',    // updated (unmerged)
        '?': 'var(--text-secondary)',// untracked
        '!': 'var(--text-secondary)',// ignored
        
        // 텍스트 상태 (추가)
        'modified': 'var(--accent-orange)',
        'added': 'var(--accent-green)',
        'committed': 'var(--accent-green)',
        'deleted': 'var(--accent-red)',
        'renamed': 'var(--accent-purple)',
        'copied': 'var(--accent-blue)',
        'updated': 'var(--accent-red)',
        'untracked': 'var(--text-secondary)',
        'ignored': 'var(--text-secondary)',
        'unknown': 'var(--text-tertiary)'
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

// ============ 향상된 프로그레스 바 함수들 ============

// 기본 프로그레스 바 표시 (향상된 버전)
function showProgressBar(container, progress = 0, message = '', animated = true) {
    const progressBar = `
        <div class="enhanced-progress-container">
            <div class="enhanced-progress-header">
                <div class="enhanced-progress-message">${message}</div>
                <div class="enhanced-progress-percentage">${progress}%</div>
            </div>
            <div class="enhanced-progress-bar-wrapper">
                <div class="progress-bar">
                    <div class="progress-fill ${animated ? 'animated' : ''}" 
                         style="width: ${progress}%;"
                         data-progress="${progress}">
                    </div>
                </div>
            </div>
        </div>
    `;

    if (typeof container === 'string') {
        container = document.getElementById(container);
    }

    if (container) {
        container.innerHTML = progressBar;

        // 애니메이션 효과
        if (animated) {
            const progressFill = container.querySelector('.progress-fill');
            if (progressFill) {
                progressFill.style.width = '0%';
                setTimeout(() => {
                    progressFill.style.width = progress + '%';
                }, 100);
            }
        }
    }
}

// 프로그레스 바 업데이트 (기존 바가 있을 때)
function updateProgressBar(container, progress, message = '') {
    if (typeof container === 'string') {
        container = document.getElementById(container);
    }

    if (container) {
        const progressFill = container.querySelector('.progress-fill');
        const progressMessage = container.querySelector('.enhanced-progress-message');
        const progressPercentage = container.querySelector('.enhanced-progress-percentage');

        if (progressFill) {
            progressFill.style.width = progress + '%';
            progressFill.setAttribute('data-progress', progress);
        }

        if (progressMessage && message) {
            progressMessage.textContent = message;
        }

        if (progressPercentage) {
            progressPercentage.textContent = progress + '%';
        }
    }
}

// 원형 프로그레스 바 (특별한 작업용)
function showCircularProgress(container, progress = 0, message = '') {
    const circularProgress = `
        <div class="circular-progress-container">
            <div class="circular-progress" data-progress="${progress}">
                <svg class="circular-progress-svg" width="80" height="80">
                    <circle cx="40" cy="40" r="35" class="circular-progress-bg"></circle>
                    <circle cx="40" cy="40" r="35" class="circular-progress-fill"
                            style="stroke-dasharray: ${2 * Math.PI * 35}; 
                                   stroke-dashoffset: ${2 * Math.PI * 35 * (100 - progress) / 100};"></circle>
                </svg>
                <div class="circular-progress-text">
                    <div class="circular-progress-percentage">${progress}%</div>
                </div>
            </div>
            <div class="circular-progress-message">${message}</div>
        </div>
    `;

    if (typeof container === 'string') {
        container = document.getElementById(container);
    }

    if (container) {
        container.innerHTML = circularProgress;
    }
}

// 멀티 스텝 프로그레스 바
function showStepProgress(container, currentStep, totalSteps, stepLabels = []) {
    const steps = Array.from({ length: totalSteps }, (_, i) => {
        const stepNumber = i + 1;
        const isCompleted = stepNumber < currentStep;
        const isCurrent = stepNumber === currentStep;
        const label = stepLabels[i] || `Step ${stepNumber}`;

        return `
            <div class="step-item ${isCompleted ? 'completed' : ''} ${isCurrent ? 'current' : ''}">
                <div class="step-indicator">
                    ${isCompleted ? '✓' : stepNumber}
                </div>
                <div class="step-label">${label}</div>
            </div>
        `;
    }).join('');

    const stepProgress = `
        <div class="step-progress-container">
            <div class="step-progress-line" style="width: ${((currentStep - 1) / (totalSteps - 1)) * 100}%"></div>
            <div class="step-progress-steps">
                ${steps}
            </div>
        </div>
    `;

    if (typeof container === 'string') {
        container = document.getElementById(container);
    }

    if (container) {
        container.innerHTML = stepProgress;
    }
}

// 실시간 프로그레스 바 (스트리밍용)
function showRealtimeProgress(container, initialMessage = '작업 준비 중...') {
    const realtimeProgress = `
        <div class="realtime-progress-container">
            <div class="realtime-progress-header">
                <div class="realtime-progress-title" id="realtimeProgressTitle">${initialMessage}</div>
                <div class="realtime-progress-status" id="realtimeProgressStatus">0%</div>
            </div>
            <div class="realtime-progress-bar">
                <div class="realtime-progress-fill" id="realtimeProgressFill" style="width: 0%;"></div>
                <div class="realtime-progress-pulse"></div>
            </div>
            <div class="realtime-progress-details" id="realtimeProgressDetails">
                <div class="realtime-progress-speed" id="progressSpeed">--</div>
                <div class="realtime-progress-eta" id="progressETA">--</div>
            </div>
        </div>
    `;

    if (typeof container === 'string') {
        container = document.getElementById(container);
    }

    if (container) {
        container.innerHTML = realtimeProgress;
    }

    // 실시간 업데이트 함수 반환
    return {
        update: (progress, message, speed = null, eta = null) => {
            const fill = document.getElementById('realtimeProgressFill');
            const title = document.getElementById('realtimeProgressTitle');
            const status = document.getElementById('realtimeProgressStatus');
            const speedEl = document.getElementById('progressSpeed');
            const etaEl = document.getElementById('progressETA');

            if (fill) fill.style.width = progress + '%';
            if (title && message) title.textContent = message;
            if (status) status.textContent = progress + '%';
            if (speedEl && speed) speedEl.textContent = speed;
            if (etaEl && eta) etaEl.textContent = eta;
        },
        complete: (message = '완료!') => {
            const title = document.getElementById('realtimeProgressTitle');
            const status = document.getElementById('realtimeProgressStatus');
            const fill = document.getElementById('realtimeProgressFill');

            if (title) title.textContent = message;
            if (status) status.textContent = '100%';
            if (fill) {
                fill.style.width = '100%';
                fill.classList.add('completed');
            }
        }
    };
}

// 파일 업로드/다운로드 전용 프로그레스 바
function showFileProgress(container, fileName, fileSize = 0) {
    const fileProgress = `
        <div class="file-progress-container">
            <div class="file-progress-header">
                <div class="file-progress-icon">📁</div>
                <div class="file-progress-info">
                    <div class="file-progress-name" id="fileProgressName">${fileName}</div>
                    <div class="file-progress-size" id="fileProgressSize">${formatFileSize(fileSize)}</div>
                </div>
                <div class="file-progress-percent" id="fileProgressPercent">0%</div>
            </div>
            <div class="file-progress-bar">
                <div class="file-progress-fill" id="fileProgressFill" style="width: 0%;"></div>
            </div>
            <div class="file-progress-stats">
                <span class="file-progress-transferred" id="fileTransferred">0 B</span>
                <span class="file-progress-speed" id="fileSpeed">-- KB/s</span>
                <span class="file-progress-remaining" id="fileRemaining">--</span>
            </div>
        </div>
    `;

    if (typeof container === 'string') {
        container = document.getElementById(container);
    }

    if (container) {
        container.innerHTML = fileProgress;
    }

    let startTime = Date.now();
    let lastUpdate = startTime;
    let lastTransferred = 0;

    return {
        update: (transferred, total) => {
            const now = Date.now();
            const progress = Math.round((transferred / total) * 100);

            // UI 업데이트
            const fill = document.getElementById('fileProgressFill');
            const percent = document.getElementById('fileProgressPercent');
            const transferredEl = document.getElementById('fileTransferred');
            const speedEl = document.getElementById('fileSpeed');
            const remainingEl = document.getElementById('fileRemaining');

            if (fill) fill.style.width = progress + '%';
            if (percent) percent.textContent = progress + '%';
            if (transferredEl) transferredEl.textContent = formatFileSize(transferred);

            // 속도 계산 (1초마다)
            if (now - lastUpdate >= 1000) {
                const speed = (transferred - lastTransferred) / ((now - lastUpdate) / 1000);
                const remaining = (total - transferred) / speed;

                if (speedEl) speedEl.textContent = formatFileSize(speed) + '/s';
                if (remainingEl && remaining > 0) {
                    remainingEl.textContent = formatTime(remaining);
                }

                lastUpdate = now;
                lastTransferred = transferred;
            }
        },
        complete: () => {
            const speedEl = document.getElementById('fileSpeed');
            const remainingEl = document.getElementById('fileRemaining');

            if (speedEl) speedEl.textContent = '완료';
            if (remainingEl) remainingEl.textContent = '';
        }
    };
}

// 시간 포맷팅 헬퍼 함수
function formatTime(seconds) {
    if (seconds < 60) return Math.round(seconds) + '초';
    if (seconds < 3600) return Math.round(seconds / 60) + '분';
    return Math.round(seconds / 3600) + '시간';
}

// ============ 지원 파일 확장자 렌더링 함수 추가 ============

/**
 * 정보 탭에 지원 파일 확장자 목록을 렌더링합니다.
 */
function renderSupportedExtensions() {
    const designContainer = document.getElementById('designFileExtensions');
    const imageContainer = document.getElementById('imageFileExtensions');

    if (!designContainer || !imageContainer) return;

    // 디자인 파일 렌더링
    designContainer.innerHTML = supportedExtensionsData.design.map(item => `
        <div class="command-item" style="display: flex; justify-content: space-between; align-items: center;">
            <div style="display: flex; align-items: center; gap: 8px;">
                <span style="width: 24px; height: 24px; display: flex; align-items: center; justify-content: center;">${item.icon}</span>
                <code style="margin-bottom: 0;">.${item.ext}</code>
            </div>
            <p style="margin: 0; text-align: right; flex: 1; color: var(--text-secondary);">${item.name}</p>
        </div>
    `).join('');

    // 이미지 파일 렌더링
    imageContainer.innerHTML = supportedExtensionsData.image.map(item => `
        <div class="command-item" style="display: flex; justify-content: space-between; align-items: center;">
            <div style="display: flex; align-items: center; gap: 8px;">
                <span style="width: 24px; height: 24px; display: flex; align-items: center; justify-content: center;">${item.icon}</span>
                <code style="margin-bottom: 0;">.${item.ext}</code>
            </div>
            <p style="margin: 0; text-align: right; flex: 1; color: var(--text-secondary);">${item.name}</p>
        </div>
    `).join('');
}

// ============ 대시보드 렌더링 함수 추가 

/**
 * 파일 상태 카운트를 기반으로 Commit Health Bar와 Summary Cards를 렌더링합니다.
 * @param {object} stats - {total: number, M: number, A: number, '?': number, ...}
 */
function renderCommitHealthDashboard(stats) {
    const dashboard = document.getElementById('commitHealthDashboard');
    if (!dashboard) return;

    // 통계 데이터 계산 (예시 값 사용 - 실제로는 git.js나 app.js에서 계산되어 넘어와야 함)
    const totalFiles = stats.total || 0;
    const modified = stats.M || 0;
    const added = stats.A || 0;
    const untracked = stats['?'] || 0;
    const committed = totalFiles - modified - added - untracked; // Committed는 나머지로 가정

    // 퍼센티지 계산 (0으로 나누는 것을 방지)
    const total = totalFiles > 0 ? totalFiles : 1;
    const committedPct = (committed / total) * 100;
    const modifiedPct = (modified / total) * 100;
    const addedPct = (added / total) * 100;
    const untrackedPct = (untracked / total) * 100;
    
    // Summary Cards HTML
    const summaryCards = `
        <div class="summary-cards">
            <div class="summary-card total-card">
                <div class="card-icon">📁</div>
                <div class="card-value">${totalFiles}</div>
                <div class="card-label">총 파일</div>
            </div>
            <div class="summary-card modified-card">
                <div class="card-icon" style="color: var(--accent-orange);">✏️</div>
                <div class="card-value">${modified}</div>
                <div class="card-label">수정됨 (Modified)</div>
            </div>
            <div class="summary-card untracked-card">
                <div class="card-icon" style="color: var(--text-secondary);">❓</div>
                <div class="card-value">${untracked}</div>
                <div class="card-label">추적 안함 (Untracked)</div>
            </div>
        </div>
    `;

    // Health Bar HTML
    const healthBar = `
        <div class="health-bar-container">
            <div class="health-bar">
                <div class="health-segment committed-segment" style="width: ${committedPct}%;" title="Committed: ${committed} (${committedPct.toFixed(1)}%)"></div>
                <div class="health-segment modified-segment" style="width: ${modifiedPct}%;" title="Modified: ${modified} (${modifiedPct.toFixed(1)}%)"></div>
                <div class="health-segment added-segment" style="width: ${addedPct}%;" title="Added: ${added} (${addedPct.toFixed(1)}%)"></div>
                <div class="health-segment untracked-segment" style="width: ${untrackedPct}%;" title="Untracked: ${untracked} (${untrackedPct.toFixed(1)}%)"></div>
            </div>
        </div>
    `;

    dashboard.innerHTML = summaryCards + healthBar;
}

//  대시보드 렌더링 함수 추가 끝 


// ============ 기존 함수들 계속 ============

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