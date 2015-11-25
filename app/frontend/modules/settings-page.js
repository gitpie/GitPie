(function () {

  angular.module('settings', []).directive('settingsPage', function () {
    return {
      restrict: 'E',
      templateUrl: 'app/frontend/view/content/settings-page.html',

      controller: function ($scope) {
        this.showSettingsPage = false;
        this.hidePage = true;

        this.hideSettingsPage = function () {
          this.showSettingsPage = false;

          setTimeout(function () {
            this.hidePage = true;
            $scope.$apply();
          }.bind(this), 500);
        };

        $scope.$root.showSettingsPage = function () {
          this.hidePage = false;

          setTimeout(function () {
            this.showSettingsPage = true;
            $scope.$apply();
          }.bind(this), 200);
        }.bind(this);

        this.changeFont = function () {

        };
      },

      controllerAs: 'settingsCtrl'
    };
  });
})();
