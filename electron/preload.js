const { contextBridge, ipcRenderer } = require("electron");
const dialog = require('electron').remote.dialog

console.log(dialog)
console.log('preload loaded!!')
contextBridge.exposeInMainWorld(
    "electron", {
    openDirectoryDialog: (handler) => {
        dialog.showOpenDialog(
            {
                properties: ['openDirectory'],
            }).then(result => {
                handler(result.filePaths)
            }
            )
    }
}
);