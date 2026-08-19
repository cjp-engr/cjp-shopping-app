# cjp-skills: Skills in a Separate Private Repo — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move `.agents/skills/` out of this repo into a private GitHub repo (`cjp-engr/cjp-skills`) cloned at `D:\Files\aiSkills`, and wire this project to that location via junctions.

**Architecture:** Push the existing skills folder to a new private GitHub repo, clone it to a stable local path, then write a setup script that re-creates the `.claude\skills\` and `.agents\skills\` junctions pointing at that path. Remove the now-external skills folder from this repo's git history.

**Tech Stack:** PowerShell 5.1, Git, Windows directory junctions (`New-Item -ItemType Junction`)

## Global Constraints

- Private GitHub repo name: `cjp-engr/cjp-skills`
- Skills clone path: `D:\Files\aiSkills` (no trailing slash)
- Junction targets always point to `D:\Files\aiSkills` (never a subdirectory)
- Setup script must print a clear, actionable error if `D:\Files\aiSkills` does not exist
- Never use `mklink` (requires admin); use `New-Item -ItemType Junction` throughout

---

### Task 1: Push current skills to `cjp-skills`

> ⚠️ **Manual prerequisite — do this before running any steps:**
> Go to https://github.com/new, create a **private** repo named `cjp-skills` under the `cjp-engr` account. Do not add a README, .gitignore, or license — leave it completely empty.

**Files:**
- No project files change — this task operates entirely inside `.agents\skills\`

**Interfaces:**
- Produces: `https://github.com/cjp-engr/cjp-skills` with all skill folders at root on `main` branch

- [ ] **Step 1: Open PowerShell in the skills directory**

```powershell
cd "D:\Files\Automation\shopping-app-automation\.agents\skills"
```

- [ ] **Step 2: Initialize a git repo inside the skills folder**

```powershell
git init
git checkout -b main
```

Expected output: `Initialized empty Git repository in …/.agents/skills/.git/`

- [ ] **Step 3: Stage all skills and create the initial commit**

```powershell
git add .
git commit -m "initial: skills moved from shopping-app-automation"
```

Expected: commit hash printed, summary shows all skill folders staged.

- [ ] **Step 4: Add the remote and push**

```powershell
git remote add origin https://github.com/cjp-engr/cjp-skills.git
git push -u origin main
```

Expected: `Branch 'main' set up to track remote branch 'main' from 'origin'`

- [ ] **Step 5: Verify on GitHub**

Open `https://github.com/cjp-engr/cjp-skills` in a browser and confirm all skill folders (`create-scenarios`, `tokomart-domain`, `flutter-dev`, etc.) are visible on the `main` branch.

---

### Task 2: Write `scripts\setup-skills-links.ps1`

**Files:**
- Create: `scripts\setup-skills-links.ps1`

**Interfaces:**
- Consumes: nothing (standalone script)
- Produces: junctions at `.claude\skills\` and `.agents\skills\` → `D:\Files\aiSkills`

- [ ] **Step 1: Create the `scripts\` directory and write the script**

Create `scripts\setup-skills-links.ps1` with this exact content:

```powershell
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
    Write-Host "✓ $path  →  $target"
}

