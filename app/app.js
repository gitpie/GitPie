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
    var storagedRepos = JSON.parse(localStorage.getItem('repos')) || [],

      findWhere = function (array, object) {

        for (var i = 0; i < array.length; i++) {

          if (array[i][Object.keys(object)[0]] == object[Object.keys(object)[0]]) {
            return array[i];
          }
        }

        return null;
      },

      repositories = [];

    storagedRepos.forEach(function (item) {
      delete item.$$hashKey;
      delete item.selected;

      repositories.push(item);
    });

    return {

      addRepository: function (repositoryPath) {

        if (repositoryPath) {
          var repositoryExists = findWhere(repositories, { path: repositoryPath});

          // Easter egg :D
          if (repositoryPath.toLowerCase() === 'i have no idea') {
            alert('It happends with me all the time too. But let\'s try find your project again!');

          } else if (!repositoryExists) {
            var name = GIT_REPO_NAME(repositoryPath);

            if (name) {
              var index = repositories.push({
                name: name,
                path: repositoryPath
              });

              localStorage.setItem('repos', JSON.stringify(repositories));

              return repositories[index-1];
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
