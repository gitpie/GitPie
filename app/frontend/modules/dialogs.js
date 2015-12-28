'use strict';

angular.module('dialogs', []).directive('pushModalDialog', function () {
  return {
    restrict: 'E',
    templateUrl: 'app/frontend/view/content/push-modal-dialog.html',

    controller: function ($rootScope, $scope) {

      this.showDialog = false;

      this.submitAuthPushForm = function (user) {
        console.log(user);
      };

      this.hideDialog = function () {
        this.showDialog = false;
      };

      this.popDialog = function (pushConfigs) {
        this.showDialog = true;
        this.pushConfigs = pushConfigs;

        console.log('oloko bixu');
        applyScope($scope);
      };

      this.pushConfigs = {};

      // Expose pop dialog
      $rootScope.showPushModalDialog = this.popDialog;
    },

    controllerAs: 'modalCtrl'
  };
});
