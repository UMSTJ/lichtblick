// SPDX-FileCopyrightText: Copyright (C) 2024-2025  UMS , Inc.
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { app, BrowserWindow, ipcMain, Menu, nativeTheme, session } from "electron";
import fs from "fs";
import path from "path";

import Logger from "@lichtblick/log";
import { AppSetting } from "@lichtblick/suite-base/src/AppSetting";
import { initI18n, sharedI18nObject as i18n } from "@lichtblick/suite-base/src/i18n";

import StudioAppUpdater from "./StudioAppUpdater";
import StudioWindow from "./StudioWindow";
import getDevModeIcon from "./getDevModeIcon";
import injectFilesToOpen from "./injectFilesToOpen";
import installChromeExtensions from "./installChromeExtensions";
import { parseCLIFlags } from "./parseCLIFlags";
import { resolveSourcePaths } from "./resolveSourcePaths";
import {
  registerRosPackageProtocolHandlers,
  registerRosPackageProtocolSchemes,
} from "./rosPackageResources";
import { getAppSetting } from "./settings";
import {
  LICHTBLICK_PRODUCT_HOMEPAGE,
  LICHTBLICK_PRODUCT_NAME,
  LICHTBLICK_PRODUCT_VERSION,
} from "../common/webpackDefines";

const log = Logger.getLogger(__filename);

// This overwrite needs to be done here, before the app is ready, otherwise it will not take effect
const homeOverride = process.argv.find((arg) => arg.startsWith("--home-dir="));
if (homeOverride != undefined) {
  app.setPath("home", homeOverride.split("=")[1]!);
}

/**
 * Determine whether an item in argv is a file that we should try opening as a data source.
 *
 * Note: in dev we launch electron with `electron .webpack` so we need to filter out things that are not files
 */
function isFileToOpen(arg: string) {
  // Anything that isn't a file or directory will throw, we filter those out too
  try {
    return fs.statSync(arg).isFile();
  } catch (err: unknown) {
    log.error(err);
    // ignore
  }
  return false;
}

function updateNativeColorScheme() {
  const colorScheme = getAppSetting<string>(AppSetting.COLOR_SCHEME) ?? "system";
  nativeTheme.themeSource =
    colorScheme === "dark" ? "dark" : colorScheme === "light" ? "light" : "system";
}

async function updateLanguage() {
  const language = getAppSetting<string>(AppSetting.LANGUAGE);
  log.info(`Loaded language from settings: ${language}`);
  await i18n.changeLanguage(language);
  log.info(`Set language: ${i18n.language}`);
}

