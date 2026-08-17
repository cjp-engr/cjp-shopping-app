# cjp-skills: Skills in a Separate Private Repo

**Goal:** Move project skills out of the shopping-app repo into a standalone private GitHub repo (`cjp-skills`) cloned at `D:\Files\aiSkills`, so skills are managed independently and reusable across multiple projects via junctions.

**Architecture:** Skills live in one private repo. Each project's setup script creates OS-level junctions pointing `.claude\skills\`, `.agents\skills\`, and `.cursor\skills\` at `D:\Files\aiSkills`. A `git pull` in the skills repo propagates changes to every project instantly.

---

## Skills Repo

| Property | Value |
|----------|-------|
| GitHub repo | `cjp-engr/cjp-skills` (private) |
| Local clone path | `D:\Files\aiSkills` |
| Remote URL | `https://github.com/cjp-engr/cjp-skills` |

### Content

The repo contains the current `.agents/skills/` contents moved to the root:

```
D:\Files\aiSkills\
├── README.md
├── create-scenarios\
├── generate-tests\
├── playwright-best-practices\
├── review-tests\
├── test-strategy\
├── tokomart-domain\
├── patrol-test-architecture\
├── patrol-write-test\
├── flutter-dev\
├── flutter-dart-code-review\
├── frontend-code-review\
├── frontend-patterns\
├── backend-patterns\
└── ui-ux-pro-max\
```

---

## Per-Project Wiring

Each project that uses these skills runs `scripts\setup-skills-links.ps1` once after cloning. The script creates three junctions:

| Junction (in project) | Target |
|-----------------------|--------|
| `.claude\skills\` | `D:\Files\aiSkills` |
| `.agents\skills\` | `D:\Files\aiSkills` |
| `.cursor\skills\` | `D:\Files\aiSkills` |

The script must validate that `D:\Files\aiSkills` exists before creating junctions and print a clear error if the skills repo has not been cloned yet.

---

## Keeping Skills Up to Date

```powershell
cd D:\Files\aiSkills
git pull
```

No per-project action needed — junctions mean the update is immediately visible in all projects.

---

## Migration Steps (this project)

1. Create the private GitHub repo `cjp-engr/cjp-skills`
2. Push current `.agents/skills/` contents as the initial commit
3. Clone `cjp-skills` to `D:\Files\aiSkills`
4. Update `scripts\setup-skills-links.ps1` to target `D:\Files\aiSkills`
5. Re-run the setup script to recreate junctions
6. Remove the physical `.agents/skills/` folder from this repo
7. Add a note in this repo's `README.md` explaining that skills live in `cjp-skills`

---

## New Project Onboarding

For any future project:

1. Clone the project repo
2. Clone `cjp-skills` to `D:\Files\aiSkills` (if not already present)
3. Run `scripts\setup-skills-links.ps1`

---

## Constraints

- `cjp-skills` repo must stay **private** — skills contain project-specific domain knowledge
- The local clone path `D:\Files\aiSkills` is the agreed stable location; changing it requires updating every project's setup script
- Skills are always fully shared across all projects (no per-project filtering)
