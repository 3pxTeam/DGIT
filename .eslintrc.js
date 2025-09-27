module.exports = {
    env: {
        browser: true,
        es6: true,
        node: false
    },
    parserOptions: {
        ecmaVersion: 2020,
        sourceType: 'script'
    },
    rules: {
        'quotes': ['error', 'single', { 'allowTemplateLiterals': true }],
        'no-undef': 'error',
        'no-unused-vars': 'off'  // 사용하지 않는 변수 경고 비활성화
    },
    globals: {
        // Electron API
        window: "readonly",

        // 전역 변수들
        currentProject: "writable",
        activeContent: "writable",
        notificationsEnabled: "writable",
        recentProjectsList: "writable",
        currentModalCallback: "writable",

        // app.js 함수들
        initializeApp: "writable",
        setupTerminalResizer: "writable",
        loadAppConfig: "writable",
        updateNotificationUI: "writable",
        loadRecentProjects: "writable",
        selectNewProject: "writable",
        openCurrentProject: "writable",
        showRecentProjects: "writable",
        openRecentProject: "writable",
        goHome: "writable",
        showContent: "writable",
        showTerminalTab: "writable",
        toggleNotifications: "writable",
        saveNotificationSettings: "writable",

        // project.js 함수들
        checkDGitAvailability: "writable",
        checkIfRepository: "writable",
        selectProjectWithoutDGit: "writable",
        openProjectWithoutDGit: "writable",
        loadProjectFilesOnly: "writable",
        initializeRepository: "writable",
        openProject: "writable",
        showDGitInitPrompt: "writable",
        openProjectDirectly: "writable",
        loadProjectData: "writable",
        loadProjectFiles: "writable",
        loadCommitHistory: "writable",
        updateProjectStatus: "writable",
        updateFileStatuses: "writable",
        changeProject: "writable",
        scanProject: "writable",
        showInFinder: "writable",

        // git.js 함수들
        commitChanges: "writable",
        performCommit: "writable",
        addAllFiles: "writable",
        restoreFiles: "writable",
        performRestore: "writable",
        restoreToCommit: "writable",
        performRestoreToCommit: "writable",
        parseGitStatus: "writable",
        getGitStatusText: "writable",
        parseCommitLog: "writable",
        formatCommitDate: "writable",

        // ui.js 함수들
        renderFiles: "writable",
        renderCommits: "writable",
        isPreviewableImage: "writable",
        showImagePreview: "writable",
        closeImagePreview: "writable",
        selectFile: "writable",
        showModal: "writable",
        closeModal: "writable",
        confirmModal: "writable",
        showToast: "writable",
        updateTerminalStatus: "writable",
        viewCommit: "writable",
        viewCommitDiff: "writable",
        getFileIcon: "writable",
        getStatusColor: "writable",
        showLoadingSpinner: "writable",
        hideLoadingSpinner: "writable",
        addAnimation: "writable",
        triggerHapticFeedback: "writable",
        showEmptyState: "writable",
        showErrorState: "writable",
        showProgressBar: "writable",
        updateProgressBar: "writable",
        showCircularProgress: "writable",
        showStepProgress: "writable",
        showRealtimeProgress: "writable",
        showFileProgress: "writable",
        formatTime: "writable",
        showContextMenu: "writable",
        setupDropZone: "writable",
        showKeyboardShortcuts: "writable",
        toggleFullscreen: "writable",
        toggleDevTools: "writable",

        // utils.js 함수들
        formatFileSize: "writable",
        formatDate: "writable",
        formatRelativeTime: "writable",
        formatAbsoluteTime: "writable",
        truncateString: "writable",
        getFileExtension: "writable",
        removeFileExtension: "writable",
        formatNumber: "writable",
        formatPercent: "writable",
        debounce: "writable",
        throttle: "writable",
        deepClone: "writable",
        isEqual: "writable",
        uniqueArray: "writable",
        shuffleArray: "writable",
        generateRandomString: "writable",
        generateUUID: "writable",

        // 유틸리티 객체들
        ColorUtils: "writable",
        StorageUtils: "writable",
        UrlUtils: "writable",
        ErrorUtils: "writable",
        PerformanceUtils: "writable",
        EnvUtils: "writable",
        Utils: "writable"
    },
    rules: {
        "no-undef": "error",
        "no-unused-vars": "warn"
    }
};