export async function main(): Promise<void> {
  await initI18n({ context: "electron-main" });
  await updateLanguage();

  // Allow integration tests to override the userData directory
  const userDataOverride = process.argv.find((arg) => arg.startsWith("--user-data-dir="));
  if (userDataOverride != undefined) {
    app.setPath("userData", userDataOverride.split("=")[1]!);
  }

  // https://github.com/electron/electron/issues/28422#issuecomment-987504138
  app.commandLine.appendSwitch("enable-experimental-web-platform-features");

  // https://github.com/electron/electron/issues/46538#issuecomment-2808806722
  app.commandLine.appendSwitch("gtk-version", "3");

  const start = Date.now();
  log.info(`${LICHTBLICK_PRODUCT_NAME} ${LICHTBLICK_PRODUCT_VERSION}`);

  const isProduction = process.env.NODE_ENV === "production";

  if (!isProduction && (app as Partial<typeof app>).dock != undefined) {
    const devIcon = getDevModeIcon();
    if (app.dock && devIcon) {
      app.dock.setIcon(devIcon);
    }
  }

  // Suppress Electron Security Warning in development
  // See the comment for the webSecurity setting on browser window
  process.env["ELECTRON_DISABLE_SECURITY_WARNINGS"] = isProduction ? "false" : "true";

  // Handle creating/removing shortcuts on Windows when installing/uninstalling.

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  if (require("electron-squirrel-startup") as boolean) {
    app.quit();
    return;
  }

  // If another instance of the app is already open, this call triggers the "second-instance" event
  // in the original instance and returns false.
  if (!app.requestSingleInstanceLock()) {
    log.info(`Another instance of ${LICHTBLICK_PRODUCT_NAME} is already running. Quitting.`);
    app.quit();
    return;
  }

  // Forward urls/files opened in a second instance to our default handlers so it's as if we opened
  // them with this instance.
  app.on("second-instance", (_ev, argv, _workingDirectory) => {
    log.debug("Received arguments from second app instance:", argv);

    // Bring the app to the front
    const someWindow = BrowserWindow.getAllWindows()[0];
    someWindow?.restore();
    someWindow?.focus();

    const deepLinks = argv.slice(1).filter((arg) => arg.startsWith("lichtblick://"));
    for (const link of deepLinks) {
      app.emit("open-url", { preventDefault() {} }, link);
    }

    const files = argv
      .slice(1)
      .filter((arg) => !arg.startsWith("--")) // Filter out flags
      .filter((arg) => isFileToOpen(arg));
    for (const file of files) {
      app.emit("open-file", { preventDefault() {} }, file);
    }

    // When being asked to open a second instance with no files or deep links then open a blank new
    // window.
    if (files.length === 0 && deepLinks.length === 0) {
      log.debug("second-instance: No files or deeplinks. Opening a new window.");
      new StudioWindow().load();
    }
  });

  if (!app.isDefaultProtocolClient("foxglove")) {
    if (!app.setAsDefaultProtocolClient("foxglove")) {
      log.warn("Could not set app as handler for lichtblick://");
    }
  }
  // Get the command line flags passed to the app when it was launched
  const parsedCLIFlags = parseCLIFlags(process.argv);

  const filesToOpen: string[] = process.argv
    .slice(1)
    .filter((arg) => !arg.startsWith("--")) // Filter out flags
    .map((filePath) => path.resolve(filePath)) // Convert to absolute path, linux has some problems to resolve relative paths
    .filter(isFileToOpen);

  // Get file paths passed through the parameter "--source="
  const filesToOpenFromSourceParameter = resolveSourcePaths(parsedCLIFlags.source);

  filesToOpen.push(...filesToOpenFromSourceParameter);

  const uniqueFilesToOpen = [...new Set(filesToOpen)];

  const verifiedFilesToOpen: string[] = uniqueFilesToOpen.filter(isFileToOpen);

  // indicates the preloader has setup the file input used to inject which files to open
  let preloaderFileInputIsReady = false;

  // This handles user dropping files on the dock icon or double clicking a file when the app
  // is already open.
  //
  // The open-file handler registered earlier will handle adding the file to filesToOpen
  app.on("open-file", async (_ev, filePath) => {
    log.debug("open-file handler", filePath);
    verifiedFilesToOpen.push(filePath);

    if (preloaderFileInputIsReady) {
      const focusedWindow = BrowserWindow.getFocusedWindow();
      if (focusedWindow) {
        await injectFilesToOpen(focusedWindow.webContents.debugger, verifiedFilesToOpen);
      } else {
        // On MacOS the user may have closed all the windows so we need to open a new window
        new StudioWindow().load();
      }
    }
  });

  // preload will tell us when it is ready to process the pending open file requests
  // It is important this handler is registered before any windows open because preload will call
  // this handler to get the files we were told to open on startup
  ipcMain.handle("load-pending-files", async (ev) => {
    log.debug("load-pending-files");
    const debug = ev.sender.debugger;
    await injectFilesToOpen(debug, verifiedFilesToOpen);
    preloaderFileInputIsReady = true;
  });

  ipcMain.handle("setRepresentedFilename", (ev, filePath: string | undefined) => {
    const browserWindow = BrowserWindow.fromId(ev.sender.id);
    browserWindow?.setRepresentedFilename(filePath ?? "");
  });

  const openUrls: string[] = [];

  // works on osx - even when app is closed
  // tho it is a bit strange since it isn't clear when this runs...
  app.on("open-url", (ev, url) => {
    log.debug("open-url handler", url);
    if (!url.startsWith("lichtblick://")) {
      return;
    }

    ev.preventDefault();

    if (url.startsWith("lichtblick://signin-complete")) {
      // When completing sign in from Console, the browser can launch this URL to re-focus the app.
      app.focus({ steal: true });
    } else if (app.isReady()) {
      new StudioWindow([url]).load();
    } else {
      openUrls.push(url);
    }
  });

  // support preload lookups for the user data path and home directory
  ipcMain.handle("getUserDataPath", () => app.getPath("userData"));
  ipcMain.handle("getHomePath", () => app.getPath("home"));

  ipcMain.handle("getCLIFlags", () => parsedCLIFlags);

  // Must be called before app.ready event
  registerRosPackageProtocolSchemes();

  ipcMain.handle("updateNativeColorScheme", () => {
    updateNativeColorScheme();
  });

  ipcMain.handle("updateLanguage", () => {
    void updateLanguage();
  });

  // This method will be called when Electron has finished
  // initialization and is ready to create browser windows.
  // Some APIs can only be used after this event occurs.
  app.on("ready", async () => {
    updateNativeColorScheme();
    const argv = process.argv;
    const deepLinks = argv.filter((arg) => arg.startsWith("lichtblick://"));

    // create the initial window now to display to the user immediately
    // loading the app url happens at the end of ready to ensure we've setup all the handlers, settings, etc
    log.debug(`Elapsed (ms) until new StudioWindow: ${Date.now() - start}`);
    const initialWindow = new StudioWindow([...deepLinks, ...openUrls]);

    registerRosPackageProtocolHandlers();

    // Only production builds check for automatic updates
    if (process.env.NODE_ENV !== "production") {
      log.info("Automatic updates disabled (development environment)");
    } else if (/-(dev|nightly)/.test(LICHTBLICK_PRODUCT_VERSION)) {
      log.info("Automatic updates disabled (development version)");
    }

    StudioAppUpdater.Instance().start();

    app.setAboutPanelOptions({
      applicationName: LICHTBLICK_PRODUCT_NAME,
      applicationVersion: LICHTBLICK_PRODUCT_VERSION,
      version: process.platform,
      copyright: undefined,
      website: LICHTBLICK_PRODUCT_HOMEPAGE,
      iconPath: undefined,
    });

    if (!isProduction) {
      await installChromeExtensions();
    }

    // Content Security Policy
    // See: https://www.electronjs.org/docs/tutorial/security
    const contentSecurityPolicy: Record<string, string> = {
      "default-src": "'self'",
      "script-src": `'self' 'unsafe-inline' 'unsafe-eval'`,
      "worker-src": `'self' blob:`,
      "style-src": "'self' 'unsafe-inline'",
      "connect-src": "'self' ws: wss: http: https: package: blob: data: file:",
      "font-src": "'self' data:",
      // Include http in the CSP to allow loading images (i.e. map tiles) from http endpoints like localhost
      //"img-src": "'self' data: https: package: x-foxglove-converted-tiff: http:",
      "img-src": "'self' data: https: package: x-foxglove-converted-tiff: blob:",
      "media-src": "'self' data: https: http: blob: file:",
    };
    const cspHeader = Object.entries(contentSecurityPolicy)
      .map(([key, val]) => `${key} ${val}`)
      .join("; ");

    // Set default http headers
    session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
      const url = new URL(details.url);
      const responseHeaders = { ...details.responseHeaders };

      // don't set CSP for internal URLs
      if (!["chrome-extension:", "devtools:", "data:"].includes(url.protocol)) {
        responseHeaders["Content-Security-Policy"] = [cspHeader];
      }

      callback({ responseHeaders });
    });

    // When we change the focused window we switch the app menu so actions go to the correct window
    app.on("browser-window-focus", (_ev, browserWindow) => {
      const studioWindow = StudioWindow.fromWebContentsId(browserWindow.webContents.id);
      if (studioWindow) {
        Menu.setApplicationMenu(studioWindow.getMenu());
      }
    });

    // This event handler must be added after the "ready" event fires
    // (see https://github.com/electron/electron-quick-start/pull/382)
    app.on("activate", () => {
      // On macOS it's common to re-create a window in the app when the
      // dock icon is clicked and there are no other windows open.
      if (BrowserWindow.getAllWindows().length === 0) {
        new StudioWindow().load();
      }
    });

    initialWindow.load();
    Menu.setApplicationMenu(initialWindow.getMenu()); // When the app is launching for the first time we don't receive the browser-window-focus event.
  });

  ipcMain.on("file-save", (event, { directory, filename, data }) => {
    const filePath = path.join(directory, filename);
    // 1. 先确保目录存在
    fs.mkdir(directory, { recursive: true }, (err) => {
      if (err) {
        err.message = `Failed to create directory: ${filePath}`;
        event.reply("file-save-response", {
          success: false,
          error: `Failed to create directory: ${err.message}`,
        });
        return;
      }
    });
    // 2. 目录存在后写入文件
    fs.writeFile(filePath, data, (err) => {
      if (err) {
        err.message = `Failed to write file: ${filePath}`;
        event.reply("file-save-response", {
          success: false,
          error: `Failed to write file: ${err.message}`,
        });
      } else {
        event.reply("file-save-response", { success: true });
      }
    });
  });
  ipcMain.on("file-read", (event, { directory, filename }) => {
    const filePath = path.join(directory, filename);
    fs.readFile(filePath, (err, data) => {
      if (err) {
        event.reply("file-read-response", { success: false, error: err.message });
      } else {
        event.reply("file-read-response", { success: true, data });
      }
    });
  });

  ipcMain.on("file-list", (event, { directory }) => {
    fs.readdir(directory, (err, files) => {
      if (err) {
        event.reply("file-list-response", { success: false, error: err.message });
      } else {
        event.reply("file-list-response", { success: true, files });
      }
    });
  });

  ipcMain.on("file-delete", (event, { directory, filename }) => {
    const filePath = path.join(directory, filename);
    fs.unlink(filePath, (err) => {
      if (err) {
        event.reply("file-delete-response", { success: false, error: err.message });
      } else {
        event.reply("file-delete-response", { success: true });
      }
    });
  });

  ipcMain.on("file-exists", (event, { directory, filename }) => {
    const filePath = path.join(directory, filename);
    fs.access(filePath, fs.constants.F_OK, (err) => {
      if (err) {
        event.reply("file-exists-response", { success: false });
      } else {
        event.reply("file-exists-response", { success: true });
      }
    });
  });

  ipcMain.on("file-stats", (event, { directory, filename }) => {
    const filePath = path.join(directory, filename);
    fs.stat(filePath, (err, stats) => {
      if (err) {
        event.reply("file-stats-response", { success: false, error: err.message });
      } else {
        event.reply("file-stats-response", { success: true, stats });
      }
    });
  });

  // Quit when all windows are closed, except on macOS. There, it's common
  // for applications and their menu bar to stay active until the user quits
  // explicitly with Cmd + Q.
  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
      app.quit();
    }
  });
}
