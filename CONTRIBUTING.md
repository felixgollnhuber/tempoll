# Contributing to tempoll

Thanks for your interest in improving tempoll.

## Current contribution model

At this stage, tempoll is **issues-first**:

- Bug reports and reproducible issue reports are welcome.
- Feature requests are welcome as issues.
- External pull requests are currently not actively onboarded.

This helps keep maintenance stable while the project is newly public.

## Before opening an issue

- Check existing issues first.
- Use a clear title and expected vs. actual behavior.
- Include exact steps to reproduce.
- Include your runtime details (OS, browser, Node version, Docker/Coolify context if relevant).
- Include logs or screenshots where helpful.

## Security issues

Do **not** open public issues for vulnerabilities.

Please report security findings through the private security reporting flow described in [SECURITY.md](./SECURITY.md).

## Local verification for maintainers

When preparing substantial changes, the expected baseline is:

```bash
pnpm verify
```

For deployment-sensitive changes:

```bash
pnpm verify:ci
```

## License

By participating, you agree that contributions are provided under the repository license (`AGPL-3.0-only`).
