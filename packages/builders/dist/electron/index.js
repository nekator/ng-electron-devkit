"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@angular-devkit/core");
const rxjs_1 = require("rxjs");
const build_angular_1 = require("@angular-devkit/build-angular");
const utils_1 = require("@angular-devkit/build-angular/src/utils");
const operators_1 = require("rxjs/operators");
const common_1 = require("../common/common");
class ElectronBuilder extends build_angular_1.BrowserBuilder {
    constructor(context) {
        super(context);
        this.context = context;
    }
    run(builderConfig) {
        return rxjs_1.of(null).pipe(operators_1.concatMap(() => super.run(builderConfig)), operators_1.concatMap(() => this.compileElectronEntryPoint(builderConfig)), operators_1.concatMap(() => this.packElectronApplication(builderConfig)));
    }
    buildWebpackConfig(root, projectRoot, host, options) {
        let browserConfig = super.buildWebpackConfig(root, projectRoot, host, options);
        return common_1.buildWebpackConfig(browserConfig);
    }
    compileElectronEntryPoint(builderConfig) {
        return common_1.compileElectronEntryPoint(this.context, builderConfig.options, builderConfig.options.outputPath);
    }
    packElectronApplication(builderConfig) {
        const root = this.context.workspace.root;
        let args = {
            projectDir: core_1.getSystemPath(core_1.resolve(root, core_1.normalize(builderConfig.options.electronProjectDir))),
            platforms: builderConfig.options.electronPlatforms
        };
        this.context.logger.info(`Running electron-builder with projectDir: ${args.projectDir} and platforms: ${args.platforms}`);
        return utils_1.runModuleAsObservableFork(root, '@ng-electron-devkit/builders/src/electron/build-electron', 'build', [
            args
        ]);
    }
}
exports.ElectronBuilder = ElectronBuilder;
exports.default = ElectronBuilder;
//# sourceMappingURL=index.js.map