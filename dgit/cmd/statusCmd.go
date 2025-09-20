package cmd

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"dgit/internal/log"
	"dgit/internal/scanner"
	"dgit/internal/staging"
	"dgit/internal/status"
	
	"github.com/spf13/cobra"
)

// StatusCmd represents the status command for showing working tree status
// Similar to 'git status' but with design-specific metadata change detection
var StatusCmd = &cobra.Command{
	Use:   "status",
	Short: "Show the working tree status",
	Long: `Display the current status of the repository including:
- Files staged for commit
- Modified files not yet staged  
- Untracked design files
- Deleted files

DGit shows metadata changes for design files:
- Layer count changes
- Dimension changes  
- Color mode changes
- Version updates`,
	Run: runStatus,
}

// runStatus executes the status command functionality
// Shows comprehensive status including design file metadata changes
func runStatus(cmd *cobra.Command, args []string) {
	// Ensure we're in a DGit repository
	dgitDir := checkDgitRepository()
	
	// Initialize managers for various status operations
	stagingArea := staging.NewStagingArea(dgitDir)
	statusManager := status.NewStatusManager(dgitDir)
	logManager := log.NewLogManager(dgitDir)

	// Load current staging area state
	if err := stagingArea.LoadStaging(); err != nil {
		printError(fmt.Sprintf("loading staging area: %v", err))
		os.Exit(1)
	}

	// Get current version info and display branch-like status
	currentVersion := logManager.GetCurrentVersion()
	fmt.Printf("On version %d\n\n", currentVersion+1) // Next version number
	
	// Display staged files if any exist
	if !stagingArea.IsEmpty() {
		fmt.Println("Changes to be committed:")
		printStatusStagingStatus(stagingArea)
		fmt.Println()
	} else {
		fmt.Println("No changes staged for commit.")
		fmt.Println()
	}

	// Scan current working directory for design files
	currentWorkDir, _ := os.Getwd()
	currentDirFiles := scanCurrentDirectory(currentWorkDir)

	// Compare current files with last commit to detect changes
	result, err := statusManager.CompareWithCommit(currentVersion, currentDirFiles)
	if err != nil {
		printWarning(fmt.Sprintf("Failed to compare with last commit: %v", err))
		return
	}

	// Get last commit for metadata comparison purposes
	var lastCommit *log.Commit
	if currentVersion > 0 {
		lastCommit, err = logManager.GetCommit(currentVersion)
		if err != nil {
			printWarning(fmt.Sprintf("Failed to load last commit for metadata comparison: %v", err))
		}
	}

	// Filter out files that are already staged from the results
	// This prevents showing the same file in multiple sections
	result.ModifiedFiles = filterStagedFiles(result.ModifiedFiles, stagingArea)
	result.UntrackedFiles = filterStagedFiles(result.UntrackedFiles, stagingArea)
	result.DeletedFiles = filterStagedFiles(result.DeletedFiles, stagingArea)

	// Display modified files (not staged)
	if len(result.ModifiedFiles) > 0 {
		fmt.Println("Changes not staged for commit:")
		for _, fileStatus := range result.ModifiedFiles {
			// Add design-specific metadata change summary
			metadataSummary := getMetadataChangeSummary(fileStatus.Path, lastCommit, currentWorkDir)
			fmt.Printf("  modified: %s%s\n", fileStatus.Path, metadataSummary)
		}
		fmt.Println()
	} else {
		fmt.Println("No changes not staged for commit.")
	}

	// Display untracked files
	if len(result.UntrackedFiles) > 0 {
		fmt.Println("Untracked files:")
		for _, fileStatus := range result.UntrackedFiles {
			// Show file type for better visual distinction
			fileType := getStatusFileType(fileStatus.Path)
			fmt.Printf("  [%s] %s\n", fileType, fileStatus.Path)
		}
		fmt.Println()
	} else {
		fmt.Println("No untracked files.")
	}

	// Display deleted files
	if len(result.DeletedFiles) > 0 {
		fmt.Println("Deleted files:")
		for _, fileStatus := range result.DeletedFiles {
			fmt.Printf("  deleted: %s\n", fileStatus.Path)
		}
		fmt.Println()
	} else {
		fmt.Println("No deleted files.")
	}

	// Show helpful command suggestions
	fmt.Println("Commands:")
	fmt.Println("   Use 'dgit add <file>' to stage files for commit")
	fmt.Println("   Use 'dgit commit' to commit staged changes")
	if len(result.ModifiedFiles) > 0 || len(result.UntrackedFiles) > 0 {
		fmt.Println("   Use 'dgit scan' to analyze design file details")
	}
}

