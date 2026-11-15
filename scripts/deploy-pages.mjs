import { cpSync, existsSync, mkdtempSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync, spawnSync } from "node:child_process";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dist = path.join(root, "dist");
if (!existsSync(path.join(dist, "index.html"))) {
  throw new Error("The production site was not found in dist. Run the production build first.");
}

const worktree = mkdtempSync(path.join(tmpdir(), "acharya-pasal-pages-"));
let worktreeAdded = false;

try {
  execFileSync(
    "git",
    ["fetch", "origin", "gh-pages:refs/remotes/origin/gh-pages"],
    { cwd: root, stdio: "inherit" },
  );
  execFileSync("git", ["worktree", "add", "--detach", worktree, "origin/gh-pages"], {
    cwd: root,
    stdio: "inherit",
  });
  worktreeAdded = true;

  for (const entry of readdirSync(dist, { withFileTypes: true })) {
    cpSync(path.join(dist, entry.name), path.join(worktree, entry.name), {
      recursive: true,
      force: true,
    });
  }

  execFileSync("git", ["-C", worktree, "add", "--all"], { stdio: "inherit" });
  const diff = spawnSync("git", ["-C", worktree, "diff", "--cached", "--quiet"], {
    stdio: "inherit",
  });
  if (diff.error) throw diff.error;
  if (diff.status === 1) {
    execFileSync(
      "git",
      [
        "-C",
        worktree,
        "commit",
        "-m",
        "Deploy website to GitHub Pages",
        "-m",
        "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>",
      ],
      { stdio: "inherit" },
    );
    execFileSync("git", ["-C", worktree, "push", "origin", "HEAD:gh-pages"], {
      stdio: "inherit",
    });
  } else if (diff.status !== 0) {
    throw new Error(`Could not check the staged deployment files (git exited ${diff.status}).`);
  } else {
    console.log("GitHub Pages is already up to date.");
  }
} finally {
  if (worktreeAdded) {
    execFileSync("git", ["worktree", "remove", "--force", worktree], {
      cwd: root,
      stdio: "inherit",
    });
  } else {
    rmSync(worktree, { recursive: true, force: true });
  }
}
