"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const rxjs_1 = require("rxjs");
const operators_1 = require("rxjs/operators");
const build_angular_1 = require("@angular-devkit/build-angular");
const common_1 = require("../common/common");
const core_1 = require("@angular-devkit/core");
const child_process_1 = require("child_process");
class ElectronDevServerBuilder extends build_angular_1.DevServerBuilder {
    constructor(context) {
        super(context);
        this.context = context;
    }
    run(builderConfig) {
        this.originalAddLiveReload = this['_addLiveReload'];
        this['_addLiveReload'] = this._overriddenAddLiveReload;
        let browserOptions = this['_getBrowserOptions'](builderConfig.options);
        return super.run(builderConfig)
            .pipe(operators_1.concatMap(() => browserOptions), operators_1.concatMap(options => {
            return this.compileElectronEntryPoint(this.context.workspace.root, options)
                .pipe(operators_1.map(() => options));
        }), operators_1.concatMap(options => {
            return this.startElectron(this.context.workspace.root, options)
                .pipe(operators_1.map(() => options));
        }), operators_1.concatMap(options => {
            return new rxjs_1.Observable(obs => {
                let electronProjectDir = core_1.getSystemPath(core_1.resolve(this.context.workspace.root, core_1.normalize(options.electronProjectDir)));
                let hostWatchEventObservable = this.context.host.watch(core_1.normalize(electronProjectDir), { recursive: true, persistent: false });
                hostWatchEventObservable.subscribe((event) => {
                    // Watch Typescript files in electron project dir
                    let escapedElectronProjectDirForRegex = options.electronProjectDir.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                    let changedTsFiles = event.path.match(new RegExp('(?!.*\\/node_modules\\/.*)(.*' + escapedElectronProjectDirForRegex + '.*)(.*\\.ts$)'));
                    if (changedTsFiles && changedTsFiles.length > 0) {
                        console.log(event);
                        this.compileElectronEntryPoint(this.context.workspace.root, options).pipe(operators_1.take(1)).subscribe((buildEvent) => {
                            this.electronProcess.kill();
                            this.startElectron(this.context.workspace.root, options).pipe(operators_1.take(1)).subscribe((startElectronBuildEvent) => {
                                this.context.logger.info('restarted Electron Application');
                            });
                        });
                    }
                }, (error) => obs.next({ success: false }));
            });
        }));
    }
    _overriddenAddLiveReload(options, browserOptions, webpackConfig, // tslint:disable-line:no-any
    clientAddress) {
        if (this.originalAddLiveReload) {
            this.originalAddLiveReload.apply(this, arguments);
            let newWebpackConfig = common_1.buildWebpackConfig(webpackConfig);
            Object.assign(webpackConfig, newWebpackConfig);
        }
    }
    compileElectronEntryPoint(root, options) {
        let electronProjectDir = core_1.getSystemPath(core_1.resolve(root, core_1.normalize(options.electronProjectDir)));
        return common_1.compileElectronEntryPoint(this.context, options, electronProjectDir);
    }
    startElectron(root, options) {
        return new rxjs_1.Observable(obs => {
            let electronProjectDir = core_1.getSystemPath(core_1.resolve(root, core_1.normalize(options.electronProjectDir)));
            let args = [electronProjectDir, '--serve'];
            let electron = require('electron');
            this.electronProcess = child_process_1.spawn(electron, args, { stdio: 'inherit' });
            // this.electronProcess.on('close', (code) => process.exit(code));
            obs.next({ success: true });
        });
    }
}
exports.ElectronDevServerBuilder = ElectronDevServerBuilder;
exports.default = ElectronDevServerBuilder;
//# sourceMappingURL=index.js.map