# setup-skills-links.ps1
# Creates junctions for Claude Code, Codex/npx-skills, and Cursor
# pointing at the shared cjp-skills repo cloned at D:\Files\aiSkills.
#
# Run once after cloning this project (and after cloning cjp-skills).
# Usage: .\scripts\setup-skills-links.ps1

$skillsSource = "D:\Files\aiSkills"

# Validate the skills repo is cloned
if (-not (Test-Path $skillsSource)) {
    Write-Error @"
Skills repo not found at $skillsSource.

Clone it first:
  git clone https://github.com/cjp-engr/cjp-skills.git "$skillsSource"

Then re-run this script.
"@
    exit 1
}

$projectRoot = $PSScriptRoot | Split-Path -Parent

$junctions = @(
    @{ Path = Join-Path $projectRoot ".claude\skills";  Target = $skillsSource },
    @{ Path = Join-Path $projectRoot ".agents\skills";  Target = $skillsSource },
    @{ Path = Join-Path $projectRoot ".cursor\skills";  Target = $skillsSource }
)

foreach ($j in $junctions) {
    $path   = $j.Path
    $target = $j.Target

    # Remove existing symlink, junction, or directory at this path
    if (Test-Path $path) {
        $item = Get-Item $path -Force
        if ($item.Attributes -band [System.IO.FileAttributes]::ReparsePoint) {
            # It's a symlink or junction — safe to remove with rmdir
            cmd /c "rmdir `"$path`"" | Out-Null
        } else {
            # It's a real directory — refuse to delete automatically
            Write-Error "Found a real directory at '$path'. Remove it manually before running this script."
            exit 1
        }
    }

    # Create the parent directory if needed (.claude\ or .agents\ may not exist)
    $parent = Split-Path $path -Parent
    if (-not (Test-Path $parent)) {
        New-Item -ItemType Directory -Path $parent -Force | Out-Null
    }

    New-Item -ItemType Junction -Path $path -Target $target | Out-Null
    Write-Host "[OK] $path -> $target"
}

Write-Host ""
Write-Host "Done. All skill junctions created."
