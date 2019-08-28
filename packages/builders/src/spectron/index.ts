import {BuilderContext, BuilderOutput, createBuilder,} from '@angular-devkit/architect';
import {getSystemPath, json, normalize, Path, resolve, tags} from '@angular-devkit/core';
import {Observable, of} from 'rxjs';
import {concatMap, take} from 'rxjs/operators';
import {SpectronBuilderOptions} from "./schema";
import {ConfigParser} from "protractor/built/configParser";
import {Runner} from "protractor";
import {Application} from "spectron";
import {ElectronBuilderOptions, runElectronBuilder} from "../electron";


export function run(builderConfig: SpectronBuilderOptions, context: BuilderContext): Observable<BuilderOutput> {

        const root = normalize(context.workspaceRoot);

        // TODO: verify using of(null) to kickstart things is a pattern.
        return of(null).pipe(
            concatMap(() => builderConfig.electronBuilderTarget ? _startDevServer(builderConfig, context) : of(null)),
            concatMap(() => builderConfig.webdriverUpdate ? updateWebdriver() : of(null)),
            concatMap(() => _runProtractor(root, builderConfig, context)),
            take(1),
        );
    }

let getOptions = async function (context: BuilderContext, browserTarget, overrides : any) {
    const rawBrowserOptions = await context.getTargetOptions(browserTarget);
    const browserName = await context.getBuilderNameForTarget(browserTarget);
    return await context.validateOptions<json.JsonObject & ElectronBuilderOptions>(
        {...rawBrowserOptions, ...overrides},
        browserName,
    );
};

    // Note: this method mutates the options argument.
    async function _startDevServer(options: SpectronBuilderOptions, context: BuilderContext) {
        const [project, targetName, configuration] = (options.electronBuilderTarget as string).split(':');
        // Override dev server watch setting.
        const overrides = { watch: false };
        // Also override the port and host if they are defined in protractor options.
        const targetSpec = { project, target: targetName, configuration, overrides };
        const builderConfig = await getOptions(context,targetSpec, overrides);

        return runElectronBuilder(builderConfig, context)
    }

async function updateWebdriver() {
    // The webdriver-manager update command can only be accessed via a deep import.
    const webdriverDeepImport = 'webdriver-manager/built/lib/cmds/update';
    const importOptions = [
        // When using npm, webdriver is within protractor/node_modules.
        `protractor/node_modules/${webdriverDeepImport}`,
        // When using yarn, webdriver is found as a root module.
        webdriverDeepImport,
    ];

    let path;
    for (const importOption of importOptions) {
        try {
            path = require.resolve(importOption);
        } catch (error) {
            if (error.code !== 'MODULE_NOT_FOUND') {
                throw error;
            }
        }
    }

    if (!path) {
        throw new Error(tags.stripIndents`
      Cannot automatically find webdriver-manager to update.
      Update webdriver-manager manually and run 'ng e2e --no-webdriver-update' instead.
    `);
    }

    // tslint:disable-next-line:max-line-length no-implicit-dependencies
    const webdriverUpdate = await import(path) as typeof import ('webdriver-manager/built/lib/cmds/update');

    // run `webdriver-manager update --standalone false --gecko false --quiet`
    // if you change this, update the command comment in prev line
    return webdriverUpdate.program.run({
        standalone: false,
        gecko: false,
        quiet: true,
    } as unknown as JSON);
}


    function _runProtractor(root: Path, options: Partial<SpectronBuilderOptions>, context: BuilderContext): Observable<BuilderOutput> {


        return new Observable<BuilderOutput>(observer => {

            const buildEvent: BuilderOutput = {success: true};
            const executablePath = getSystemPath(resolve(normalize(context.workspaceRoot),normalize(options.electronExecutablePath)));
            let app = _createSpectronApplication(executablePath);


            app.start().then((app) => app.client.sessions())
                .then(sessions => {

                    const sessionId = sessions.value[0].id;

                    return new Promise((resolvePromise, reject) => {
                        try {
                            const ptorConfigParser = new ConfigParser();
                            ptorConfigParser.addFileConfig(getSystemPath(resolve(root, normalize(options.protractorConfig))));
                            const config = ptorConfigParser.getConfig();
                            config.seleniumSessionId = sessionId;
                            config.seleniumAddress= 'http://localhost:9515/wd/hub';
                            const ptorRunner = new Runner(config);
                            ptorRunner.run().then((code) => resolvePromise(code)).catch((error) => reject(error));

                        } catch (error) {
                            reject(error);
                        }
                    });

                })
                .then(code => {
                    return app.client.url('about:blank')
                        .then(() => app.stop()
                            .then(() => {
                                observer.next(buildEvent);
                                observer.complete();
                            })
                        );
                })
                .catch(error => {
                    app.client.url('about:blank')
                        .then(() => app.stop()
                            .then(() => {

                                console.error(error);
                                buildEvent.success = false;
                                observer.next(buildEvent);
                                observer.complete();
                            }));
                });
        });


    }

    function _createSpectronApplication(electronApplicationPath: string): any {
        let app = new Application({
            path:  electronApplicationPath,
            args: ['.']
        });
        return app;
    }



export default createBuilder<json.JsonObject & SpectronBuilderOptions>(run);
