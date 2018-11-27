"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
let builder = require('electron-builder');
module.exports.build = function (args) {
    let platforms = args.platforms.split(',')
        .map(platformName => builder.Platform.fromString(platformName));
    console.log(platforms);
    builder.build({
        targets: builder.createTargets(platforms),
        projectDir: args.projectDir
    })
        .then(() => {
        console.log('electron-builer completed successful.');
        process.exit(0);
    }).catch((error) => {
        console.error(`error invoking electron-builer: ${error}`);
        process.exit(1);
    });
};
//# sourceMappingURL=build-electron.js.map