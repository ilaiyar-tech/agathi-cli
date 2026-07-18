# Contributing to tu2pu

First off, thank you for considering contributing to tu2pu! It's people like you who make open-source software a better place.

---

## Code of Conduct

By participating in this project, you agree to abide by our [Code of Conduct](CODE_OF_CONDUCT.md). Please report any unacceptable behavior to security@tu2pu.in.

---

## How Can I Contribute?

### Reporting Bugs
- Always search the issue tracker first to see if the bug has already been reported.
- If you can't find an existing issue, create a new one using the **Bug Report** template.
- Please include steps to reproduce, expected behavior, actual behavior, and relevant logs.

### Suggesting Enhancements
- Enhance requests are tracked as GitHub issues.
- Create a new issue using the **Feature Request** template.
- Explain the problem, describe the solution you have in mind, and outline alternatives considered.

### Submitting Pull Requests
1. Fork the repository and create your branch from `main`.
2. Install dependencies with `npm install` (or `pnpm install` if using pnpm workspace).
3. If you've added code that should be tested, add tests.
4. Ensure the test suite passes (`npm test`).
5. Ensure linting, typechecking, and architecture checks pass.
6. Commit your changes using descriptive commit messages.
7. Open a Pull Request referencing the issue you are fixing.

---

## Coding Standards

- We use TypeScript for all backend, CLI, and frontend logic.
- Follow the guidelines in [docs/ENGINEERING_RULES.md](docs/ENGINEERING_RULES.md).
- Keep functions small, document public APIs, and write tests for new capabilities.
- Maintain architecture boundaries: packages must never import directly from host apps (CLI/Server).
