# 0.0.x and 0.2.x comparison

| Area | 0.0.x legacy line | 0.2.x maintained line |
| --- | --- | --- |
| Status | Archived, no fixes | Actively maintained |
| Route analysis | Regular-expression and line-oriented matching | PHP AST with exact source ranges |
| Route forms | Basic actions and a limited set of resource variants | Multiline actions, arrays, callable strings, fluent groups, controller groups, resources, plural resources, singleton routes and `only()` methods |
| Closures/groups | Limited structural understanding | Nested `controller(...)->group(...)` context |
| Class discovery | Configured Controller path/namespace assumptions | Nearest Composer PSR-4 mapping with legacy configuration fallback |
| Method lookup | Concrete Controller file | Concrete class plus recursive parent-class declarations |
| Underlines | Document-link style whole-document processing | Atomic editor Decorations with method-level Controller-to-target dependencies |
| Change handling | Editor/file events with broad recomputation | AST snapshot diffing, filesystem signature validation and per-target cache invalidation |
| Missing methods | Could fall back to the Controller and remain clickable | No underline or definition unless the method is actually declared in the class hierarchy |
| Navigation API | Document links and hover-oriented behavior | Native Definition, Hover and Decoration APIs |
| Workspace I/O | Synchronous local filesystem assumptions | `workspace.fs` and URI-based local project resolution; non-file schemes remain future work |
| Multi-root/nested projects | Weak | Nearest-project Composer discovery |
| Build baseline | Historical toolchain; VS Code `^1.18.0` declaration | Node.js 24+, compatible npm, TypeScript 7, VS Code 1.85.0+ |
| Tests | No systematic regression suite | Strict typecheck, parser/resolver/demo tests, packaging checks and Extension Host fixtures |
| Runtime execution | Static matching | Static analysis only; never boots Laravel or runs Artisan automatically |

The `legacy/0.0.x` branch remains available for source comparison and emergency archaeology. It should not receive feature or compatibility work. The active maintenance branch is `release/0.2.x`; verified releases are promoted to `master` and tagged.
