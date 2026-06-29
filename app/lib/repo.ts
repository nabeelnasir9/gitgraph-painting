export const GITHUB_REPO_RE = /^https:\/\/github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+\/?$/;

export function parseRepo(repoUrl: string) {
  const normalized = repoUrl.replace(/\/$/, "");
  const [, owner = "owner", repo = "repo"] = normalized.match(/github\.com\/([^/]+)\/([^/]+)$/) ?? [];
  return { owner, repo };
}
