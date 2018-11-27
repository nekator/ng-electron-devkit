"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@angular-devkit/core");
const fs = require("fs");
const rxjs_1 = require("rxjs");
const ts = require("typescript");
const webpackMerge = require('webpack-merge');
function buildWebpackConfig(browserConfig) {
    const electronConfig = {
        target: 'electron-renderer',
        node: {
            __dirname: false
        }
    };
    const webpackConfigs = [
        browserConfig,
        electronConfig
    ];
    return webpackMerge(webpackConfigs);
}
exports.buildWebpackConfig = buildWebpackConfig;
function getElectronMainEntryPoint(electronProjectDir) {
    let packageJsonPath = core_1.getSystemPath(core_1.resolve(electronProjectDir, core_1.normalize('package.json')));
    let packageJsonContent = fs.readFileSync(packageJsonPath, 'utf8');
    let packageJson = JSON.parse(packageJsonContent);
    return packageJson != null ? packageJson.main : null;
}
exports.getElectronMainEntryPoint = getElectronMainEntryPoint;
function compileElectronEntryPoint(context, options, outputPath) {
    return new rxjs_1.Observable(obs => {
        const root = context.workspace.root;
        const electronTSConfigPath = core_1.getSystemPath(core_1.resolve(root, core_1.normalize(options.electronTSConfig)));
        const tsConfigReadResult = ts.readConfigFile(electronTSConfigPath, (pathtoTsconfig) => fs.readFileSync(pathtoTsconfig, 'utf8'));
        if (tsConfigReadResult.error) {
            context.logger.error("Error while reading electronTSConfig");
            obs.next({ success: false });
        }
        else {
            const configParseResult = tsConfigReadResult.config;
            let compileroptions = Object.assign({}, ts.getDefaultCompilerOptions(), configParseResult.compilerOptions);
            compileroptions.outDir = outputPath;
            let electronProjectDir = core_1.resolve(root, core_1.normalize(options.electronProjectDir));
            let electronMainEntryPoint = getElectronMainEntryPoint(electronProjectDir);
            if (!electronMainEntryPoint) {
                context.logger.error(`Error reading main typescript entry point in package.json : ${electronProjectDir}`);
                obs.next({ success: false });
            }
            let tsFile = electronMainEntryPoint.replace(/\.[^\.]+$/, '.ts');
            if (!fs.existsSync(core_1.getSystemPath(core_1.resolve(electronProjectDir, core_1.normalize(tsFile))))) {
                context.logger.info(`Skiping typescript compile for electron entry point. No corresponding .ts File found for entry point configured in property main of package.json : ${electronProjectDir}`);
                obs.next({ success: true });
                obs.complete();
                return;
            }
            let mainEntryPoint = core_1.getSystemPath(core_1.resolve(electronProjectDir, core_1.normalize(tsFile)));
            const host = ts.createCompilerHost(compileroptions);
            const program = ts.createProgram([mainEntryPoint], compileroptions, host);
            let emitResult = program.emit();
            let allDiagnostics = ts
                .getPreEmitDiagnostics(program)
                .concat(emitResult.diagnostics);
            allDiagnostics.forEach(diagnostic => {
                if (diagnostic.file) {
                    let { line, character } = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start);
                    let message = ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n");
                    context.logger.info(`${diagnostic.file.fileName} (${line + 1},${character + 1}): ${message}`);
                }
                else {
                    context.logger.info(`${ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n")}`);
                }
            });
            console.log('typescript compile success');
            obs.next({ success: !emitResult.emitSkipped });
        }
        obs.complete();
    });
}
exports.compileElectronEntryPoint = compileElectronEntryPoint;
//# sourceMappingURL=common.js.map