Write-Host ""
Write-Host "Done. All skill junctions created."
```

- [ ] **Step 2: Verify the script has no syntax errors**

```powershell
powershell -NonInteractive -Command "& { . '.\scripts\setup-skills-links.ps1' }" 2>&1
```

Since `D:\Files\aiSkills` does not exist yet, expect:
```
ERROR: Skills repo not found at D:\Files\aiSkills.
Clone it first: git clone https://github.com/cjp-engr/cjp-skills.git "D:\Files\aiSkills"
```
This error is correct — the guard works. Proceed to Task 3.

- [ ] **Step 3: Commit the script**

```powershell
cd "D:\Files\Automation\shopping-app-automation"
git add scripts\setup-skills-links.ps1
git commit -m "feat: add setup-skills-links.ps1 for cjp-skills junction wiring"
```

---

### Task 3: Clone `cjp-skills`, rewire this project, and clean up

> ⚠️ **Manual step — do this before Step 1:**
> Open PowerShell anywhere and run:
> ```powershell
> git clone https://github.com/cjp-engr/cjp-skills.git "D:\Files\aiSkills"
> ```
> Confirm `D:\Files\aiSkills\create-scenarios\` exists before continuing.

**Files:**
- Delete: `.agents\skills\` (physical contents removed from git; replaced by junction)
- Modify: `.gitignore` (add entries for the two junctions)
- Modify: `README.md` (add skills location note)

**Interfaces:**
- Consumes: `scripts\setup-skills-links.ps1` from Task 2, `D:\Files\aiSkills` from manual clone

- [ ] **Step 1: Remove `.agents\skills\` contents from git tracking**

```powershell
cd "D:\Files\Automation\shopping-app-automation"
git rm -r --cached .agents/skills/
git rm -r .agents/skills/
```

`git rm -r` removes the files from the index and from disk. The `.git\` folder inside `.agents\skills\` (created in Task 1) is not tracked by this repo — git will skip it automatically.

Expected: long list of `rm '.agents/skills/...'` lines, then the directory is gone.

- [ ] **Step 2: Add junction paths to `.gitignore`**

Open `.gitignore` (create it at the repo root if it doesn't exist) and append:

```
# Skill junctions — real files live in cjp-skills repo at D:\Files\aiSkills
.agents/skills/
.claude/skills/
.cursor/skills/
```

- [ ] **Step 3: Run `setup-skills-links.ps1` to create junctions**

```powershell
.\scripts\setup-skills-links.ps1
```

Expected output:
```
✓ …\.claude\skills  →  D:\Files\aiSkills
✓ …\.agents\skills  →  D:\Files\aiSkills
✓ …\.cursor\skills  →  D:\Files\aiSkills

Done. All skill junctions created.
```

- [ ] **Step 4: Verify junctions are working**

```powershell
# Should list skill folders (create-scenarios, flutter-dev, etc.)
Get-ChildItem ".claude\skills\"

# Should resolve to D:\Files\aiSkills
(Get-Item ".agents\skills\").Target
```

Expected: skill folders visible; target resolves to `D:\Files\aiSkills`.

- [ ] **Step 5: Add a skills note to `README.md`**

Find the `## Getting Started` section in `README.md` and add a new subsection directly above it:

```markdown
## Agent Skills

Skills (slash commands for Claude Code, Cursor, and Codex) live in a **separate private repo**:

| Property | Value |
|----------|-------|
| Repo | [`cjp-engr/cjp-skills`](https://github.com/cjp-engr/cjp-skills) (private) |
| Clone path | `D:\Files\aiSkills` |

**First-time setup** (after cloning this project):
1. Clone the skills repo: `git clone https://github.com/cjp-engr/cjp-skills.git "D:\Files\aiSkills"`
2. Run `.\scripts\setup-skills-links.ps1` to wire the junctions

**Keeping skills up to date:**
```powershell
cd D:\Files\aiSkills
git pull
```

```

- [ ] **Step 6: Commit everything**

```powershell
git add .gitignore README.md
git status   # confirm only .gitignore and README.md are staged (no skill files)
git commit -m "feat: move skills to cjp-skills repo, wire via setup-skills-links.ps1"
```

- [ ] **Step 7: Smoke-test skill discovery**

In a new Claude Code session in this project, type `/create-scenarios` and confirm it loads without error. This proves the junction is resolving correctly.

---

## Verification Checklist

After all three tasks:

- [ ] `https://github.com/cjp-engr/cjp-skills` exists and is private
- [ ] `D:\Files\aiSkills\create-scenarios\SKILL.md` is readable
- [ ] `(Get-Item ".claude\skills\").Target` returns `D:\Files\aiSkills`
- [ ] `(Get-Item ".agents\skills\").Target` returns `D:\Files\aiSkills`
- [ ] `.agents\skills\` is in `.gitignore` and not tracked by git
- [ ] `/create-scenarios` slash command loads in Claude Code
- [ ] `README.md` has the skills setup instructions
