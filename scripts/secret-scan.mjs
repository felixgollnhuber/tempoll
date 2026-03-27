import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";

const allowedTrackedEnvFiles = new Set([".env.example", ".env.coolify.example"]);
const ignoredFiles = new Set([
  "pnpm-lock.yaml",
]);

const highConfidencePatterns = [
  {
    name: "Private key",
    pattern: /-----BEGIN (?:RSA|OPENSSH|EC|DSA|PGP) PRIVATE KEY-----/g,
  },
  {
    name: "GitHub personal access token",
    pattern: /\b(?:ghp_[A-Za-z0-9]{36,}|github_pat_[A-Za-z0-9_]{20,})\b/g,
  },
  {
    name: "OpenAI-style secret",
    pattern: /\bsk-[A-Za-z0-9]{20,}\b/g,
  },
  {
    name: "AWS access key",
    pattern: /\bAKIA[0-9A-Z]{16}\b/g,
  },
  {
    name: "Google API key",
    pattern: /\bAIza[0-9A-Za-z\-_]{35}\b/g,
  },
  {
    name: "Slack token",
    pattern: /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/g,
  },
];

const databaseUrlPattern =
  /\bpostgres(?:ql)?:\/\/([^:\s]+):([^@\s]+)@([^/\s?#]+)(?:\/[^\s"'`]+)?/gi;

function listTrackedFiles() {
  const output = execFileSync("git", ["ls-files", "-z"], {
    encoding: "utf8",
  });

  return output.split("\0").filter(Boolean);
}

function shouldSkipBinary(buffer) {
  return buffer.includes(0);
}

function isAllowedLocalDatabaseUrl(match, host, password) {
  const lowerHost = host.toLowerCase();
  const allowedHosts = new Set([
    "localhost",
    "127.0.0.1",
    "db",
    "tempoll.example.com",
    "meet.example.com",
    "example.com",
  ]);

  const allowedPasswords = new Set([
    "postgres",
    "local-dev-password",
    "${service_password_tempoll_db:?set",
  ]);

  if (allowedHosts.has(lowerHost)) {
    return true;
  }

  return allowedPasswords.has(password.toLowerCase()) || match.includes("example");
}

const findings = [];

for (const filePath of listTrackedFiles()) {
  if (ignoredFiles.has(filePath)) {
    continue;
  }

  if (!existsSync(filePath)) {
    continue;
  }

  if (filePath.startsWith(".env") && !allowedTrackedEnvFiles.has(filePath)) {
    findings.push({
      filePath,
      reason: "Tracked environment file is not allowlisted.",
    });
    continue;
  }

  const buffer = readFileSync(filePath);
  if (shouldSkipBinary(buffer)) {
    continue;
  }

  const content = buffer.toString("utf8");

  for (const { name, pattern } of highConfidencePatterns) {
    pattern.lastIndex = 0;
    if (pattern.test(content)) {
      findings.push({
        filePath,
        reason: name,
      });
    }
  }

  let databaseUrlMatch;
  while ((databaseUrlMatch = databaseUrlPattern.exec(content))) {
    const [match, , password, host] = databaseUrlMatch;
    if (isAllowedLocalDatabaseUrl(match, host, password)) {
      continue;
    }

    findings.push({
      filePath,
      reason: "Potential non-local database URL with embedded credentials.",
    });
  }
}

if (findings.length > 0) {
  for (const finding of findings) {
    console.error(`Secret scan finding in ${finding.filePath}: ${finding.reason}`);
  }

  process.exit(1);
}

console.log("Secret scan passed.");
