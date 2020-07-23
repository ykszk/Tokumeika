# Create executable using Electron

## 1. Build python api server
In `api` directory.
```sh
pyinstaller -y api_server.spec
```
`dist` directory is created.

## 2. Build react
In the root directory
```sh
yarn build
```
`build` directory is created.

## 3. Build electron
In `electron` directory
```sh
electron-packager . tokumeika-manager --platform=win32 arch=x64 --electron-version=v9.1.1 --overwrite
```

## 4. Place files
Place files as follows
```
app-dir
 - dist/api_server/api_server.exe ...
 - dist/build/index.html ...
 - config/config.toml ...
```