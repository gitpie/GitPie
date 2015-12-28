'use strict';

angular.module('dialogs', []).directive('pushModalDialog', function () {
  return {
    restrict: 'E',
    templateUrl: 'app/frontend/view/content/push-modal-dialog.html',

    controller: function ($rootScope, $scope) {

      this.showDialog = false;

      this.submitAuthPushForm = function (formFields) {
        var repositoryName = this.pushConfigs.gitFetchURL.name;

        let header = $scope.headerCtrl;
        let notification = new GPNotification(`Syncronizing ${repositoryName}`, { showLoad: true });

        notification.pop();
        this.hideDialog();

        GIT.sync({
          path: header.selectedRepository.path,
          branch: header.currentBranch,
          setUpstream: !header.isRemoteBranch(header.currentBranch),
          push: header.syncStatus.ahead,
          httpsConfigs: formFields
        }, function (err) {

          if (err) {
            alert(MSGS['Error syncronazing repository. \n Error: '] + err.message);
          } else {
            $scope.$broadcast('changedbranch', header.selectedRepository);
          }

          notification.close();

          applyScope($scope);
        }.bind(this));
      };

      this.hideDialog = function () {
        this.showDialog = false;
      };

      this.popDialog = function (pushConfigs) {
        this.showDialog = true;
        this.pushConfigs = pushConfigs;

        applyScope($scope);
      };

      this.pushConfigs = {};

      // Expose pop dialog
      $rootScope.showPushModalDialog = this.popDialog.bind(this);
    },

    controllerAs: 'modalCtrl'
  };
});
