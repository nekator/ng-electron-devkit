import {getSystemPath, normalize, Path, resolve} from '@angular-devkit/core';
import * as fs from "fs";
import { BuilderContext, BuildEvent} from '@angular-devkit/architect';
import {ElectronBuilderSchema} from '../electron/schema';
import {Observable} from "rxjs";
import * as ts from 'typescript';


const webpackMerge = require('webpack-merge');


export function buildWebpackConfig( browserConfig: any) {

    const electronConfig = {
        target: 'electron-renderer',
        node: {
            __dirname: false
        }
    };
    const webpackConfigs: {}[] = [
        browserConfig,
        electronConfig
    ];

    return webpackMerge(webpackConfigs);
}

export function getElectronMainEntryPoint (electronProjectDir: Path) {
    let packageJsonPath = getSystemPath(resolve(electronProjectDir, normalize('package.json')));

    let packageJsonContent = fs.readFileSync(packageJsonPath, 'utf8');
    let packageJson = JSON.parse(packageJsonContent);

    return packageJson != null ? packageJson.main : null;
}

export function compileElectronEntryPoint(context: BuilderContext, options: ElectronBuilderSchema, outputPath: string): Observable<BuildEvent> {
    return new Observable<BuildEvent>(obs => {

        const root = context.workspace.root;
        const electronTSConfigPath = getSystemPath(resolve(root, normalize(options.electronTSConfig)));

        const tsConfigReadResult = ts.readConfigFile(electronTSConfigPath, (pathtoTsconfig) => fs.readFileSync(pathtoTsconfig, 'utf8'));

        if (tsConfigReadResult.error) {
            context.logger.error("Error while reading electronTSConfig");
            obs.next({success: false})
        } else {
            const configParseResult = tsConfigReadResult.config;

            let compileroptions = Object.assign({}, ts.getDefaultCompilerOptions(), configParseResult.compilerOptions);
            compileroptions.outDir = outputPath;


            let electronProjectDir = resolve(root, normalize(options.electronProjectDir));

            let electronMainEntryPoint = getElectronMainEntryPoint(electronProjectDir);

            if(!electronMainEntryPoint) {
                context.logger.error(`Error reading main typescript entry point in package.json : ${electronProjectDir}`);
                obs.next({success: false});
            }

            let tsFile= electronMainEntryPoint.replace(/\.[^\.]+$/, '.ts');

            if(!fs.existsSync(getSystemPath(resolve(electronProjectDir, normalize(tsFile))))){
                context.logger.info(`Skiping typescript compile for electron entry point. No corresponding .ts File found for entry point configured in property main of package.json : ${electronProjectDir}`);
                obs.next({success: true});
                obs.complete();
                return;
            }

            let mainEntryPoint = getSystemPath(resolve(electronProjectDir, normalize(tsFile)));

            const host = ts.createCompilerHost(compileroptions);
            const program = ts.createProgram(
                [mainEntryPoint] as ReadonlyArray<string>,
                compileroptions,
                host
            );
            let emitResult = program.emit();

            let allDiagnostics = ts
                .getPreEmitDiagnostics(program)
                .concat(emitResult.diagnostics);

            allDiagnostics.forEach(diagnostic => {
                if (diagnostic.file) {
                    let {line, character} = diagnostic.file.getLineAndCharacterOfPosition(
                        diagnostic.start!
                    );
                    let message = ts.flattenDiagnosticMessageText(
                        diagnostic.messageText,
                        "\n"
                    );
                    context.logger.info(
                        `${diagnostic.file.fileName} (${line + 1},${character + 1}): ${message}`
                    );
                } else {
                    context.logger.info(
                        `${ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n")}`
                    );
                }
            });
            console.log('typescript compile success');

            obs.next({success: !emitResult.emitSkipped});
        }
        obs.complete();

    });

}

