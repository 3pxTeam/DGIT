package cmd

import (
	"fmt"
	"os"
	"strings"
	
	"dgit/internal/staging"
	"github.com/spf13/cobra"
)

// AddCmd represents the add command for staging design files
// This command is similar to 'git add' but specifically handles design file types
var AddCmd = &cobra.Command{
	Use:   "add [files...]",
	Short: "Add design files to the staging area",
	Long: `Add design files to the staging area for the next commit.

Examples:
  dgit add logo.ai                # Add specific file
  dgit add .                      # Add all design files in current directory
  dgit add *.psd                  # Add all PSD files
  dgit add designs/ icons/        # Add multiple directories

Supported file types: .ai, .psd, .sketch, .fig, .xd, .afdesign, .afphoto`,
	Args: cobra.MinimumNArgs(1),  // Require at least one file/pattern argument
	Run:  runAdd,
}

// runAdd executes the add command functionality
// It stages files for commit by adding them to the staging area
func runAdd(cmd *cobra.Command, args []string) {
	// Ensure we're working within a DGit repository
	if !isInDgitRepository() {
		printError("not a dgit repository (or any of the parent directories)")
		printSuggestion("Run 'dgit init' to initialize a repository")
		os.Exit(1)
	}

	// Get the .dgit directory path
	dgitDir := findDgitDirectory()
	stagingArea := staging.NewStagingArea(dgitDir)
	
	// Load existing staging area state from disk
	if err := stagingArea.LoadStaging(); err != nil {
		printError(fmt.Sprintf("loading staging area: %v", err))
		os.Exit(1)
	}

	// Track results across all add operations
	var allAddedFiles []string
	var allFailedFiles = make(map[string]error)

	// Process each file pattern or path argument
	for _, arg := range args {
		// Add files matching the pattern/path
		result, err := stagingArea.AddPattern(arg)
		if err != nil {
			printError(fmt.Sprintf("adding '%s': %v", arg, err))
			continue
		}

		// Collect successfully added files
		allAddedFiles = append(allAddedFiles, result.AddedFiles...)
		
		// Display warnings for files that failed to add
		for file, fileErr := range result.FailedFiles {
			printWarning(fmt.Sprintf("failed to add %s: %v", file, fileErr))
			allFailedFiles[file] = fileErr
		}
	}

	// Persist staging area changes to disk
	if err := stagingArea.SaveStaging(); err != nil {
		printError(fmt.Sprintf("saving staging area: %v", err))
		os.Exit(1)
	}

	// Display results to user
	if len(allAddedFiles) > 0 {
		printSuccess(fmt.Sprintf("Added %d file(s) to staging area:", len(allAddedFiles)))
		for _, file := range allAddedFiles {
			fmt.Printf("  + %s\n", file)
		}
		fmt.Println()
		// Show current staging area status
		printStagingStatus(stagingArea)
	} else {
		fmt.Println("No files were added to staging area.")
	}
}

// printStagingStatus displays the current state of the staging area
// Shows which files are staged for commit with their metadata
func printStagingStatus(stagingArea *staging.StagingArea) {
	stagedFiles := stagingArea.GetStagedFiles()
	if len(stagedFiles) == 0 {
		fmt.Println("No files staged for commit.")
		return
	}

	fmt.Printf("Files staged for commit (%d):\n", len(stagedFiles))
	for _, file := range stagedFiles {
		// Display file with type and size information
		fmt.Printf("  %s (%s, %.2f KB)\n", 
			file.Path, 
			strings.ToUpper(file.FileType), 
			float64(file.Size)/1024)  // Convert bytes to KB
	}
}