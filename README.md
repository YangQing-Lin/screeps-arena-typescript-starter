# Screeps Arena Typescript Starter

## 项目运行方式

安装 Node.js

脚本选择：[https://nodejs.org/en/download/package-manager](https://nodejs.org/en/download/package-manager)

```bash
# installs fnm (Fast Node Manager)
winget install Schniz.fnm

# configure fnm environment
# 之后每次关闭终端都需要重新执行这一行
fnm env --use-on-cd | Out-String | Invoke-Expression

# download and install Node.js
fnm use --install-if-missing 20

# verifies the right Node.js version is in the environment
node -v # should print `v20.18.0`

# verifies the right npm version is in the environment
npm -v # should print `10.8.2`
```

切换 npm 源：

参考：[https://cloud.tencent.com/developer/article/1372949](https://cloud.tencent.com/developer/article/1372949)

执行安装：

```bash
# 切换腾讯源
npm config set registry http://mirrors.cloud.tencent.com/npm/
npm config get registry

# npm
npm install

# 或者使用 yarn
npm install --global yarn
yarn
```

将 TS 文件编译为 JS

```bash
npm run build
```

安装 yarn 遇到报错：

`yarn : 无法加载文件 D:\devtool\node\node_global\yarn.ps1，因为在此系统上禁止运行脚本。有关详细信息，请参阅 https:/go.microsoft.com/fwlink/?LinkID=135170 中的 about_Execution_Policies。`

解决方法：

- 打开 powershell，以管理员身份打开
- set-ExecutionPolicy RemoteSigned，选择 Y
- get-ExecutionPolicy 查看是否为 RemoteSigned

清理 npm 缓存的命令：

```bash
npm cache clean --force
```

## 快速升级老旧的依赖：

要快速升级老版本的包，可以使用以下方法：

### 使用 `npm-check-updates` 工具

1. **全局安装 `npm-check-updates`**：

   ```bash
   npm install -g npm-check-updates
   ```

2. **查看可更新的依赖**：

   ```bash
   ncu
   ```

3. **升级所有依赖**：

   ```bash
   ncu -u
   ```

4. **重新安装依赖**：

   ```bash
   npm install
   ```

### 手动更新

1. **检查每个包的最新版本**：

   在 `package.json` 中手动更新版本号，或者使用 `npm info <package-name>` 查看最新版本。

2. **更新特定包**：

   ```bash
   npm install <package-name>@latest
   ```

### 使用 `yarn` 升级

如果使用 `yarn`，可以：

1. **列出可更新的包**：

   ```bash
   yarn outdated
   ```

2. **升级所有包**：

   ```bash
   yarn upgrade
   ```

### 其他建议

- **注意兼容性**：确保新版本与项目兼容。
- **测试**：升级后运行测试，确保项目正常运行。

通过这些方法，你可以快速升级项目中的老版本包。

## This repo is a WIP starter template for the current Closed Alpha of [Screeps Arena](https://store.steampowered.com/app/1137320/Screeps_Arena/)

## Screeps Arena is a new game _under active development_, this repo is unoffcial and maintained by the screepers community

### Any issues you experience with this repo should be created as an issue in this repo, _the Screeps Arena devs should NOT be contacted!_

---

TODO:

- [ ] A way to push code to a specific arena `npm run push alpha-capture-the-flag`
  - Will probably be a copy of files to the correct location, depending on what location has been choosen in the arena client.
  - If we can't detect the locations, we will probably need a `screeps-arena.json` file where people can set up their desired output destinations

Current Issues:
None

---

# Screeps Arena Typescript Starter

Screeps Arena Typescript Starter is a starting point for a Screeps Arena AI written in Typescript. It provides everything you need to start writing your AI whilst leaving `main.ts` as empty as possible.

The initial example code from the steam forum is included in `src/alpha-capture_the_flag/main.ts`

## Basic Usage

You will need:

- [Node.JS](https://nodejs.org/en/download) (10.x || 12.x)
- A Package Manager ([Yarn](https://yarnpkg.com/en/docs/getting-started) or [npm](https://docs.npmjs.com/getting-started/installing-node))
- Rollup CLI (Optional, install via `npm install -g rollup`)

Open the folder in your terminal and run your package manager to install the required packages and TypeScript declaration files:

```bash
# npm
npm install

# yarn
yarn
```

Fire up your preferred editor with typescript installed and you are good to go!

- arenas are located in `src/arena_*`any folder you create in `src` with a name starting with `arena_` will result in a `main.mjs` in the `dist/arena_*` folder.
- Run `npm run build` to generate all arenas to `/dist/*`
- `npm run build` - everything is build, the player can change their arena to look at the specific `/dist/arena*` directory

  - this template produces the following as an example `/dist/alpha_capture_the_flag/main.mjs`

- `npm run build capture` - a specific arena is build, the player can change their arena to look at the specific `/dist/arena*` directory knowing only that arena was updated
- Copy the `main.mjs` file to your desired location or change the location in the Screeps Arena client to point to the desired `/dist/*` folder.

~~- `npm run push` builds all arenas, then pushes all arenas to their respective folders where the client is pointed at.~~
~~- `npm run push capture` builds the specific arena, then pushes the capture arena to their respective folders where the client is pointed at.~~

## Typings

It uses the following project for typings https://github.com/screepers/typed-screeps-arena
When the typings are updated and you need to get the newest types

- delete node_modules/@types/screeps-arena
- run `npm i` to reinstall the packages. You might need to delete package-lock.json to get the types.

## Contributing

Issues, Pull Requests, and contribution to the docs are welcome! See our [Contributing Guidelines](CONTRIBUTING.md) for more details.
