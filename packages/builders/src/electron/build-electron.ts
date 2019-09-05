import * as yargs from 'yargs';
import { BuildElectronArgs } from './build-electron-args';

const builder = require('electron-builder');
const installAppDeps = require('electron-builder/out/cli/install-app-deps.js');

module.exports.build = function(args: BuildElectronArgs) {
  const platforms = args.platforms.split(',').map(platformName => builder.Platform.fromString(platformName));

  console.log(platforms);

  builder
    .build({
      targets: builder.createTargets(platforms),
      projectDir: args.projectDir
    })
    .then(() => {
      console.log('electron-builer completed successful.');
      process.exit(0);
    })
    .catch((error: any) => {
      console.error(`error invoking electron-builer: ${error}`);
      process.exit(1);
    });
};

module.exports.installAppDeps = function(args: any) {
  installAppDeps
    .installAppDeps(installAppDeps.configureInstallAppDepsCommand(yargs).argv)
    .then(() => {
      console.log('electron-builder installAppDeps completed successful.');
      process.exit(0);
    })
    .catch((error: any) => {
      console.error(`error invoking electron-builer installAppDeps: ${error}`);
      process.exit(1);
    });
};
