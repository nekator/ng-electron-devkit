import {
    BuilderContext,
    BuilderConfiguration,
    BuildEvent
} from "@angular-devkit/architect";
import {getSystemPath, join, normalize, Path, resolve, virtualFs} from '@angular-devkit/core';
import {Observable, of} from "rxjs";

import {BrowserBuilder, NormalizedBrowserBuilderSchema} from "@angular-devkit/build-angular";
import {ElectronBuilderSchema} from "./schema";
import {runModuleAsObservableFork} from "@angular-devkit/build-angular/src/utils";
import {concatMap} from 'rxjs/operators';

import {BuildElectronArgs} from "./build-electron-args";
import {buildWebpackConfig, compileElectronEntryPoint} from '../common/common';

import {ChildProcess,  spawn} from "child_process";
import treeKill = require("tree-kill");
import rimraf = require("rimraf");
import {rmdir} from "fs";




export class ElectronBuilder extends BrowserBuilder {


    constructor(public context: BuilderContext) {
        super(context);
    }

    run(builderConfig: BuilderConfiguration<ElectronBuilderSchema>): Observable<BuildEvent> {
        return of(null).pipe(
            concatMap(() => super.run(builderConfig)),
            concatMap(() => this.compileElectronEntryPoint(builderConfig)),
            concatMap(() => this.installElectronApplicationDependencies(builderConfig)),
            concatMap(() => this.packElectronApplication(builderConfig))
        )
    }

    buildWebpackConfig(
        root: Path,
        projectRoot: Path,
        host: any,
        options: NormalizedBrowserBuilderSchema
    ): any {
        let browserConfig = super.buildWebpackConfig(root, projectRoot, host, options);
        return buildWebpackConfig(browserConfig);
    }

    compileElectronEntryPoint(builderConfig: BuilderConfiguration<ElectronBuilderSchema>): Observable<BuildEvent> {
        return compileElectronEntryPoint(this.context, builderConfig.options, builderConfig.options.outputPath)
    }

    packElectronApplication(builderConfig: BuilderConfiguration<ElectronBuilderSchema>): Observable<BuildEvent> {

        const root = this.context.workspace.root;

        let args: BuildElectronArgs = {
            projectDir: getSystemPath(resolve(root, normalize(builderConfig.options.electronProjectDir))),
            platforms: builderConfig.options.electronPlatforms
        };

        this.context.logger.info(
            `Running electron-builder with projectDir: ${args.projectDir} and platforms: ${args.platforms}`
        );

        return runModuleAsObservableFork(
            root,
            '@ng-electron-devkit/builders/dist/electron/build-electron',
            'build',
            [
                args
            ],
        );
    }

    installElectronApplicationDependencies(builderConfig: BuilderConfiguration<ElectronBuilderSchema>): Observable<BuildEvent>{


        return new Observable<BuildEvent>( obs =>{
            const electronProjectPath : Path = resolve(this.context.workspace.root, normalize(builderConfig.options.electronProjectDir));
            const electronNodeModulesPath  = getSystemPath(resolve(  electronProjectPath ,normalize('node_modules')));
            rimraf(electronNodeModulesPath,{rmdir: rmdir}, (error)=>{
                if(error){
                    this.context.logger.info(error.message);
                    obs.error(error);
                    obs.next({success: false});
                    obs.complete();
                }
            });
            let electronBuilderExecutable : string ;
            if(process.platform === 'win32'){
                electronBuilderExecutable=   'electron-builder.cmd';
            }else{
                electronBuilderExecutable= 'electron-builder';
            }
            const electronBuilderExecutablePath : string = getSystemPath(join(this.context.workspace.root, 'node_modules' , '.bin', electronBuilderExecutable));
            const childProcess: ChildProcess = spawn(electronBuilderExecutablePath , ['install-app-deps'] ,{cwd:getSystemPath(electronProjectPath)});
            const killForkedProcess = () => {
                if (childProcess && childProcess.pid) {
                    treeKill(childProcess.pid, 'SIGTERM');
                }
            };
            // Handle child process exit.
            const handleChildProcessExit = (code) => {
                killForkedProcess();
                if (code && code !== 0) {
                    obs.error();
                }
                obs.next({ success: true });
                obs.complete();
            };
            childProcess.once('exit', handleChildProcessExit);
            childProcess.once('SIGINT', handleChildProcessExit);
            childProcess.once('uncaughtException', handleChildProcessExit);
            const handleParentProcessExit = () => {
                killForkedProcess();
            };
            process.once('exit', handleParentProcessExit);
            process.once('SIGINT', handleParentProcessExit);
            process.once('uncaughtException', handleParentProcessExit);
        })

    }
}


export default ElectronBuilder;