// scanCurrentDirectory scans the current directory for design files and returns their hashes
// Used to detect file changes by comparing current state with last commit
func scanCurrentDirectory(currentWorkDir string) map[string]string {
	currentDirFiles := make(map[string]string)
	
	// Walk through all files in the working directory
	filepath.Walk(currentWorkDir, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return nil // Skip errors and continue scanning
		}
		if info.IsDir() {
			// Skip the .dgit directory to avoid scanning repository internals
			if info.Name() == ".dgit" {
				return filepath.SkipDir
			}
			return nil
		}
		
		// Process only design files (ignore other file types)
		if scanner.IsDesignFile(path) {
			relPath, relErr := filepath.Rel(currentWorkDir, path)
			if relErr != nil {
				return nil
			}
			
			// Calculate file hash for change detection
			hash, hashErr := status.CalculateFileHash(path)
			if hashErr != nil {
				return nil
			}
			currentDirFiles[relPath] = hash
		}
		return nil
	})

	return currentDirFiles
}

// filterStagedFiles removes files that are already staged from status results
// Prevents showing the same file in both staged and unstaged sections
func filterStagedFiles(files []status.FileStatus, stagingArea *staging.StagingArea) []status.FileStatus {
	var filtered []status.FileStatus
	for _, file := range files {
		if !stagingArea.HasFile(file.Path) {
			filtered = append(filtered, file)
		}
	}
	return filtered
}

// getMetadataChangeSummary generates a summary of design-specific metadata changes
// This is unique to DGit - shows what changed in the design file beyond just content
func getMetadataChangeSummary(filePath string, lastCommit *log.Commit, currentWorkDir string) string {
	if lastCommit == nil {
		return ""
	}

	// Get current file metadata by scanning the file
	currentFileInfo, err := scanner.NewFileScanner().ScanFile(filepath.Join(currentWorkDir, filePath))
	if err != nil {
		return ""
	}

	// Get old metadata from last commit
	oldMetaRaw, ok := lastCommit.Metadata[filePath].(map[string]interface{})
	if !ok {
		return ""
	}

	// Extract old metadata values
	oldLayers, _ := oldMetaRaw["layers"].(float64)
	oldArtboards, _ := oldMetaRaw["artboards"].(float64)
	oldDimensions, _ := oldMetaRaw["dimensions"].(string)
	oldColorMode, _ := oldMetaRaw["color_mode"].(string)

	// Compare old vs current metadata and build change summary
	var changes []string
	if oldLayers != float64(currentFileInfo.Layers) && currentFileInfo.Layers != 0 {
		changes = append(changes, fmt.Sprintf("Layers: %.0f→%d", oldLayers, currentFileInfo.Layers))
	}
	if oldArtboards != float64(currentFileInfo.Artboards) && currentFileInfo.Artboards != 0 {
		changes = append(changes, fmt.Sprintf("Artboards: %.0f→%d", oldArtboards, currentFileInfo.Artboards))
	}
	if oldDimensions != currentFileInfo.Dimensions && currentFileInfo.Dimensions != "Unknown" {
		changes = append(changes, fmt.Sprintf("Dimensions: %s→%s", oldDimensions, currentFileInfo.Dimensions))
	}
	if oldColorMode != currentFileInfo.ColorMode && currentFileInfo.ColorMode != "Unknown" {
		changes = append(changes, fmt.Sprintf("ColorMode: %s→%s", oldColorMode, currentFileInfo.ColorMode))
	}
	
	// Return formatted change summary if any changes detected
	if len(changes) > 0 {
		return " (" + strings.Join(changes, ", ") + ")"
	}
	return ""
}

// getStatusFileType returns file type string for status display
// Used to show file types in status output for better visual distinction
func getStatusFileType(filePath string) string {
	ext := strings.ToLower(filepath.Ext(filePath))
	switch ext {
	case ".ai":
		return "AI"
	case ".psd":
		return "PSD"
	case ".sketch":
		return "SKETCH"
	case ".fig":
		return "FIG"
	case ".xd":
		return "XD"
	default:
		return "FILE"
	}
}

// printStatusStagingStatus displays the files currently staged for commit
// Shows file type and name for each staged file
func printStatusStagingStatus(stagingArea *staging.StagingArea) {
	for _, file := range stagingArea.GetStagedFiles() {
		fileType := getStatusFileType(file.Path)
		fmt.Printf("  [%s] new file: %s\n", fileType, file.Path)
	}
}