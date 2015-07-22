var
  // Load native UI library
  GUI = require('nw.gui'),

  // browser window object
  WIN = GUI.Window.get(),

  // Module to discover the git repository name
  GIT_REPO_NAME = require('./node_modules/git-repo-name'),

  // Git class that perfoms git commands
  GIT = require('./app/core/git');

WIN.focus();

/**
 * Show error message on uncaughtException
 */
process.on('uncaughtException', function(err) {
  alert(err);
});

/* AngularJS app init */
(function () {
  var app = angular.module('gitpie', ['components', 'attributes', 'header', 'content']);

  app.factory('CommomService', function () {
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
        storagedRepositories.outhers = storagedRepositories.outhers || [];

        switch (repository.type) {
          case 'GITHUB':
            storagedRepositories.github.push(repository);
            break;

          case 'BITBUCKET':
            storagedRepositories.bitbucket.push(repository);
            break;

          default:
            storagedRepositories.outhers.push(repository);
            break;
        }

        localStorage.setItem('repos', JSON.stringify(storagedRepositories));
      };

    repositories.github = repositories.github || [];
    repositories.bitbucket = repositories.bitbucket || [];
    repositories.outhers = repositories.outhers || [];

    if (repositories.github.length > 0 || repositories.bitbucket.length > 0 || repositories.outhers.length > 0) {
      repositories.isEmpty = false;
    } else {
      repositories.isEmpty = true;
    }

    return {

      addRepository: function (repositoryPath, callback) {

        if (repositoryPath) {

          // Easter egg :D
          if (repositoryPath.toLowerCase() === 'i have no idea') {
            alert('It happends with me all the time too. But let\'s try find your project again!');

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
                  repositoryExists = findWhere(repositories.outhers, { path: repositoryPath});
                  type = 'outhers';
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
              alert('Nothing for me here.\n The folder ' + repositoryPath + ' is not a git project');
            }
          }
        }
      },

      repositories: repositories
    };
  });

})();
