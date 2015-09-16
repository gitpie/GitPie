var
  // Load native UI library
  GUI = require('nw.gui'),

  // browser window object
  WIN = GUI.Window.get(),

  // Module to discover the git repository name
  GIT_REPO_NAME = require('./node_modules/git-repo-name'),

  // Git class that perfoms git commands
  GIT = require('./app/core/git'),

  // Updater module for GitPie
  UpdaterModule = require('./app/core/updater'),

  // Updater instance
  updater = new UpdaterModule(),

  // Locale language
  LANG = window.navigator.userLanguage || window.navigator.language,

  // Messages and labels of the application
  MSGS;

WIN.focus();

/**
 * Show error message on uncaughtException
 */
process.on('uncaughtException', function(err) {
  alert(err);
});

/* Get the locale language */
try {
  MSGS = require('./language/'.concat(LANG).concat('.json'));
} catch (err){
  MSGS = require('./language/en.json');
}

// Open devTools for debug
window.addEventListener('keydown', function (e) {

  if (e.shiftKey && e.ctrlKey && e.keyCode == 68) {

      if (WIN.isDevToolsOpen()) {
        WIN.closeDevTools();
      } else {
        WIN.showDevTools();
      }
  }
});

/* AngularJS app init */
(function () {
  var app = angular.module('gitpie', ['components', 'attributes', 'header', 'content']);

  app.factory('CommomService', function ($rootScope) {
    var repositoriesStr = localStorage.getItem('repos'),

      repositories = JSON.parse(repositoriesStr) || {},

      findWhere = function (array, object) {

        for (var i = 0; i < array.length; i++) {

          if (array[i][Object.keys(object)[0]] == object[Object.keys(object)[0]]) {
            return array[i];
          }
        }

        return null;
      },

      saveRepository = function (repository) {
        var storagedRepositories = JSON.parse(repositoriesStr) || {};

        storagedRepositories.github = storagedRepositories.github || [];
        storagedRepositories.bitbucket = storagedRepositories.bitbucket || [];
        storagedRepositories.others = storagedRepositories.others || [];

        switch (repository.type) {
          case 'GITHUB':
            storagedRepositories.github.push(repository);
            break;

          case 'BITBUCKET':
            storagedRepositories.bitbucket.push(repository);
            break;

          default:
            storagedRepositories.others.push(repository);
            break;
        }

        localStorage.setItem('repos', JSON.stringify(storagedRepositories));
        repositoriesStr = JSON.stringify(storagedRepositories);
      };

    repositories.github = repositories.github || [];
    repositories.bitbucket = repositories.bitbucket || [];
    repositories.others = repositories.others || [];

    if (repositories.github.length > 0 || repositories.bitbucket.length > 0 || repositories.others.length > 0) {
      repositories.isEmpty = false;
    } else {
      repositories.isEmpty = true;
    }

    // Set the application messages globally
    $rootScope.MSGS = MSGS;

    /* Verify if there's a available update */
    updater.on('availableUpdate', function (remotePackJson) {
      console.log('[INFO] There is a available update. New version '.concat(remotePackJson.version));

      updater.update();
    });

    updater.on('downloadingfiles', function () {
      console.log('[INFO] Downloading files...');
    });

    updater.on('installing', function () {
      console.log('[INFO] Installing changes');
    });

    updater.on('updated', function () {
      console.log('[SUCCES] Your GitPie is up to date');

      var restart = function() {
        var child,

        child_process = require("child_process"),
        gui = require('nw.gui'),
        win = gui.Window.get();

        if (process.platform == "darwin")  {
          child = child_process.spawn("open", ["-n", "-a", process.execPath.match(/^([^\0]+?\.app)\//)[1]], {detached:true});
        } else {
          child = child_process.spawn(process.execPath, [], {detached: true});
        }

        child.unref();
        win.hide();
        gui.App.quit();
      };

      restart();
    });

    updater.on('error', function (err) {
      console.error('[ERROR] Error updating GitPie. Error: ', err);

      alert('Error updating GitPie. Error: ' + err.message);
    });

    updater.checkAvailableUpdate();

    return {

      addRepository: function (repositoryPath, callback) {

        if (repositoryPath) {

          // Easter egg :D
          if (repositoryPath.toLowerCase() === $rootScope.MSGS['i have no idea']) {
            alert($rootScope.MSGS['It happends with me all the time too. But lets\'s try find your project again!']);

          } else {
            var name = GIT_REPO_NAME(repositoryPath),
              type,
              index,
              repositoryExists,
              repository;

            if (name) {

              GIT.listRemotes(repositoryPath, function (err, stdout) {

                if (stdout.toLowerCase().indexOf('github.com') != -1) {
                  repositoryExists = findWhere(repositories.github, { path: repositoryPath});
                  type = 'github';

                } else if (stdout.toLowerCase().indexOf('bitbucket.org') != -1) {
                  repositoryExists = findWhere(repositories.bitbucket, { path: repositoryPath});
                  type = 'bitbucket';

                } else {
                  repositoryExists = findWhere(repositories.others, { path: repositoryPath});
                  type = 'others';
                }

                if (!repositoryExists) {

                  index = repositories[type].push({
                    name: name,
                    path: repositoryPath,
                    type : type.toUpperCase()
                  });

                  repository = repositories[type][index - 1];

                  saveRepository(repository);
                } else {
                  repository = repositoryExists;
                }

                repositories.isEmpty = false;

                if (callback && typeof callback == 'function') {
                  callback.call(this, repository);
                }
              });

            } else {
              alert($rootScope.MSGS['Nothing for me here.\n The folder {folder} is not a git project'].replace('{folder}', repositoryPath));
            }
          }
        }
      },

      // Return true if the repository was selected and false case not
      removeRepository: function (repositoryType, index) {
        var storagedRepositories = JSON.parse(repositoriesStr) || {},
          type = repositoryType.toLowerCase(),
          removedRepository;

        storagedRepositories.github = storagedRepositories.github || [];
        storagedRepositories.bitbucket = storagedRepositories.bitbucket || [];
        storagedRepositories.others = storagedRepositories.others || [];

        storagedRepositories[type].splice(index, 1);
        removedRepository = repositories[type].splice(index, 1);

        localStorage.setItem('repos', JSON.stringify(storagedRepositories));
        repositoriesStr = JSON.stringify(storagedRepositories);

        return removedRepository[0].selected;
      },

      closeAnyContextMenu: function () {
        var contextMenus = document.querySelectorAll('.context-menu');

        angular.forEach(contextMenus, function (item) {
          document.body.removeChild(item);
        });
      },

      repositories: repositories
    };
  });

})();
