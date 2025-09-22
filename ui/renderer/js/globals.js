/* globals.js - ESLint 전역 함수 선언 */

/* eslint-disable no-unused-vars */

// app.js 함수들
let initializeApp;
let loadAppConfig;
let updateNotificationUI;
let loadRecentProjects;
let selectNewProject;
let openCurrentProject;
let showRecentProjects;
let openRecentProject;
let goHome;
let showContent;
let showTerminalTab;
let toggleTerminal;
let toggleNotifications;
let saveNotificationSettings;

// project.js 함수들
let checkDGitAvailability;
let checkIfRepository;
let selectProjectWithoutDGit;
let openProjectWithoutDGit;
let loadProjectFilesOnly;
let initializeRepository;
let openProject;
let showDGitInitPrompt;
let openProjectDirectly;
let loadProjectData;
let loadProjectFiles;
let loadCommitHistory;
let updateProjectStatus;
let updateFileStatuses;
let changeProject;
let scanProject;
let showInFinder;

// git.js 함수들
let commitChanges;
let performCommit;
let addAllFiles;
let restoreFiles;
let performRestore;
let createBranch;
let createNewBranch;
let restoreToCommit;
let performRestoreToCommit;
let parseGitStatus;
let getGitStatusText;
let parseCommitLog;
let formatCommitDate;
let updateBranchGraph;

// ui.js 함수들
let renderFiles;
let renderCommits;
let isPreviewableImage;
let showImagePreview;
let closeImagePreview;
let selectFile;
let showModal;
let closeModal;
let confirmModal;
let showToast;
let updateTerminalStatus;
let viewCommit;
let viewCommitDiff;
let getFileIcon;
let getStatusColor;
let showLoadingSpinner;
let hideLoadingSpinner;
let addAnimation;
let triggerHapticFeedback;
let showEmptyState;
let showErrorState;
let showProgressBar;
let showContextMenu;
let setupDropZone;
let showKeyboardShortcuts;
let toggleTheme;
let toggleFullscreen;
let toggleDevTools;

// utils.js 함수들
let formatFileSize;
let formatDate;
let formatRelativeTime;
let formatAbsoluteTime;
let truncateString;
let getFileExtension;
let removeFileExtension;
let formatNumber;
let formatPercent;
let debounce;
let throttle;
let deepClone;
let isEqual;
let uniqueArray;
let shuffleArray;
let generateRandomString;
let generateUUID;

// 전역 변수들
let currentProject;
let activeContent;
let notificationsEnabled;
let recentProjectsList;
let currentModalCallback;

// 유틸리티 객체들
let ColorUtils;
let StorageUtils;
let UrlUtils;
let ErrorUtils;
let PerformanceUtils;
let EnvUtils;
let Utils;