const { app, BrowserWindow, globalShortcut, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { exit } = require('process');
const net = require('net');

// app.commandLine.appendSwitch("disable-http-cache");
const static_dir = path.resolve('dist/build');
const config_dir = path.resolve('config');

// Keep a global reference of the mainWindowdow object, if you don't, the mainWindowdow will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow = null;
let subpy = null;

const PY_DIST_FOLDER = 'dist/api_server'; // python distributable folder
const PY_MODULE = 'api_server'; // the name of the main module

const getAvailablePort = () => {
  const srv = net.createServer((sock) => {
    sock.end();
  });
  srv.listen(0, () => {
    console.log(srv.address().port);
  });
  const port = srv.address().port;
  srv.close();
  return port;
};

const port = getAvailablePort();

const getPythonScriptPath = () => {
  if (process.platform === 'win32') {
    return path.join(PY_DIST_FOLDER, PY_MODULE + '.exe');
  }
  return path.join(PY_DIST_FOLDER, PY_MODULE);
};

const startPythonSubprocess = () => {
  const script = getPythonScriptPath();
  subpy = require('child_process').execFile(
    script,
    ['-p', port, '-s', static_dir, '-c', config_dir],
    (error, stdout, stderr) => {
      if (error) {
        dialog.showErrorBox('Python error', stderr);
        mainWindow.close();
      }
    },
  );
};

const killPythonSubprocesses = (main_pid) => {
  const python_script_name = path.basename(getPythonScriptPath());
  let cleanup_completed = false;
  const psTree = require('ps-tree');
  psTree(main_pid, function (err, children) {
    let python_pids = children
      .filter(function (el) {
        return el.COMMAND === python_script_name;
      })
      .map(function (p) {
        return p.PID;
      });
    // kill all the spawned python processes
    python_pids.forEach(function (pid) {
      process.kill(pid);
    });
    subpy = null;
    cleanup_completed = true;
  });
  return new Promise(function (resolve, reject) {
    (function waitForSubProcessCleanup() {
      if (cleanup_completed) return resolve();
      setTimeout(waitForSubProcessCleanup, 30);
    })();
  });
};

const createMainWindow = () => {
  const preload = path.join(__dirname, 'preload.js');
  console.log(preload);
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 720,
    resizeable: true,
    webPreferences: {
      devTools: false,
      nodeIntegration: false,
      contextIsolation: true,
      preload: preload,
    },
  });

  const url = `http://localhost:${port}/index.html`;
  console.log(url);
  mainWindow.loadURL(url);
  // mainWindow.webContents.openDevTools();
  mainWindow.on('closed', function () {
    // Dereference the mainWindow object
    mainWindow = null;
  });
};

function check_required_file(filepath) {
  if (!fs.existsSync(filepath)) {
    console.log(filepath, 'not found');
    dialog.showMessageBoxSync({
      type: 'error',
      message: filepath + ' not found',
    });
    exit(1);
  }
  return true;
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', function () {
  // start the backend server
  check_required_file(getPythonScriptPath());
  check_required_file(static_dir);
  check_required_file(config_dir);

  globalShortcut.register('Control+Shift+I', () => {
    mainWindow.toggleDevTools();
  });

  startPythonSubprocess();
  createMainWindow();
});

// disable menu
app.on('browser-window-created', function (e, window) {
  window.setMenu(null);
});

// Quit when all windows are closed.
app.on('window-all-closed', () => {
  // On macOS it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    let main_process_pid = process.pid;
    killPythonSubprocesses(main_process_pid).then(() => {
      app.quit();
    });
  }
});

app.on('activate', () => {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (subpy == null) {
    startPythonSubprocess();
  }
  if (mainWindow === null) {
    createMainWindow();
  }
});

app.on('quit', function () {
  // do some additional cleanup
});
