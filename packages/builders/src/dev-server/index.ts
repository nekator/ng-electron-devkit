import {BuilderContext, BuilderOutput, createBuilder, targetFromTargetString} from "@angular-devkit/architect";
import {Observable, of, from} from "rxjs";
import {concatMap, map, switchMap} from "rxjs/operators";
import {DevServerBuilderOptions, executeDevServerBuilder} from "@angular-devkit/build-angular";
import {buildWebpackConfig, compileElectronEntryPoint} from '../common/common';
import {getSystemPath, json, normalize, Path, resolve} from '@angular-devkit/core';
import {ChildProcess, spawn} from 'child_process';
import {ElectronBuilderOptions} from "../electron";


let electronProcess: ChildProcess;


let getOptions = async function (context: BuilderContext, browserTarget) {
    const rawBrowserOptions = await context.getTargetOptions(browserTarget);
    const browserName = await context.getBuilderNameForTarget(browserTarget);
    return await context.validateOptions<json.JsonObject & ElectronBuilderOptions>(
        {...rawBrowserOptions},
        browserName,
    );
};

export function run(builderConfig: DevServerBuilderOptions, context: BuilderContext): Observable<BuilderOutput> {


        return executeDevServerBuilder(builderConfig, context, {webpackConfiguration: buildWebpackConfig})
            .pipe(
                concatMap( (options) => {
                    const browserTarget = targetFromTargetString(builderConfig.browserTarget);
                    const builderOptions =  getOptions(context, browserTarget);
                    return from(builderOptions).pipe(
                        switchMap(options =>
                            _compileElectronEntryPoint(normalize(context.workspaceRoot), options, context)
                                .pipe(map(() => options))
                        )
                    );
                }),
                concatMap(builderOptions => {
                        return startElectron(normalize(context.workspaceRoot), builderOptions)
                            .pipe(map(() => builderOptions));
                }),
                concatMap(options => {
                    // watching does not work as intended, therefor its disabled right now
                    /*if(options.watchElectron){
                        return new Observable<BuildEvent>(obs => {
                            let electronProjectDir = getSystemPath(resolve(this.context.workspace.root, normalize(options.electronProjectDir)));

                            let hostWatchEventObservable = this.context.host.watch(normalize(electronProjectDir),{recursive: true, persistent:false});
                            hostWatchEventObservable.subscribe(
                                (event) => {
                                    // Watch Typescript files in electron project dir
                                    let escapedElectronProjectDirForRegex = options.electronProjectDir.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                                    let changedTsFiles = event.path.match(new RegExp('(?!.*\\/node_modules\\/.*)(.*' + escapedElectronProjectDirForRegex + '.*)(.*\\.ts$)'));
                                    if (changedTsFiles && changedTsFiles.length > 0) {
                                        console.log(event);
                                        this.compileElectronEntryPoint(this.context.workspace.root, options).pipe(take(1)).subscribe((buildEvent) => {
                                            this.electronProcess.kill();
                                            this.startElectron(this.context.workspace.root, options).pipe(take(1)).subscribe((startElectronBuildEvent) => {
                                                this.context.logger.info('restarted Electron Application');
                                            })
                                        });
                                    }
                                },
                                (error) => obs.next({success: false}));
                        })
                    }else {*/
                        return of({success: true});
                    //}

                })
            )
    }



function _compileElectronEntryPoint(root: Path, options: ElectronBuilderOptions, context: BuilderContext): Observable<BuilderOutput> {
        let electronProjectDir = getSystemPath(resolve(root, normalize(options.electronProjectDir)));
        return compileElectronEntryPoint(context, options, electronProjectDir)
    }

function startElectron(root: Path, options: ElectronBuilderOptions): Observable<BuilderOutput> {

        return new Observable(obs => {
            let electronProjectDir = getSystemPath(resolve(root, normalize(options.electronProjectDir)));

            let args = [electronProjectDir, '--serve'];

            electronProcess = spawn('electron', args, {stdio: 'inherit'});

            obs.next({success: true});
        })
    }


export default createBuilder<json.JsonObject & DevServerBuilderOptions>(run);
