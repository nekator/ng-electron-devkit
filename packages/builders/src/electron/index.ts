import {BuilderContext, BuilderOutput, createBuilder} from "@angular-devkit/architect";
import {getSystemPath, json, normalize, resolve} from '@angular-devkit/core';
import {Observable, of} from "rxjs";

import {BrowserBuilderOptions, executeBrowserBuilder} from "@angular-devkit/build-angular";
import {ElectronBuilderSchema} from "./schema";
import {runModuleAsObservableFork} from "@angular-devkit/build-angular/src/utils";
import {concatMap} from 'rxjs/operators';

import {BuildElectronArgs} from "./build-electron-args";
import {buildWebpackConfig, compileElectronEntryPoint} from '../common/common';


export  type ElectronBuilderOptions = ElectronBuilderSchema & BrowserBuilderOptions;

export function runElectronBuilder(builderConfig: ElectronBuilderOptions, context: BuilderContext): Observable<BuilderOutput> {
    return of(null).pipe(
        concatMap(() => executeBrowserBuilder(builderConfig, context, {
            webpackConfiguration: buildWebpackConfig
        })),
        concatMap(() => _compileElectronEntryPoint(builderConfig, context)),
        concatMap(() => installElectronApplicationDependencies(builderConfig, context)),
        concatMap(() => packElectronApplication(builderConfig, context))
    )
}



function _compileElectronEntryPoint(builderConfig: ElectronBuilderOptions, context: BuilderContext): Observable<BuilderOutput> {
    return compileElectronEntryPoint(context, builderConfig, builderConfig.outputPath)
}

function packElectronApplication(builderConfig: ElectronBuilderOptions, context : BuilderContext): Observable<BuilderOutput> {

    const root = normalize(context.workspaceRoot);

    let args: BuildElectronArgs = {
        projectDir: getSystemPath(resolve(root, normalize(builderConfig.electronProjectDir))),
        platforms: builderConfig.electronPlatforms
    };

    context.logger.info(
        `Running electron-builder with projectDir: ${args.projectDir} and platforms: ${args.platforms}`
    );

    return runModuleAsObservableFork(
        getSystemPath(root),
        '@ng-electron-devkit/builders/dist/electron/build-electron',
        'build',
        [
            args
        ],
    );
}

function installElectronApplicationDependencies(builderConfig:ElectronBuilderOptions, context : BuilderContext): Observable<BuilderOutput> {

    return runModuleAsObservableFork(
        getSystemPath(resolve(normalize(context.workspaceRoot), normalize(builderConfig.electronProjectDir))),
        '@ng-electron-devkit/builders/dist/electron/build-electron',
        'installAppDeps',
        [],
    );
}


export default createBuilder<json.JsonObject & ElectronBuilderSchema & BrowserBuilderOptions>(runElectronBuilder)
