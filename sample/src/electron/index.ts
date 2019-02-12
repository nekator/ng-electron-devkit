import {app, BrowserWindow, ipcMain, dialog} from 'electron';

if (process.mas) { app.setName('Angular 6 / Electron Demo'); }

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow: BrowserWindow;

const args = process.argv.slice(1);

const serve = args.some(val => val === '--serve');

const argsPromise = Promise.resolve(args);

function createWindow () {
  // Create the browser window.
  mainWindow = new BrowserWindow({width: 800, height: 800});

  if (serve) {
    mainWindow.loadURL('http://localhost:4200');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile('index.html');
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow);

// Quit when all windows are closed.
app.on('window-all-closed', () => {
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  console.log('activated');
  if (mainWindow === null) {
    createWindow();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
ipcMain.on('asynchronous-message', (event, arg) => {
  event.sender.send('asynchronous-reply', `pong-${Math.round(Math.random() * 10000)}`);
});
