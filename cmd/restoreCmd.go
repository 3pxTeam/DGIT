package cmd

import (
	"fmt"
	"os"
	"strconv"
	"strings"

	"dgit/internal/log"
	"dgit/internal/restore"
	
	"github.com/spf13/cobra"
)

// RestoreCmd represents the restore command for retrieving files from previous commits
// Similar to 'git checkout' but specifically designed for design file restoration
var RestoreCmd = &cobra.Command{
	Use:   "restore <version_or_hash> [file...]",
	Short: "Restore files from a specific commit",
	Long: `Restore files from a specific commit version or hash to the working directory.
If no files are specified, all files from that commit's snapshot will be restored.

Examples:
  dgit restore 1                  # Restore all files from version 1
  dgit restore c3a5f7b8           # Restore all files from commit with short hash c3a5f7b8
  dgit restore 2 my_design.psd    # Restore 'my_design.psd' from version 2
  dgit restore 2 designs/         # Restore all files in 'designs/' from version 2

Smart file matching:
- Exact path matching
- Filename-only matching  
- Directory matching
- Partial path matching`,
	Args: func(cmd *cobra.Command, args []string) error {
		if len(args) < 1 {
			return fmt.Errorf("requires at least one argument: <version_or_hash>")
		}
		return nil
	},
	Run: runRestore,
}

// runRestore executes the restore command functionality
// Restores files from a specific commit to the working directory
func runRestore(cmd *cobra.Command, args []string) {
	// Ensure we're in a DGit repository
	dgitDir := checkDgitRepository()
	
	// Initialize managers for restore and log operations
	restoreManager := restore.NewRestoreManager(dgitDir)
	logManager := log.NewLogManager(dgitDir)

	commitRef := args[0]           // First argument is version or hash
	filesToRestore := []string{}   // Specific files to restore (optional)

	// Extract specific files to restore if provided
	if len(args) > 1 {
		filesToRestore = args[1:] // Remaining arguments are files to restore
	}

	// Find the target commit by version number or hash
	targetCommit, err := findTargetCommit(logManager, commitRef)
	if err != nil {
		printError(fmt.Sprintf("Failed to find commit: %v", err))
		os.Exit(1)
	}

	// Display information about what will be restored
	if len(filesToRestore) == 0 {
		// Restoring all files from the commit
		fmt.Printf("Restoring all files from commit %s (v%d)\n", targetCommit.Hash[:8], targetCommit.Version)
		fmt.Printf("\"%s\"\n", targetCommit.Message)
		fmt.Printf("Files: %d\n\n", targetCommit.FilesCount)
	} else {
		// Restoring specific files
		fmt.Printf("Restoring %d specific files from commit %s (v%d)\n", len(filesToRestore), targetCommit.Hash[:8], targetCommit.Version)
		fmt.Printf("\"%s\"\n", targetCommit.Message)
		fmt.Printf("Target files: %v\n\n", filesToRestore)
	}

	// Perform the actual file restoration
	err = performRestore(restoreManager, targetCommit, filesToRestore)
	if err != nil {
		printError(fmt.Sprintf("Restore failed: %v", err))
		os.Exit(1)
	}
}

// findTargetCommit finds a commit by hash or version number
// Supports both full/partial hashes and version numbers (with or without 'v' prefix)
func findTargetCommit(logManager *log.LogManager, commitRef string) (*log.Commit, error) {
	var targetCommit *log.Commit
	var err error
	
	// Try to find by hash first (if it looks like a hash)
	isHashCandidate := false
	if len(commitRef) >= 4 && len(commitRef) <= 64 {
		isHashCandidate = true
		// Check if all characters are valid hex digits
		for _, r := range commitRef {
			if !((r >= '0' && r <= '9') || (r >= 'a' && r <= 'f') || (r >= 'A' && r <= 'F')) {
				isHashCandidate = false
				break
			}
		}
	}

	// If it looks like a hash, try hash lookup first
	if isHashCandidate {
		targetCommit, err = logManager.GetCommitByHash(commitRef)
		if err == nil && targetCommit != nil {
			return targetCommit, nil
		}
	}

	// Try to find by version number (strip 'v' prefix if present)
	strippedCommitRef := strings.TrimPrefix(commitRef, "v")
	version, err := strconv.Atoi(strippedCommitRef)
	if err == nil {
		targetCommit, err = logManager.GetCommit(version)
		if err == nil && targetCommit != nil {
			return targetCommit, nil
		}
	}
	
	return nil, fmt.Errorf("commit '%s' not found", commitRef)
}

// performRestore performs the actual file restoration using the restore manager
// Delegates to the restore manager for detailed file matching and restoration logic
func performRestore(restoreManager *restore.RestoreManager, targetCommit *log.Commit, filesToRestore []string) error {
	// Create a commit reference string for the restore manager
	// Using version format since that's what the restore manager expects
	commitRef := fmt.Sprintf("v%d", targetCommit.Version)
	
	// The restore manager handles the detailed file matching and restoration
	// including smart matching for partial paths, filenames, and directories
	err := restoreManager.RestoreFilesFromCommit(commitRef, filesToRestore, targetCommit)
	
	return err
}