'use strict';

// Remote electron module
const remote = require('remote');
// Locale language
const LANG = window.navigator.userLanguage || window.navigator.language;

var

  // browser window object
  WIN = remote.getCurrentWindow(),

  // Git class that perfoms git commands
  GIT = require('./app/core/git'),

  // Updater module for GitPie
  UpdaterModule = require('./app/core/updater/updater'),

  // Updater instance
  updater = new UpdaterModule(),

  // Messages and labels of the application
  MSGS,

  // Apply AngularJS scope if a apply task is not being digest
  applyScope = function (scope) {
    if (!scope.$$phase) {
      scope.$apply();
    }
  };

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

/* AngularJS app init */
(function () {
  var app = angular.module('gitpie', ['components', 'attributes', 'header', 'content', 'settings']);

  // Trust as HTML Global filter
  app.filter('trustAsHtml', function($sce) {
    return function(html) {
      return $sce.trustAsHtml(html);
    };
  });

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
    $rootScope.showApp = false;

    /* Verify if there's a available update */
    updater.on('availableUpdate', function (remotePackJson) {
      console.log('[INFO] There is a available update. New version '.concat(remotePackJson.version));

      updater.downloadFiles();
    });

    updater.on('downloadingfiles', function () {
      console.log('[INFO] Downloading files...');
    });

    updater.on('error', function (err) {
      console.error('[ERROR] Error updating GitPie. Error: ', err);

      alert('Error updating GitPie. Error: ' + err.message);
    });

    updater.checkAvailableUpdate();

    $rootScope.showRepositoryMenu = true;

    // Load the application Configs
    var Configs = JSON.parse(localStorage.getItem('configs'));

    if (!Configs) {
      Configs = {
        fontFamily: 'Roboto'
      };

      localStorage.setItem('configs', JSON.stringify(Configs));
    }

    $rootScope.CONFIGS = Configs;

    // Save any change made on global configs
    WIN.on('close', function () {
      WIN.hide();

      localStorage.setItem('configs', JSON.stringify($rootScope.CONFIGS));

      WIN.close(true);
    });

    return {

      addRepository: function (repositoryPath, callback) {

        if (repositoryPath) {

          // Easter egg :D
          if (repositoryPath.toLowerCase() === $rootScope.MSGS['i have no idea']) {
            alert($rootScope.MSGS['It happends with me all the time too. But lets\'s try find your project again!']);

          } else {
            let gitUrlParse = require('git-url-parse');

            GIT.listRemotes(repositoryPath, function (err, repositoryRemotes) {

              if (err) {
                alert($rootScope.MSGS['Nothing for me here.\n The folder {folder} is not a git project'].replace('{folder}', repositoryPath));
              } else {
                let gitUrl = gitUrlParse(repositoryRemotes.origin.push),
                  type,
                  index,
                  repositoryExists,
                  repository;

                switch (gitUrl.resource) {
                  case 'github.com':
                    repositoryExists = findWhere(repositories.github, { path: repositoryPath});
                    type = 'github';
                    break;
                  case 'bitbucket.org':
                    repositoryExists = findWhere(repositories.bitbucket, { path: repositoryPath});
                    type = 'bitbucket';
                    break;
                  default:
                    repositoryExists = findWhere(repositories.others, { path: repositoryPath});
                    type = 'others';
                    break;
                }

                if (!repositoryExists) {

                  index = repositories[type].push({
                    name: gitUrl.name,
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
              }
            });
          }
        }
      },

      addNewGitRepository: function (opts) {
        opts = opts || {};

        if (opts.repositoryName && opts.path) {
          var index,
            repositoryExists,
            repository;

          repositoryExists = findWhere(repositories.others, { path: opts.path});

          if (!repositoryExists) {

            index = repositories.others.push({
              name: opts.repositoryName,
              path: opts.path,
              type : 'OTHERS'
            });

            repository = repositories.others[index - 1];

            saveRepository(repository);
          } else {
            repository = repositoryExists;
          }

          repositories.isEmpty = false;

          return repository;
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

      repositories: repositories
    };
  });

})();
