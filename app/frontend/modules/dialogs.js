'use strict';

angular.module('dialogs', [])

.directive('pushModalDialog', function () {
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
})

.directive('mergeModalDialog', function () {
  return {
    restrict: 'E',
    templateUrl: 'app/frontend/view/content/merge-modal-dialog.html',

    controller: function ($rootScope, $scope) {

      this.showDialog = false;
      this.currentBranch = null;
      this.branchCompare = null;
      this.remoteBranches = [];
      this.localBranches = [];
      this.diffInformation = {};

      this.hideDialog = function () {
        this.showDialog = false;
      };

      this.popDialog = function (pushConfigs) {
        this.showDialog = true;
        this.branchCompare = null;
        this.diffInformation = {};

        this.currentBranch = $scope.headerCtrl.currentBranch;
        this.remoteBranches = $scope.headerCtrl.remoteBranchs;
        this.localBranches = $scope.headerCtrl.localBranches;

        applyScope($scope);
      };

      this.getBranchesDiff = function () {
        this.diffInformation = {};
        
        let header = $scope.headerCtrl;
        let notification = new GPNotification(`Comparing branchs...`, { showLoad: true });

        notification.pop();

        GIT.geDiffMerge(header.selectedRepository.path, {
          branchCompare: this.branchCompare,
          callback: function (err, diffInformation) {
            notification.close();

            if (err) {
              alert(err);
            } else {
              console.log(diffInformation);

              this.diffInformation = diffInformation;

              applyScope($scope);
            }
          }.bind(this)
        });
      };

      // Expose pop dialog
      $rootScope.showMergeModalDialog = this.popDialog.bind(this);
    },

    controllerAs: 'mergeCtrl'
  };
});
