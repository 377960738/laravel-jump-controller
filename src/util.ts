'use strict';

import { workspace, TextDocument, DocumentLink, Range, Uri } from 'vscode';
import * as fs from 'fs';
import * as readLine from 'n-readlines';

export class LaravelControllerLink extends DocumentLink {
    filePath: string;
    funcName: string;
    controllerName: string;
    constructor(range: Range, path: string, controllerName: string, funcName: string) {
        super(range, null);
        this.filePath = path;
        this.controllerName = controllerName;
        this.funcName = funcName;
    }
}

var pathCtrl = workspace.getConfiguration('laravel_jump_controller').pathController; // default settings or user settings

pathCtrl = pathCtrl ? pathCtrl : 'app/Http/Controllers';

// get pathNamespace from config.json
let pathNamespace = workspace.getConfiguration('laravel_jump_controller').pathNamespace;

pathNamespace = pathNamespace ? pathNamespace : 'App\\Http\\Controllers';

/**
 * Finds the controler's filepath
 * @param text
 * @param document
 */
export function getFilePath(text: string, document: TextDocument, composerAutoLoadPSR: Object) {

    let workspaceFolder = workspace.getWorkspaceFolder(document.uri).uri.fsPath;

    let controllerFileName = text + '.php';

    // replace the http controllers namespace to empty string
    if (controllerFileName.indexOf(pathNamespace) === 0) {
        controllerFileName = controllerFileName.slice((pathNamespace + '\\').replace(/\\\\/g, '\\').length);
    }

    if (controllerFileName.charAt(0) === "\\") {
        for (let _i in composerAutoLoadPSR) {
            if (controllerFileName.indexOf('\\' + _i) === 0) {
                controllerFileName = controllerFileName.slice(_i.length + 1 /** include the leading backslash */);
                controllerFileName = (composerAutoLoadPSR[_i] + '/').replace(/\/\//g, '/') + controllerFileName;
                break;
            }
        }
    } else {
        controllerFileName = (pathCtrl + '/').replace(/\/\//g, '/') + controllerFileName;
    }

    controllerFileName = controllerFileName.replace(/\\/g, '/');

    let targetPath = (workspaceFolder + '/' + controllerFileName).replace(/\/\//g, '/');

    if (fs.existsSync(targetPath)) {
        return targetPath;
    }
    let dirItems = fs.readdirSync(workspaceFolder);
    for (let item of dirItems) {
        targetPath = workspaceFolder + '/' + item + '/' + controllerFileName;
        if (fs.existsSync(targetPath)) {
            return targetPath;
        }
    }
    return null;
}

export function getLineNumber(text: string, path: string) {
    let file = new readLine(path);
    let lineNum = 0;
    let line: string;
    while (line = file.next()) {
        lineNum++;
        line = line.toString();
        if (line.toLowerCase().includes('function ' + text.toLowerCase() + '(')) {
            return lineNum;
        }
    }
    return -1;
}
