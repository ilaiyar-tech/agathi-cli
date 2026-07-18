# Installation & Upgrade Guide

This guide walks you through the initial installation, setup, and upgrading of **tu2pu**.

---

## 1. Installation Guide

### Option A: Installation from Source (Recommended for Developers)
1. Clone the repository:
   ```bash
   git clone https://github.com/ilaiyar/thudupu-ai.git
   cd thudupu-ai
   ```
2. Install project dependencies:
   ```bash
   npm install
   ```
3. Compile all TypeScript packages and applications:
   ```bash
   npm run build
   ```
4. Link the command globally:
   ```bash
   npm link
   ```

### Option B: Local Verification
Check that the commands are correctly installed and mapped:
```bash
tu2pu --help
thu2pu version
agathi version
```

---

## 2. Upgrade Guide

### Upgrading from Legacy Alpha/Beta Versions
If you are transitioning from older Agathi / Thuduppu versions:
1. Remove old global links to avoid binaries conflicts:
   ```bash
   npm uninstall -g agathi-cli thudupu-cli 2>/dev/null
   ```
2. Pull the latest release branch of the new rebranding repository:
   ```bash
   git pull origin main
   ```
3. Re-install, rebuild, and re-link:
   ```bash
   npm install
   ```
4. Running legacy commands:
   - Calling `agathi` will print a warning: `⚠️ WARNING: 'agathi' is deprecated. Please use 'tu2pu' instead.`
   - Execution is automatically forwarded to the new `tu2pu` executable.
