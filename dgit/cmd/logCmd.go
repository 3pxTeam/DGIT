package cmd

import (
	"fmt"
	"os"

	"dgit/internal/log"
	
	"github.com/spf13/cobra"
)

// LogCmd represents the log command for displaying commit history
// Similar to 'git log' but with design-specific metadata display
var LogCmd = &cobra.Command{
	Use:   "log",
	Short: "Show commit history",
	Long: `Display the commit history showing:
- Commit hashes and messages
- Author and timestamp information
- File counts and metadata summaries

Examples:
  dgit log                    # Show all commits
  dgit log --oneline          # Show compact format
  dgit log -n 5               # Show last 5 commits`,
	Run: runLog,
}

// init sets up command flags for log command
func init() {
	// Add flags for different log display options
	LogCmd.Flags().BoolP("oneline", "o", false, "Show commits in compact one-line format")
	LogCmd.Flags().IntP("number", "n", 0, "Limit the number of commits to show")
}

// runLog executes the log command functionality
// Displays commit history with design-specific information
func runLog(cmd *cobra.Command, args []string) {
	// Ensure we're in a DGit repository
	dgitDir := checkDgitRepository()
	logManager := log.NewLogManager(dgitDir)
	
	// Load commit history from repository
	commits, err := logManager.GetCommitHistory()
	if err != nil {
		printError(fmt.Sprintf("loading commit history: %v", err))
		os.Exit(1)
	}

	// Handle case where no commits exist yet
	if len(commits) == 0 {
		fmt.Println("No commits yet.")
		printInfo("Use 'dgit add' and 'dgit commit' to create your first commit.")
		return
	}

	// Parse command line flags
	oneline, _ := cmd.Flags().GetBool("oneline")
	number, _ := cmd.Flags().GetInt("number")

	// Limit number of commits to display if specified
	if number > 0 && number < len(commits) {
		commits = commits[:number]
	}

	// Display header
	fmt.Printf("Commit History (%d commits)\n\n", len(commits))

	// Display each commit with appropriate formatting
	for i, c := range commits {
		if oneline {
			// Compact one-line format
			fmt.Printf("%s (v%d) %s\n", c.Hash[:8], c.Version, c.Message)
		} else {
			// Full detailed format
			fmt.Printf("commit %s (v%d)\n", c.Hash[:12], c.Version)
			fmt.Printf("Author: %s\n", c.Author)
			fmt.Printf("Date: %s\n", c.Timestamp.Format("Mon Jan 2 15:04:05 2006"))
			fmt.Printf("\n    %s\n", c.Message)
			
			// Show design file information if available
			if c.FilesCount > 0 {
				fmt.Printf("    Files: %d", c.FilesCount)
				if c.SnapshotZip != "" {
					fmt.Printf(" (snapshot: %s)", c.SnapshotZip)
				}
				fmt.Println()

				// Generate and display metadata insights
				summary := logManager.GenerateCommitSummary(c)
				if summary != fmt.Sprintf("[v%d] %s (%d files)", c.Version, c.Message, c.FilesCount) {
					fmt.Printf("    %s\n", summary)
				}
			}
			
			// Add separator between commits (except for last one)
			if i < len(commits)-1 {
				fmt.Println()
			}
		}
	}

	// Display summary
	fmt.Printf("\nTotal: %d commits in history\n", len(commits))
}