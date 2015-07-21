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
    var repositories = JSON.parse(localStorage.getItem('repos')) || {},

      findWhere = function (array, object) {

        for (var i = 0; i < array.length; i++) {

          if (array[i][Object.keys(object)[0]] == object[Object.keys(object)[0]]) {
            return array[i];
          }
        }

        return null;
      };

    repositories.github = repositories.github || [];
    repositories.bitbucket = repositories.bitbucket || [];
    repositories.outhers = repositories.outhers || [];

    if (repositories.github.length > 0 || repositories.bitbucket.length > 0 || repositories.outhers > 0) {
      repositories.isEmpty = false;
    } else {
      repositories.isEmpty = true;
    }

    return {

      addRepository: function (repositoryPath, callback) {

        if (repositoryPath) {
          var repositoryExists = findWhere(repositories, { path: repositoryPath});

          // Easter egg :D
          if (repositoryPath.toLowerCase() === 'i have no idea') {
            alert('It happends with me all the time too. But let\'s try find your project again!');

          } else if (!repositoryExists) {
            var name = GIT_REPO_NAME(repositoryPath),
              type,
              index;

            if (name) {

              GIT.listRemotes(repositoryPath, function (err, stdout) {

                if (stdout.toLowerCase().indexOf('github.com') != -1) {

                  index = repositories.github.push({
                    name: name,
                    path: repositoryPath,
                    type : 'GITHUB'
                  });

                  type = 'github';

                } else if (stdout.toLowerCase().indexOf('bitbucket.org') != -1) {

                  index = repositories.bitbucket.push({
                    name: name,
                    path: repositoryPath,
                    type : 'BITBUCKET'
                  });

                  type = 'bitbucket';
                } else {

                  index = repositories.outhers.push({
                    name: name,
                    path: repositoryPath,
                    type : 'OUTHERS'
                  });

                  type = 'outhers';
                }

                localStorage.setItem('repos', JSON.stringify(repositories));
                repositories.isEmpty = false;

                if (callback && typeof callback == 'function') {
                  callback.call(this, repositories[type][index - 1]);
                }
              });

            } else {
              alert('Nothing for me here.\n The folder ' + repositoryPath + ' is not a git project');
            }
          } else {
            return repositoryExists;
          }
        }
      },

      repositories: repositories
    };
  });

})();
