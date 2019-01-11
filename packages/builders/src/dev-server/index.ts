import {BuilderConfiguration, BuilderContext, BuildEvent} from "@angular-devkit/architect";
import {Observable, of} from "rxjs";
import {tap, concatMap, mergeMap, map, flatMap, take} from "rxjs/operators";
import {DevServerBuilder, DevServerBuilderOptions} from "@angular-devkit/build-angular";
import {buildWebpackConfig, compileElectronEntryPoint, getElectronMainEntryPoint} from '../common/common';
import {getSystemPath, normalize, Path, resolve} from '@angular-devkit/core';
import {ElectronBuilderSchema} from '../electron/schema';
import {ChildProcess, spawn} from 'child_process';
import {HostWatchEvent} from "@angular-devkit/core/src/virtual-fs/host";


export class ElectronDevServerBuilder extends DevServerBuilder {

    electronProcess: ChildProcess;

    originalAddLiveReload: any;

    constructor(public context: BuilderContext) {
        super(context);
    }

    run(builderConfig: BuilderConfiguration<DevServerBuilderOptions>): Observable<BuildEvent> {
        this.originalAddLiveReload = this['_addLiveReload'] as any;
        this['_addLiveReload'] = this._overriddenAddLiveReload;

        let browserOptions = (this['_getBrowserOptions'](builderConfig.options) as Observable<ElectronBuilderSchema>);
        return super.run(builderConfig)
            .pipe(
                concatMap(() => browserOptions),
                concatMap(options => {
                    return this.compileElectronEntryPoint(this.context.workspace.root, options)
                        .pipe(map(() => options));
                }),
                concatMap(options => {
                    return this.startElectron(this.context.workspace.root, options)
                        .pipe(map(() => options));
                }),
                concatMap(options => {
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
                })
            )
    }

    _overriddenAddLiveReload(options, browserOptions, webpackConfig, // tslint:disable-line:no-any
                             clientAddress) {
        if (this.originalAddLiveReload) {
            this.originalAddLiveReload.apply(this, arguments);

            let newWebpackConfig = buildWebpackConfig(webpackConfig);
            Object.assign(webpackConfig, newWebpackConfig);
        }
    }


    compileElectronEntryPoint(root: Path, options: ElectronBuilderSchema): Observable<BuildEvent> {
        let electronProjectDir = getSystemPath(resolve(root, normalize(options.electronProjectDir)));
        return compileElectronEntryPoint(this.context, options, electronProjectDir)
    }

    startElectron(root: Path, options: ElectronBuilderSchema): Observable<BuildEvent> {

        return new Observable(obs => {
            let electronProjectDir = getSystemPath(resolve(root, normalize(options.electronProjectDir)));

            let args = [electronProjectDir, '--serve'];
            let electron: any = require('electron');

            this.electronProcess = spawn(electron, args, {stdio: 'inherit'});
           // this.electronProcess.on('close', (code) => process.exit(code));

            obs.next({success: true});
        })
    }
}


export default ElectronDevServerBuilder;
