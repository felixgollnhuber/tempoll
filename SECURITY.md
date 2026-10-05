# Security Policy

## Supported versions

tempoll is currently pre-1.0. Security fixes are applied to the current `main` branch.

## Reporting a vulnerability

Please use **GitHub Private Vulnerability Reporting / Security Advisories** for this repository.

- Do not disclose vulnerabilities in public issues or pull requests.
- Include clear reproduction steps, impact, and affected versions/commits.
- Include suggested mitigations if available.

## Response targets

- Initial acknowledgment target: within 72 hours.
- Triage and severity classification target: within 7 days.
- Fix and release timeline depends on impact and complexity.

We will coordinate disclosure timing with the reporter whenever possible.

## Local dependency mitigations

`braces@3.0.3`, used by the Next.js ESLint tooling, has no upstream release fixing
[CVE-2026-93687](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm). The committed pnpm
patch bounds brace and parenthesis parsing to 100 nested groups and validates AST
depth before compilation, expansion, and stringification. Direct and cyclic AST
inputs are checked without recursion.

Frozen installs apply `patches/braces@3.0.3.patch`, including Docker builds. The
security workflow runs `scripts/braces-patch.test.mjs` against the dependency
actually loaded by ESLint before auditing all production and development packages.

Registry audits identify the original version number, so `pnpm-workspace.yaml`
excludes only this locally mitigated CVE. This exception does not cover other
advisories. Remove the patch and exception together once an upstream fixed version
can replace it, retaining the regression tests.
