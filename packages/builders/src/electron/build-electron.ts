import {BuildElectronArgs} from "./build-electron-args";

let builder = require('electron-builder');

module.exports.build = function (args: BuildElectronArgs) {

    let platforms = args.platforms.split(',')
        .map(platformName => builder.Platform.fromString(platformName));

    console.log(platforms);

    builder.build({
        targets: builder.createTargets(platforms),
        projectDir: args.projectDir
    })
        .then(() => {
            console.log('electron-builer completed successful.');
            process.exit(0)
        }).catch((error: any) => {
        console.error(`error invoking electron-builer: ${error}`);
        process.exit(1)
    })
};
