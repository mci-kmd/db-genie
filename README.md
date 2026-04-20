# DB Genie

Desktop SQL workbench foundation built with Electron, React, TypeScript, Monaco, SQL Server, and the GitHub Copilot SDK.

## Current scope

- SQL Server connection management with saved profiles
- schema explorer for tables, views, columns, and JSON candidates
- Monaco SQL editor with schema-aware completion and SQL Server JSON helpers
- query execution with a modern results grid
- Copilot SDK flow for generating SQL against the active schema

## Scripts

- `npm run dev` - run the Electron app in development
- `npm run build` - build renderer and Electron bundles
- `npm run dist` - package a distributable desktop build
- `npm run lint` - run ESLint

## Notes

- SQL Server is the first implemented provider
- saved passwords use Electron `safeStorage` when available
- Copilot SQL generation requires a working Copilot auth or BYOK setup for `@github/copilot-sdk`
