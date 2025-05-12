'use strict';

import { workspace, Position, Range, CancellationToken, DocumentLink, DocumentLinkProvider, TextDocument, Uri, ProviderResult, commands } from 'vscode';
import * as util from './util';
import * as fs from 'fs';

export class LinkProvider implements DocumentLinkProvider {
    /**
     * provideDocumentLinks
     */
    public provideDocumentLinks(document: TextDocument, token: CancellationToken): ProviderResult<DocumentLink[]> {
        let workspaceFolder = workspace.getWorkspaceFolder(document.uri);
        let composerAutoLoadPSR = {};
        try {
            const composer = fs.readFileSync(Uri.parse(`${workspaceFolder.uri}/composer.json`).path, "utf-8");

            if (composer) {
                const composerConfigure = JSON.parse(composer);
                if (composerConfigure.autoload && composerConfigure.autoload['psr-4']) {
                    composerAutoLoadPSR = Object.assign(composerAutoLoadPSR, composerConfigure.autoload['psr-4']);
                }
                if (composerConfigure['autoload-dev'] && composerConfigure['autoload-dev']['psr-4']) {
                    composerAutoLoadPSR = Object.assign(composerAutoLoadPSR, composerConfigure.autoload['psr-4']);
                }
            }
        } catch (err) {
            // throw err;
        }

        let documentLinks = [];
        let index = 0;
        let reg = /((\:\:)|(->))(((get|post|put|patch|delete|options|any|resource|apiResource|singleton|apiSingleton)\()|(match\(\s?\[(['"][a-zA-Z]+['"],?\s?)+\],))\s?['"](\/?([a-zA-Z\d_\-.#@\/]|(\{[a-zA-Z\d_\-]+(\}|\?\})))*\/?)?(\?[a-zA-Z\d_]+\=[\s\S]*)?['"],\s?((['"][a-zA-Z\d_\\]+(@[a-zA-Z\d_]+){0,1}['"])|(\[(([a-zA-Z\d_\\]+::class)|(['"][a-zA-Z\d_\\]+['"])),\s?['"][a-zA-Z\d_]+['"]\])|([a-zA-Z\d_\\]+::class))\s?\)/;
        while (index < document.lineCount) {

            let choice = [];

            let line = document.lineAt(index);
            let result = line.text.match(reg);

            let currentLine = (result === null) ? '' : result[0];

            // turn the match method preg to a usual string
            if (currentLine.indexOf('match(') !== -1) {
                //rewrite string
                currentLine = currentLine.replace(/match\(\s?\[(['"][a-zA-Z]+['"],?\s?)+\],/, 'match(');
            }

            // match controller and method
            let splitted = currentLine.split(',').splice(1);

            if (splitted.length == 1) {

                // match string @
                if (splitted[0].indexOf('@') > -1) {
                    splitted = splitted[0].replace(/['"\s\);]/g, '').split('@')
                    choice = [line.text.indexOf(splitted[0]), splitted.join('@').length];
                } else if (splitted[0].indexOf('::class') > -1) {
                    // match string ::class
                    splitted = splitted[0].replace(/['"\s\);]/g, '').split('::class')
                    splitted[1] = 'index'
                    choice = [line.text.indexOf(splitted[0]), splitted[0].length];
                } else {
                    // match resource mod
                    splitted[0] = splitted[0].replace(/['"\s\);]/g, '')
                    splitted[1] = 'index'
                    choice = [line.text.indexOf(splitted[0]), splitted[0].length];
                }
            } else if (splitted.length == 2) {
                // match controller and method
                splitted[0] = splitted[0].replace(/[\['"\s]/g, '').replace('::class', '')
                let func_offset = line.text.indexOf(splitted[1].trim()) + 1
                splitted[1] = splitted[1].replace(/['"\s\]\);]/g, '')
                choice = [func_offset, splitted[1].length];
            }

            let filePath = (splitted.length > 1) ? util.getFilePath(splitted[0], document, composerAutoLoadPSR) : null;

            if (filePath != null) {
                let start = new Position(line.lineNumber, choice[0]);
                let end = start.translate(0, choice[1]);
                let documentLink = new util.LaravelControllerLink(new Range(start, end), filePath, splitted[0], splitted[1]);
                documentLinks.push(documentLink);
            }

            index++;
        }
        return documentLinks;
    }

    /**
     * resolveDocumentLink
     */
    public resolveDocumentLink(link: util.LaravelControllerLink, token: CancellationToken): ProviderResult<DocumentLink> {
        let lineNum = util.getLineNumber(link.funcName, link.filePath);
        let path = link.filePath;
        if (lineNum != -1)
            path += "#" + lineNum;

        link.target = Uri.parse("file:" + path);
        return link;
    }
}
