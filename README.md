# ng-electron-devkit

[![License: MPL 2.0](https://img.shields.io/badge/License-MPL%202.0-brightgreen.svg)](https://opensource.org/licenses/MPL-2.0)
[![Build Status](https://travis-ci.com/nekator/ng-electron-devkit.svg?branch=master)](https://travis-ci.com/nekator/ng-electron-devkit)
[![Build status](https://ci.appveyor.com/api/projects/status/fudi26k6j15pmejt/branch/master?svg=true)](https://ci.appveyor.com/project/nekator/ng-electron-devkit/branch/master)
[![Dependabot Status](https://api.dependabot.com/badges/status?host=github&repo=nekator/ng-electron-devkit)](https://dependabot.com)
[![Maintainability](https://api.codeclimate.com/v1/badges/001c246521acbe9b0ea9/maintainability)](https://codeclimate.com/github/nekator/ng-electron-devkit/maintainability)
ng-electron-devkit is a collection of angular-cli tools to make developing an angular application for electron easier.

## Installation

npm:
```bash
npm i -d @ng-electron-devkit/builders
```
yarn:
```bash
yarn add --dev @ng-electron-devkit/builders
```

## Usage

* Modifiy your angular.json like this:

```js
{
  ...
  "projects": {
    "<projectName>": {
      ...
      "architect": {
        "build": {
          "builder": "@ng-electron-devkit/builders:electron",
          "options": {
          ...
            // path to tsconfig which should be use to
            // compile the code for the electron main thread
            "electronTSConfig": "<path-to-tsconfig.json>",
            // must be relative to root configured for this
            // project. eg. src/electron
            // the source code for the electron main thread
            // must be in this directory
            "electronProjectDir": "<path-to-electron-source-code>",
            // targets for the electron-build
            // can be comma seperated to multiple targets
            "electronPlatforms": "<win|mac|linux>",
          ...
          },
          ...
        },
        // THIS CURRENTLY ONLY WORKS IF THE ELECTRON APPLICATION
        // HANDLES THE --serve ARGUMENT TO LOAD THE
        // ANGULAR APP FROM THE DEV-SERVER (http://localhost:4200)
       "serve": {
          "builder": "@ng-electron-devkit/builders:dev-server",
          "options": {
            "browserTarget": "<projectName>:build"
          },
      }
    }
  }
  ...
}
```
* create a directory where the electron source code is located

```bash
<projectName>
├── angular.json
├── src
...
│   ├── electron
│   │   ├── electron-builder.json <- config for electron-build
│   │   ├── index.ts <- electron main file
│   │   ├── package.json <- second package.json for electron-builder
│   │   ├── tsconfig.json <- optional: tsconfig for electron main
...    
```
You can find these file in the [sample](sample) project.

## Configuration

All configuration for the [electron-builder](https://www.electron.build/configuration/configuration) is located in the electron-builder.json
To seperate the production dependencies for electron from the angular app dependencies
this project uses the [two package.json structure](https://www.electron.build/configuration/configuration) from electron-builder.
The second package.json also contains the main file for electron and metadata for the electron application (e.g. Name, Author, Description...)


## TODO

- [ ] schematics for initial project setup (ng generate electron-application)
- [ ] livereload for electron code (dev-serve)
- [ ] E2E Testing with Spectron

## Contributing
Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

Please make sure to update tests as appropriate.
