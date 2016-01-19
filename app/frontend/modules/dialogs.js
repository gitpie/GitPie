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

        document.querySelector('#merge-button').setAttribute('disabled', 'true');

        this.currentBranch = $scope.headerCtrl.currentBranch;
        this.remoteBranches = $scope.headerCtrl.remoteBranchs;
        this.localBranches = $scope.headerCtrl.localBranches;

        applyScope($scope);
      };

      this.getBranchesDiff = function () {
        let treatedBranchCompare = this.branchCompare.replace('origin/', '');
        let mergeBtn = document.querySelector('#merge-button');

        this.diffInformation = {};

        mergeBtn.setAttribute('disabled', 'true');

        if (treatedBranchCompare != $scope.headerCtrl.currentBranch) {
          let header = $scope.headerCtrl;
          let notification = new GPNotification(`${MSGS['Comparing branchs...']}`, { showLoad: true });

          notification.pop();

          GIT.geDiffMerge(header.selectedRepository.path, {
            branchCompare: this.branchCompare,
            callback: function (err, diffInformation) {
              notification.close();

              if (err) {
                alert(err);
              } else {
                this.diffInformation = diffInformation;

                mergeBtn.removeAttribute('disabled');

                applyScope($scope);
              }
            }.bind(this)
          });
        }
      };

      this.mergeBranches = function () {
        let header = $scope.headerCtrl;
        let notification;

        var branchBase = header.currentBranch,
          branchCompare = this.branchCompare.replace('origin/', '');

        notification = new GPNotification(`Merging branch <strong>${branchCompare}</strong> into <strong>${branchBase}</strong>...`, { showLoad: true });

        this.hideDialog();

        notification.pop();

        GIT.merge(header.selectedRepository.path, {
          branchCompare: branchCompare,
          callback: function (err, stdout, isConflituosMerge) {
            notification.close();

            if (err) {
              const remote = require('remote');
              const dialog = remote.require('dialog');
              const browserWindow = remote.require('browser-window');

              let currentWindow = browserWindow.getFocusedWindow();
              let message;
              let buttons = ['Ok'];
              let detail = null;

              if (isConflituosMerge) {
                message = `There are conflicts merging ${branchCompare} into ${branchBase}. Resolve them and commit the changes to complete the merge.\n\n If you want, you can abort this merge clicking on "Abort Merge".`;

                detail = stdout;

                buttons.push(MSGS['Abort Merge']);
              } else {
                message = `Something wrong happend merging ${branchCompare} into ${branchBase}. \n\n${err.message}`;
              }

              dialog.showMessageBox(currentWindow,
                {
                  type: 'error',
                  title: 'Error merging branches',
                  message: message,
                  detail: detail,
                  buttons: buttons
                },
                function (response) {

                  console.log(response);

                  if (response == 1) {

                    GIT.mergeAbort(header.selectedRepository.path, function (err) {

                      if (err) {
                        alert(err);
                      }

                      $scope.$broadcast('changedbranch', header.selectedRepository);
                    });
                  } else {
                    $scope.$broadcast('changedbranch', header.selectedRepository);
                  }
                }
              );
            } else {
              $scope.$broadcast('changedbranch', header.selectedRepository);
            }
          }
        });
      };

      // Expose pop dialog
      $rootScope.showMergeModalDialog = this.popDialog.bind(this);
    },

    controllerAs: 'mergeCtrl'
  };
});
