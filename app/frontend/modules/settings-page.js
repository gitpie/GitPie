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
          'Roboto'
        ];
        this.selectedRepository = null;
        this.globalGitConfigs = {
          'user.name': '',
          'user.email': ''
        };

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
              alert(err.message);
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
            repositoryPath;

          if (global) {
            username = this.globalGitConfigs['user.name'];
            email = this.globalGitConfigs['user.email'];
          } else {
            username = this.localGitConfigs['user.name'];
            email = this.localGitConfigs['user.email'];
            repositoryPath = this.selectedRepository.path;
          }

          event.target.setAttribute('disabled', true);

          GIT.alterGitConfig(repositoryPath, {
            global: global,
            username: username,
            email: email,
            callback: function (err) {

              if (err) {
                alert(err);
              }

              event.target.removeAttribute('disabled');
            }
          });
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
                'user.email': ''
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
