import {
  BuildEvent,
  Builder,
  BuilderConfiguration,
  BuilderContext,
  BuilderDescription,
} from '@angular-devkit/architect';
import {Path, getSystemPath, normalize, resolve, tags, JsonObject, virtualFs} from '@angular-devkit/core';
import {Observable,  of} from 'rxjs';
import {concatMap, take, tap} from 'rxjs/operators';

import {ConfigParser} from 'protractor/built/configParser';
import {Runner} from 'protractor';
import {Application} from 'spectron';
import {BrowserBuilder, BrowserBuilderSchema, NormalizedBrowserBuilderSchema} from '@angular-devkit/build-angular';


export interface ProtractorBuilderOptions {
  protractorConfig: string;
  devServerTarget?: string;
  specs: string[];
  suite?: string;
  elementExplorer: boolean;
  webdriverUpdate: boolean;
  buildTarget: string;
}

export class ProtractorBuilder implements Builder<ProtractorBuilderOptions> {
  private _browserBuilder: BrowserBuilder;


  constructor(public context: BuilderContext) {
    this._browserBuilder = new BrowserBuilder(this.context);
  }

  run(builderConfig: BuilderConfiguration<Partial<ProtractorBuilderOptions>>): Observable<BuildEvent> {

    const options = builderConfig.options;
    const root = this.context.workspace.root;
    const projectRoot = resolve(root, builderConfig.root);
    // const projectSystemRoot = getSystemPath(projectRoot);

    // TODO: verify using of(null) to kickstart things is a pattern.
    return of(null).pipe(
      concatMap(() => this._startBuild(options, root, projectRoot)),
      concatMap(() => this._runProtractor(root, options)),
      take(1)
    );
  }




  private _runProtractor(root: Path, options: Partial<ProtractorBuilderOptions>): Observable<BuildEvent> {


    return new Observable<BuildEvent>(observer => {
      const additionalProtractorConfig: Partial<ProtractorBuilderOptions> = {};

      const buildEvent: BuildEvent = {success: true};


      let app = this._createSpectronApplication();


      app.start().then((app) => app.client.sessions())
        .then(sessions => {

          const sessionId = sessions.value[0].id;

          return new Promise((resolvePromise, reject) => {
            try {
              const ptorConfigParser = new ConfigParser();
              ptorConfigParser.addFileConfig(getSystemPath(resolve(root, normalize(options.protractorConfig))));
              const config = ptorConfigParser.getConfig();
              config.seleniumSessionId = sessionId;
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

  private _createSpectronApplication(): any {
    let app = new Application({
      path:  './node_modules/electron/dist/electron'+process.platform==="win32"? '.exe':'',
      args: ['.']
    });
    return app;
  }

  // Note: this method mutates the options argument.
  private _startBuild(options: Partial<ProtractorBuilderOptions>, root: Path, projectRoot: Path) : Observable<BuildEvent>{
    const architect = this.context.architect;
    const [project, targetName, configuration] = (options.buildTarget as string).split(':');


    const targetSpec = {project, target: targetName, configuration};
    const builderConfig: BuilderConfiguration<NormalizedBrowserBuilderSchema> = architect.getBuilderConfiguration<NormalizedBrowserBuilderSchema>(targetSpec);
    console.log(builderConfig);
    return new Observable<BuildEvent>(obs =>{
      architect.getBuilderDescription(builderConfig).toPromise()
        .then((description) => {
          console.log(description);
          const builder : BrowserBuilder = <BrowserBuilder>this.context.architect.getBuilder(description, this.context);
          console.log(builder);
          this._browserBuilder.run(builderConfig).subscribe(obs);
        },error => {
          this.context.logger.error(error);
          obs.error(error);
          obs.complete();
        });
    });

  }
}

export default ProtractorBuilder;
