# AGENTS.md

## Overview
Cedears Manager is a desktop application for managing a portfolio of CEDEARs with ESG/vegan criteria. The project uses React and Electron for the frontend and a Node.js backend.

## Setup
- Use **Node.js 20+** and **npm >=10**.
- Install dependencies for all workspaces with `npm run install:all`.

## Development Commands
- `npm run dev` – starts frontend, backend, and electron processes.
- `npm run build` – build all workspaces.
- `npm test` – run unit tests.

## Pre-commit Checklist
Make a best effort to run and fix results of the following before committing:
- `npm run lint:complexity`
- `npm run lint:duplicates`
- `npm test`
- `npm run build` (when build is affected)

Never bypass git hooks; do not commit with failing checks.

## Additional Guidance
- Review `plan-de-desarrollo.md` for the project plan and current phase.
