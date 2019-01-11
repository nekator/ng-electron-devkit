import {
    BuildEvent,
    Builder,
    BuilderConfiguration,
    BuilderContext,
    BuilderDescription,
} from '@angular-devkit/architect';
import { Path, getSystemPath, normalize, resolve, tags } from '@angular-devkit/core';
import { Observable, from, of } from 'rxjs';
import { concatMap, take, tap } from 'rxjs/operators';
import {requireProjectModule} from "@angular-devkit/build-angular/src/angular-cli-files/utilities/require-project-module";
import {SpectronBuilderOptions} from "./schema";
import {ElectronBuilderSchema} from "../electron/schema";
import {ConfigParser} from "protractor/built/configParser";
import {Runner} from "protractor";
import {Application} from "spectron";
import * as fs from "fs";




export class ProtractorBuilder implements Builder<SpectronBuilderOptions> {

    constructor(public context: BuilderContext) { }

    run(builderConfig: BuilderConfiguration<SpectronBuilderOptions>): Observable<BuildEvent> {

        const options = builderConfig.options;
        const root = this.context.workspace.root;
        const projectRoot = resolve(root, builderConfig.root);
        // const projectSystemRoot = getSystemPath(projectRoot);

        // TODO: verify using of(null) to kickstart things is a pattern.
        return of(null).pipe(
            concatMap(() => options.electronBuilderTarget ? this._startDevServer(options) : of(null)),
            concatMap(() => options.webdriverUpdate ? this._updateWebdriver(projectRoot) : of(null)),
            concatMap(() => this._runProtractor(root, options)),
            take(1),
        );
    }

    // Note: this method mutates the options argument.
    private _startDevServer(options: SpectronBuilderOptions) {
        const architect = this.context.architect;
        const [project, targetName, configuration] = (options.electronBuilderTarget as string).split(':');
        // Override dev server watch setting.
        const overrides: Partial<ElectronBuilderSchema> = { watch: false };
        // Also override the port and host if they are defined in protractor options.
        const targetSpec = { project, target: targetName, configuration, overrides };
        const builderConfig = architect.getBuilderConfiguration<ElectronBuilderSchema>(targetSpec);
        let electronDescription: BuilderDescription;

        return architect.getBuilderDescription(builderConfig).pipe(
            tap(description => electronDescription = description),
            concatMap(electronDescription => architect.validateBuilderOptions(
                builderConfig, electronDescription)),
            concatMap(() => {
                // Compute baseUrl from devServerOptions.

                return of(this.context.architect.getBuilder(electronDescription, this.context));
            }),
            concatMap(builder => builder.run(builderConfig)),
        );
    }

    private _updateWebdriver(projectRoot: Path) {
        // The webdriver-manager update command can only be accessed via a deep import.
        const webdriverDeepImport = 'webdriver-manager/built/lib/cmds/update';
        let webdriverUpdate: any; // tslint:disable-line:no-any

        try {
            // When using npm, webdriver is within protractor/node_modules.
            webdriverUpdate = requireProjectModule(getSystemPath(projectRoot),
                `protractor/node_modules/${webdriverDeepImport}`);
        } catch {
            try {
                // When using yarn, webdriver is found as a root module.
                webdriverUpdate = requireProjectModule(getSystemPath(projectRoot), webdriverDeepImport);
            } catch {
                throw new Error(tags.stripIndents`
          Cannot automatically find webdriver-manager to update.
          Update webdriver-manager manually and run 'ng e2e --no-webdriver-update' instead.
        `);
            }
        }

        // run `webdriver-manager update --standalone false --gecko false --quiet`
        // if you change this, update the command comment in prev line, and in `eject` task
        return from(webdriverUpdate.program.run({
            standalone: false,
            gecko: false,
            quiet: true,
        }));
    }


    private _runProtractor(root: Path, options: Partial<SpectronBuilderOptions>): Observable<BuildEvent> {


        return new Observable<BuildEvent>(observer => {

            const buildEvent: BuildEvent = {success: true};
            const executablePath = getSystemPath(resolve(this.context.workspace.root,normalize(options.electronExecutablePath)));
            let app = this._createSpectronApplication(executablePath);


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


    };

    private _createSpectronApplication(electronApplicationPath: string): any {
        let app = new Application({
            path:  electronApplicationPath,
            args: ['.']
        });
        return app;
    }

}

export default ProtractorBuilder;
