# Retired prototype reference

These Phase 1 components/selectors are retained as design references and isolated
fixture tests. No application route or public homepage imports this directory.
`/preview` and every old nested preview URL now enter the authenticated workspace.
The public sample text files have moved to tests/fixtures/preview-documents.

Owner: repository maintainer. Removal condition: remove unused prototype view/CSS
files after the planned UI/UX pass has adopted any useful reference patterns; retain
only fixture/selector helpers still needed by tests. Do not wire these fictional
records or local simulation actions to production APIs. New product work uses
features/marketing, features/workspace and the existing live application services.
