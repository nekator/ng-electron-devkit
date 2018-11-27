#!/usr/bin/env bash

rm -rf ./sample/node_modules/@ng-electron-devkit
mkdir ./sample/node_modules/@ng-electron-devkit
cp -r ./packages/builders ./sample/node_modules/@ng-electron-devkit/
