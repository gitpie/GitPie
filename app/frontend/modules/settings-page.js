'use strict';

(function () {

  angular.module('settings', []).directive('settingsPage', function () {
    return {
      restrict: 'E',
      templateUrl: 'app/frontend/view/content/settings-page.html',

      controller: function ($scope) {
        this.showSettingsPage = false;
        this.hidePage = true;
        this.fonts = [
          'Comic Sans MS',
          'Ubuntu',
          'Droid Sans',
          'Roboto',
          'Helvetica'
        ];
        this.selectedRepository = null;
        this.globalGitConfigs = {
          'user.name': '',
          'user.email': '',
          'merge.tool': ''
        };
        this.languages = [
          { code: 'en', description: 'English'},
          { code: 'pt-BR', description: 'Portuguese (Brazil)'}
        ];

        this.appVersion = require('./package').version;

        this.hideSettingsPage = function () {
          this.showSettingsPage = false;

          setTimeout(function () {
            this.hidePage = true;
            applyScope($scope);
          }.bind(this), 500);
        };

        this.getGlobalGitConfigs = function () {
          GIT.getGlobalConfigs(function (err, configs) {
            
            if (err) {
              new GPNotification(MSGS['It seems that a git username and email are not set globally. You can fix this accessing the Settings menu'], { closable: true }).pop();
            } else {
              this.globalGitConfigs = configs;
            }
          }.bind(this));
        };

        $scope.$root.showSettingsPage = function () {
          this.hidePage = false;

          setTimeout(function () {
            this.showSettingsPage = true;
            applyScope($scope);
          }.bind(this), 200);
        }.bind(this);

        // Attemp to get the global git configs on load the application
        this.getGlobalGitConfigs();

        this.changeGitCofigs = function (global, event) {
          var username,
            email,
            repositoryPath,
            mergeTool;

          if (global) {
            username = this.globalGitConfigs['user.name'];
            email = this.globalGitConfigs['user.email'];
            mergeTool = this.globalGitConfigs['merge.tool'];
          } else {
            username = this.localGitConfigs['user.name'];
            email = this.localGitConfigs['user.email'];
            mergeTool = this.localGitConfigs['merge.tool'];
            repositoryPath = this.selectedRepository.path;
          }

          event.target.setAttribute('disabled', true);

          GIT.alterGitConfig(repositoryPath, {
            global: global,
            username: username,
            email: email,
            mergeTool: mergeTool,
            callback: function (err) {

              if (err) {
                alert(err);
              } else {
                new GPNotification(MSGS['THE GIT CONFIGURATIONS HAVE BEEN SUCCESSFULLY CHANGED'], { autoclose: true }).pop();
              }

              event.target.removeAttribute('disabled');
            }
          });
        };

        this.openMergeToolConfigHelp = function () {
          const shell = require('shell');

          shell.openExternal('https://gist.github.com/mapaiva/c77bd11de94014a9d865');
        };

        this.changeAppLanguage = function (language) {
          var newLangCode = $scope.CONFIGS.language.code;

          for (var i = 0; i < this.languages.length; i++) {

            if (newLangCode == this.languages[i].code) {
              $scope.CONFIGS.language.description = this.languages[i].description;
              break;
            }
          }

          try {
            $scope.MSGS = require('./language/'.concat(newLangCode).concat('.json'));
            MSGS = $scope.MSGS;
          } catch (err) {
            $scope.CONFIGS.language = {
              code: 'en',
              description: 'English'
            };
          }
        };

        $scope.$on('repositorychanged', function (event, repository) {
          this.selectedRepository = repository;
          this.selectedRepository.usingSSH = false;

          GIT.listRemotes(repository.path, function (err, remotesList) {

            if (err) {
              alert(err.message);
            } else if (remotesList.origin) {
              var GitUrlParse = require('git-url-parse'),
                repoSettings = GitUrlParse(remotesList.origin.push);

              if (repoSettings.protocol == 'ssh') {
                this.selectedRepository.usingSSH = true;
              }
            }
          }.bind(this));

          this.getGlobalGitConfigs();

          GIT.getLocalConfigs(this.selectedRepository.path, function (err, configs) {

            if (err) {
              this.localGitConfigs = {
                'user.name': '',
                'user.email': '',
                'merge.tool': ''
              };
              alert(err.message);
            } else {
              this.localGitConfigs = configs;
            }
          }.bind(this));

        }.bind(this));

        $scope.$on('removedRepository', function () {
          this.selectedRepository = null;
        }.bind(this));
      },

      controllerAs: 'settingsCtrl'
    };
  });
})();
