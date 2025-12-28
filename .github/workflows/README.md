# CI/CD Workflows

This directory contains GitHub Actions workflows for the Pharmacy Management System monorepo.

## Workflows

### Backend CI/CD (`backend.yml`)
- **Triggers:** Changes to `backend/` directory
- **Jobs:**
  - **Test & Lint:** Runs linter, generates Prisma client, runs migrations, and executes tests
  - **Build:** Compiles TypeScript and creates build artifacts
- **Services:** PostgreSQL 16 and Redis 7

### Frontend CI/CD (`frontend.yml`)
- **Triggers:** Changes to `frontend/` directory
- **Jobs:**
  - **Test & Lint:** Runs linter and tests
  - **Build:** Builds the React application
- **Note:** Currently configured with fallbacks for when tests/linter aren't set up yet

### Mobile CI/CD (`mobile.yml`)
- **Triggers:** Changes to `mobile/` directory
- **Jobs:**
  - **Lint:** Runs ESLint
  - **Type Check:** Validates TypeScript types
  - **Build Check:** Validates EAS build configuration
- **Note:** Requires `EXPO_TOKEN` secret for EAS builds

### Full CI (`full-ci.yml`)
- **Triggers:** All pushes and pull requests to main/develop
- **Runs:** All three workflows (backend, frontend, mobile) in parallel

## Required Secrets

Add these secrets in GitHub repository settings (Settings → Secrets and variables → Actions):

- `EXPO_TOKEN` (optional): Expo access token for mobile builds

## Path-based Triggers

Workflows only run when relevant files change:
- Backend workflow: Only runs on `backend/**` changes
- Frontend workflow: Only runs on `frontend/**` changes
- Mobile workflow: Only runs on `mobile/**` changes

This prevents unnecessary CI runs and saves build minutes.

## Local Testing

To test workflows locally, use [act](https://github.com/nektos/act):

```bash
# Test backend workflow
act -W .github/workflows/backend.yml

# Test specific job
act -j test -W .github/workflows/backend.yml
```

