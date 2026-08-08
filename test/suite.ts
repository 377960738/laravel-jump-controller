import assert from 'node:assert/strict';
import { commands, extensions, Position, Uri, workspace } from 'vscode';

export async function run(): Promise<void> {
  const folder = workspace.workspaceFolders?.[0];
  assert.ok(folder, 'fixture workspace should be open');
  const routeUri = Uri.joinPath(folder.uri, 'routes', 'web.php');
  const document = await workspace.openTextDocument(routeUri);
  await extensions.getExtension('pgl.laravel-jump-controller')?.activate();

  const source = document.getText();
  const offset = source.indexOf('Orders::class');
  assert.ok(offset >= 0, 'controller fixture should exist');
  const definitions = await commands.executeCommand<Array<{ uri: Uri; range: { start: Position } }>>(
    'vscode.executeDefinitionProvider', routeUri, document.positionAt(offset + 2),
  );
  assert.equal(definitions.length, 1);
  assert.equal(definitions[0]?.uri.fsPath, Uri.joinPath(folder.uri, 'app', 'Http', 'Controllers', 'OrderController.php').fsPath);
  assert.equal(definitions[0]?.range.start.line, 4);

  const methodOffset = source.indexOf("'show'") + 2;
  const methodDefinitions = await commands.executeCommand<Array<{ uri: Uri; range: { start: Position } }>>(
    'vscode.executeDefinitionProvider', routeUri, document.positionAt(methodOffset),
  );
  assert.equal(methodDefinitions[0]?.range.start.line, 6);
}
