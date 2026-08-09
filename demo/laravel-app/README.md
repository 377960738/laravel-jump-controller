# Navigation demo

Open this directory as a VS Code workspace and run the extension in development mode. The route files exercise controller arrays, invokable controllers, inherited methods, fluent controller groups, fluent resource declarations with `only()`, plural resources, aliases, multiline formatting and legacy callable strings.

Verification checklist:

1. Resolved controller and method symbols are underlined.
2. Ctrl/Cmd-click and F12 on a controller open the class declaration.
3. Ctrl/Cmd-click and F12 on an action open the method declaration.
4. Hover displays the resolved relative file and method.
5. `routes/api.php` verifies the reported fluent resource regression.
6. `routes/shared.php` reproduces GitHub Issue #3 verbatim.
7. `routes/legacy.php` verifies configuration fallback and old string callable syntax.
8. `routes/web.php` verifies inherited method navigation and individual resource methods declared by `only()`.
