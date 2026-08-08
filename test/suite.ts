import assert from 'node:assert/strict';
import { commands, DocumentLink, extensions, Position, Uri, workspace } from 'vscode';

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
  assert.equal(methodDefinitions[0]?.range.start.line, 8);

  const documentLinks = await commands.executeCommand<DocumentLink[]>('vscode.executeDocumentLinkProvider', routeUri);
  assert.ok(documentLinks.some((link) => document.getText(link.range) === 'Orders'));
  assert.ok(documentLinks.some((link) => document.getText(link.range) === 'show'));
  assert.ok(documentLinks.every((link) => link.target?.scheme === 'file'));

  const missingRouteUri = Uri.joinPath(folder.uri, 'routes', '.integration-missing-method.php');
  const missingRoute = `<?php
use App\\Http\\Controllers\\OrderController;
Route::get('/missing', [OrderController::class, 'renamedMethod']);
`;
  await workspace.fs.writeFile(missingRouteUri, new TextEncoder().encode(missingRoute));
  try {
    const missingDocument = await workspace.openTextDocument(missingRouteUri);
    const missingLinks = await commands.executeCommand<DocumentLink[]>('vscode.executeDocumentLinkProvider', missingRouteUri);
    assert.ok(missingLinks.some((link) => missingDocument.getText(link.range) === 'OrderController'));
    assert.ok(!missingLinks.some((link) => missingDocument.getText(link.range) === 'renamedMethod'));
    const missingMethodOffset = missingRoute.indexOf('renamedMethod');
    const missingDefinitions = await commands.executeCommand<Array<unknown>>(
      'vscode.executeDefinitionProvider', missingRouteUri, missingDocument.positionAt(missingMethodOffset + 2),
    );
    assert.deepEqual(missingDefinitions, []);
  } finally {
    await workspace.fs.delete(missingRouteUri);
  }
}
