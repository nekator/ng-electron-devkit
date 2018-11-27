import {BrowserBuilderSchema} from "@angular-devkit/build-angular";


export interface ElectronBuilderSchema extends BrowserBuilderSchema{
    electronTSConfig: string,
    electronPlatforms: string,
    electronProjectDir: string
}