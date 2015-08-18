// TODO This should be updated
module.exports = function menu (app, mainWindow) {
  var darwinMenu = [
    {
      label: "GitHub",
      submenu: [
        {
          label: "About GitHub",
          selector: "orderFrontStandardAboutPanel:"
        },
        {
          type: "separator"
        },
        {
          label: "Preferences...",
          accelerator: "Command+,",
        },
        {
          label: "Check for updates..."
        },
        {
          type: "separator"
        },
        {
          label: "Hide GitHub",
          accelerator: "Command+H",
          selector: "hide:"
        },
        {
          label: "Hide Others",
          accelerator: "Command+Shift+H",
          selector: "hideOtherApplications:"
        },
        {
          label: "Show All",
          selector: "unhideAllApplications:"
        },
        {
          type: "separator"
        },
        {
          label: "Quit",
          accelerator: "Command+Q",
          click: function () { app.quit() }
        }
      ]
    },
    {
      label: "File",
      submenu: [
        {
          label: "New repository",
          accelerator: "Command+N"
        },
        {
          label: "New branch",
          accelerator: "Shift+Command+N"
        },
        {
          label: "New window",
          accelerator: "Alt+Command+N"
        },
        {
          type: "separator"
        },
        {
          label: "Clone repository",
          accelerator: "Command+O"
        },
        {
          label: "Add local repository",
          accelerator: "Command+O"
        },
        {
          label: "Reload repositories",
          accelerator: "Command+O"
        },
        {
          label: "Close",
          accelerator: "Command+W"
        }
      ]
    },
    {
      label: "Edit",
      submenu: [
        {
          label: "Undo",
          accelerator: "Command+Z",
          selector: "undo:"
        },
        {
          label: "Redo",
          accelerator: "Shift+Command+Z",
          selector: "redo:"
        },
        {
          type: "separator"
        },
        {
          label: "Cut",
          accelerator: "Command+X",
          selector: "cut:"
        },
        {
          label: "Copy",
          accelerator: "Command+C",
          selector: "copy:"
        },
        {
          label: "Paste",
          accelerator: "Command+V",
          selector: "paste:"
        },
        {
          label: "Select All",
          accelerator: "Command+A",
          selector: "selectAll:"
        },
        {
          label: "Toggle all files",
          accelerator: "Shift+Command+T"
        },
        {
          type: "separator"
        },
        {
          label: "Automatically sync after committing"
        }
      ]
    },
    {
      label: "View",
      submenu: [
        {
          label: "Changes",
          accelerator: "Command+1"
        },
        {
          label: "History",
          accelerator: "Command+2"
        },
        {
          label: "Branches",
          accelerator: "Command+3"
        },
        {
            type: "separator"
        },
        {
          label: "Go to commit message",
          accelerator: "Shift+Command+C"
        },
        {
          label: "Go to changed files",
          accelerator: "Command+Command+1"
        },
        {
          label: "Go to unsynced commits",
          accelerator: "Command+Command+2"
        },
        {
            type: "separator"
        },
        {
          label: "Hide repository list",
          accelerator: "Shift+Command+R"
        },
        {
          label: "Go to filter repositories",
          accelerator: "Shift+Command+O"
        }
      ]
    },
    {
      label: "Development",
      submenu: [
        {
          label: "Reload",
          accelerator: "Command+R",
          click: function () { mainWindow.restart() }
        },
        {
          label: "Toggle Full Screen",
          accelerator: "Ctrl+Command+F",
          click: function () { mainWindow.setFullScreen(!mainWindow.isFullScreen()) }
        },
        {
          label: "Toggle Developer Tools",
          accelerator: "Alt+Command+I",
          click: function () { mainWindow.toggleDevTools() }
        }
      ]
    },
    {
      label: "Window",
      submenu: [
        {
          label: "Minimize",
          accelerator: "Command+M",
          selector: "performMiniaturize:"
        },
        {
          label: "Close",
          accelerator: "Command+W",
          selector: "performClose:"
        },
        {
          type: "separator"
        },
        {
          label: "Bring All to Front",
          selector: "arrangeInFront:"
        }
      ]
    },
    {
      label: "Help",
      submenu: [
        {
          label: "Repository",
          click: function () { require("shell").openExternal("http://github.com/IonicaBizau/github-electron") }
        }
      ]
    }
  ];
  return darwinMenu;
};
