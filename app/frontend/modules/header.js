'use strict';

(function () {
  const GitUrlParse = require('git-url-parse');
  const fs = require('fs');
  const path = require('path');
  const remote = require('remote');
  const dialog = remote.require('dialog');
  const browserWindow = remote.require('browser-window');
  const globalShortcut = remote.globalShortcut;

  angular.module('header', [])

  .directive('pieHeader', function () {
    return {
      restrict: 'E',
      templateUrl: 'app/frontend/view/header/pieHeader.html',

      controller: function ($scope, $element, CommomService) {
        let isMerging = false;

        let updateIsMerging = function () {

          if (GIT.isMerging(this.selectedRepository.path)) {
            isMerging = true;
          } else {
            isMerging = false;
          }
        }.bind(this);

        // Verify if a branch is in remoteBranches array
        this.isRemoteBranch = function (branch) {

          for (var i = 0; i < this.remoteBranches.length; i++) {

            if (this.remoteBranches[i].trim() == branch.trim()) {
              return true;
            }
          }

          return false;
        };

        this.selectedRepository = null;
        this.remoteBranches = [];
        this.localBranches = [];
        this.tags = [];
        this.syncStatus = {};
        this.loading = false;

        // Menu show hide controller vars
        this.showAddMenu = false;
        this.showBranchMenu = false;
        this.showSettingsMenu = false;
        this.showStashMenu = false;

        // Scope variables to bind te "add repository" fields
        this.repositoryPath = null;
        this.cloneURL = null;
        this.repositoryDestiny = null;
        this.repositoryName = null;
        this.stashableFiles = [];

        this.toggleMenu = function (menuIndex) {
          this.hideAllMenu();

          switch (menuIndex) {
            case 1:
              this.showAddMenu = !this.showAddMenu;
              break;
            case 2:
              this.showBranchMenu = !this.showBranchMenu;
             break;
            case 3:
              this.showSettingsMenu = !this.showSettingsMenu;
             break;
            case 4:
              this.showStashMenu = !this.showStashMenu;
            break;
          }
        };

        this.hideAllMenu = function () {
          this.showAddMenu = false;
          this.showBranchMenu = false;
          this.showSettingsMenu = false;
          this.showStashMenu = false;
        };

        CommomService.hideHeaderMenu = this.hideAllMenu.bind(this);

        $scope.$on('removedRepository', function () {
          this.selectedRepository = null;
          this.currentBranch = null;
          this.remoteBranches = [];
        }.bind(this));

        $scope.$on('repositorychanged', function (event, repository) {
          this.loading = true;

          this.selectedRepository = repository;

          GIT.getStatus(repository.path, function (err, syncStatus, files) {
            $scope.$broadcast('unsynChanges', files);

            this.setStashableFiles(files);
          }.bind(this));

          GIT.getCurrentBranch(repository.path, function (err, currentBranch, remoteBranches, localBranches) {
            this.currentBranch = currentBranch;
            this.remoteBranches = remoteBranches;
            this.localBranches = localBranches;

            updateIsMerging();

            applyScope($scope);
          }.bind(this));

          GIT.getTag(this.selectedRepository.path, function (err, tags) {
            this.tags = tags;

            applyScope($scope);
          }.bind(this));

          GIT.fetch(this.selectedRepository.path, function (err) {
            // Ignored error for while to not block status for private repositories

            GIT.getStatus(repository.path, function (err, syncStatus, files) {
              this.syncStatus = syncStatus;
              this.loading = false;

              applyScope($scope);
            }.bind(this));

          }.bind(this));

          GIT.getStashList(this.selectedRepository.path, function (err, stashs) {
            this.stashList = stashs;

            applyScope($scope);
          }.bind(this));

        }.bind(this));

        this.switchBranch = function (branch, forceCreateIfNotExists) {
          this.hideAllMenu();
          this.loading = true;

          let noti = new GPNotification(`${MSGS['Switching to branch']} ${branch}`, { showLoad: true });

          noti.pop();

          GIT.switchBranch({
            path: this.selectedRepository.path,
            branch: branch,
            forceCreateIfNotExists: forceCreateIfNotExists
          }, function (err) {

            noti.close();

            if (err) {
              alert(MSGS['Error switching branch. Error: '] + err);
            } else {
              this.currentBranch = branch;

              $scope.$broadcast('changedbranch', this.selectedRepository);
            }

            this.loading = false;
            applyScope($scope);
          }.bind(this));
        };

        this.sync = function () {

          if (this.selectedRepository && !this.loading) {
            this.loading = true;

            GIT.sync({
              path: this.selectedRepository.path,
              branch: this.currentBranch,
              setUpstream: !this.isRemoteBranch(this.currentBranch),
              push: this.syncStatus.ahead,
              noHTTPAuthcallback : function (gitFetchURL, gitPushURL) {
                this.loading = false;
                applyScope($scope);

                $scope.showPushModalDialog({
                  remote: gitFetchURL.href,
                  gitFetchURL: gitFetchURL,
                  gitPushURL: gitPushURL
                });
              }.bind(this)
            }, function (err) {

              if (err) {
                alert(MSGS['Error syncronazing repository. \n Error: '] + err.message);
              } else {
                $scope.$broadcast('changedbranch', this.selectedRepository);
              }

              this.loading = false;
              applyScope($scope);
            }.bind(this));
          }
        };

        this.addRepository = function (repositoryPath) {

          CommomService.addRepository(repositoryPath, function (repository) {

            if (repository) {
              $scope.$broadcast('changedbranch', repository);
              CommomService.hideHeaderMenu();
              this.repositoryPath = null;
            }
          }.bind(this));
        };

        this.checkoutBranchKeyPress = function ($event, newBranch) {

          if ($event.keyIdentifier == 'Enter') {
            this.checkoutBranch(newBranch);
          }
        };

        this.checkoutBranch = function (newBranch) {

          if (newBranch) {
            var newBranchName = this.treatBranch(newBranch),
              forceCreateIfNotExists = !this.branchExists(newBranchName);

            this.switchBranch(newBranchName, forceCreateIfNotExists);
          }
        };

        this.branchExists = function (branchName) {
          var treatedBranchName = this.treatBranch(branchName);

          if (treatedBranchName == this.currentBranch.trim()) {
            return true;
          }

          for (let i = 0; i < this.remoteBranches.length; i++) {

            if (this.remoteBranches[i].trim() == treatedBranchName) {
              return true;
            }
          }

          for (let i = 0; i < this.localBranches.length; i++) {

            if (this.localBranches[i].trim() == treatedBranchName) {
              return true;
            }
          }

          return false;
        };

        this.deleteBranch = function (branch) {
          branch = branch.trim();

          let currentWindow = browserWindow.getFocusedWindow();

          dialog.showMessageBox(currentWindow, {
            type: 'question', title: `${MSGS['Delete branch']} ${branch}`, message: `${MSGS['All the unmerged changes will be lost! Are you sure to delete the branch']} '${branch}'?`,
            buttons: ['Yes', 'No']
          }, function (response) {

            if (response === 0) {

              GIT.deleteBranch(this.selectedRepository.path, {
                branchName: branch,
                callback: function (err) {

                  if (err) {
                    alert(err);
                  } else {
                    $scope.$broadcast('changedbranch', this.selectedRepository);
                  }
                }.bind(this)
              });
            }
          }.bind(this));
        };

        this.treatBranch = function (branchName) {
          return branchName && branchName.replace(/ /g, '-');
        };

        this.cloneRepository = function () {

          if (this.cloneURL && this.repositoryDestiny) {
            var repositoryData = GitUrlParse(this.cloneURL),
              destinyFolder;

            try {
              destinyFolder = fs.lstatSync(this.repositoryDestiny);

              if (repositoryData.name) {
                var cloneURL = this.cloneURL,
                  cloneDirectory = this.repositoryDestiny,
                  noti = new GPNotification(`${MSGS['CLONING REPOSITORY FROM']} <strong>${cloneURL}</strong> ${MSGS.INTO} <strong>${cloneDirectory}</strong>`, {
                    showLoad: true
                  });

                noti.pop();

                CommomService.hideHeaderMenu();

                GIT.clone({
                  cloneURL: this.cloneURL,
                  destinyFolder: this.repositoryDestiny,

                  callback: function (err) {

                    if (err) {
                      alert(err);
                    } else {
                      this.addRepository(path.join(this.repositoryDestiny, repositoryData.name));

                      new GPNotification(`${repositoryData.name} ${MSGS.cloned} ${MSGS['with success']}`, {
                        type: 'global',
                        body: `${repositoryData.name} ${MSGS.cloned} ${MSGS.INTO.toLowerCase()} ${cloneDirectory}`
                      }).pop();
                    }

                    noti.close();
                    applyScope($scope);
                  }.bind(this)
                });
              } else {
                alert(MSGS['\'{cloneURL}\' not appears to be a git remote URL. Let\'s try again!'].replace('{cloneURL}', this.cloneURL));
              }

            } catch (err) {
              alert(MSGS['The path \'{path}\' is not a folder. Pick a valid directory to clone projects.'].replace('{path}', this.repositoryDestiny));
            }

          }
        };

        this.showResetButton = function () {

          if (this.selectedRepository && CommomService.selectedCommit) {
            return true;
          }

          return false;
        };

        this.resetBranchToCommit = function () {

          GIT.reset(this.selectedRepository.path, {
            hash: CommomService.selectedCommit.hash,

            callback: function (err) {

              if (err) {
                alert(err);
              } else {
                $scope.$broadcast('changedbranch', this.selectedRepository);
              }
            }.bind(this)
          });
        };

        this.createRepository = function () {
          var repositoryName = this.treatBranch(this.repositoryName),
            repositoryHome = this.repositoryHome;

          if (repositoryName && repositoryHome) {
            let destinyFolder,
              noti = new GPNotification(`${MSGS['CREATING REPOSITORY IN']} <strong>${repositoryHome}</strong>`, {
                showLoad: true
              });

            noti.pop();

            try {
              destinyFolder = fs.lstatSync(repositoryHome);

              CommomService.hideHeaderMenu();

              GIT.createRepository({
                repositoryName: repositoryName,
                repositoryHome: repositoryHome,

                callback: function (err) {

                  if (err) {
                    alert(err);
                  } else {
                    var repository = CommomService.addNewGitRepository({
                      path: repositoryHome,
                      repositoryName: repositoryName
                    });

                    if (repository) {
                      $scope.$broadcast('changedbranch', repository);
                      CommomService.hideHeaderMenu();
                      this.repositoryName = null;
                      this.repositoryHome = null;
                    }
                  }

                  noti.close();
                  applyScope($scope);
                }.bind(this)
              });

            } catch (err) {
              noti.close();

              alert(MSGS['The path \'{path}\' is not a folder. Pick a valid directory to create projects.'].replace('{path}', repositoryHome));
            }
          }
        };

        this.isRepositoryNameVisible = function () {

          if (!$scope.$root.showRepositoryMenu && this.selectedRepository) {
            return true;
          } else {
            return false;
          }
        };

        this.stashChanges = function () {

          GIT.stashChanges(this.selectedRepository.path, function (err) {

            if (err) {
              alert(err);
            } else {
              $scope.$broadcast('changedbranch', this.selectedRepository);
            }
          }.bind(this));
        };

        this.removeStash = function (reflogSelector) {
          CommomService.hideHeaderMenu();

          GIT.dropStash(this.selectedRepository.path, {
            reflogSelector: reflogSelector,
            callback: function (err) {

              if (err) {
                alert(err);
              } else {
                $scope.$broadcast('changedbranch', this.selectedRepository);
              }
            }.bind(this)
          });
        };

        this.popStash = function (reflogSelector) {
          CommomService.hideHeaderMenu();

          GIT.popStash(this.selectedRepository.path, {
            reflogSelector: reflogSelector,
            callback: function (err) {

              if (err) {
                alert(err);
              } else {
                $scope.$broadcast('changedbranch', this.selectedRepository);
              }
            }.bind(this)
          });
        };

        this.showStash = function (stash) {
          CommomService.hideHeaderMenu();

          GIT.showStash(this.selectedRepository.path, {
            reflogSelector: stash.reflogSelector,
            callback: function (err, files) {

              if (err) {
                alert(err);
              } else {
                $scope.$broadcast('showStashDiff', stash, files);
              }
            }
          });
        };

        //Catch event "apprefreshed" and update stash info
        $scope.$on('apprefreshed', function (event, unsyncChanges, syncStatus) {

          if (this.selectedRepository) {
            this.setStashableFiles(unsyncChanges);

            updateIsMerging();

            if (syncStatus && this.syncStatus.ahead != syncStatus.ahead) {
              this.syncStatus = syncStatus;

              GIT.getCommitHistory({
                path: this.selectedRepository.path
              }, function (err, historyList) {
                $scope.appCtrl.repositoryHistory = historyList;
                $scope.appCtrl.commitHistory = [];

                applyScope($scope);
              }.bind(this));
            }

            GIT.getStashList(this.selectedRepository.path, function (err, stashs) {

              if (this.stashList.length != stashs.length) {
                $scope.appCtrl.hideStashTab();
              }

              this.stashList = stashs;

              applyScope($scope);
            }.bind(this));
          }
        }.bind(this));

        this.setStashableFiles = function (unsyncChanges) {
          this.stashableFiles = [];

          unsyncChanges.forEach(function (file) {

            if (file.type != 'NEW') {
              this.stashableFiles.push(file);
            }

          }.bind(this));
        };

        this.showSettingsPage = function () {
          $scope.$root.showSettingsPage();
        };

        this.showOpenDialog = function (bindVarName) {
          let currentWindow = browserWindow.getFocusedWindow();

          dialog.showOpenDialog(currentWindow, { properties: [ 'openDirectory' ] }, function (filenames) {

            if (filenames) {
              this[bindVarName] = filenames[0];
              applyScope($scope);
            }
          }.bind(this));
        };

        this.toggleRepositoryMenu = function () {
          $scope.showRepositoryMenu = !$scope.showRepositoryMenu;
        };

        this.isRepositoryListEmpty = function () {
          return CommomService.isRepoListEmpty();
        };

        this.countBranches = function () {
          let count = this.remoteBranches.length + this.localBranches.length;

          return count;
        };

        this.isMergeButtonVisible = function () {
          return (this.countBranches() > 1) && !isMerging;
        };

        this.isRepositoryMerging = function () {
          return isMerging;
        };

        this.abortMerge = function () {

          GIT.mergeAbort(this.selectedRepository.path, function (err) {

            if (err) {
              alert(err);
            } else {
              $scope.$broadcast('changedbranch', this.selectedRepository);
            }
          }.bind(this));
        };

        // Register shortcuts
        var registerShortcuts = function() {

          // Hide repository menu
          globalShortcut.register('ctrl+left', function() {
            if ($scope.showRepositoryMenu) {
              this.toggleRepositoryMenu();
              applyScope($scope);
            }
          }.bind(this));

          // Show repository menu
          globalShortcut.register('ctrl+right', function() {
            if (!$scope.showRepositoryMenu) {
              this.toggleRepositoryMenu();
              applyScope($scope);
            }
          }.bind(this));

          // Add Focus on the "Search repositories" field
          globalShortcut.register('ctrl+f', function() {
            let filed = document.querySelector('#left > input');

            filed.focus();

            if (!$scope.showRepositoryMenu) {
              this.toggleRepositoryMenu();
              applyScope($scope);
            }
          }.bind(this));

          // Navigate between repositories top to bottom
          globalShortcut.register('ctrl+down', function() {
            let liList = document.querySelectorAll('#content > #left > nav ul li ul li');

            if (liList.length > 0) {
              let selectedRepository = document.querySelector('#content > #left > nav ul li.selected');

              if (selectedRepository) {
                let selectedRepositoryPosition;
                let nextLi;

                for (let i = 0; i < liList.length; i++) {

                  if (liList[i].className.indexOf('selected') > -1) {
                    nextLi = liList[ (i + 1) ];
                    break;
                  }
                }

                if (nextLi) {
                  nextLi.click();
                  nextLi.scrollIntoViewIfNeeded();
                }
              } else {
                liList[0].click();
                liList[0].scrollIntoViewIfNeeded();
              }
            }
          });

          // Navigate between repositories bottom to top
          globalShortcut.register('ctrl+up', function() {
            let liList = document.querySelectorAll('#content > #left > nav ul li ul li');

            if (liList.length > 0) {
              let selectedRepository = document.querySelector('#content > #left > nav ul li.selected');

              if (selectedRepository) {
                let selectedRepositoryPosition;
                let nextLi;

                for (let i = 0; i < liList.length; i++) {

                  if (liList[i].className.indexOf('selected') > -1) {
                    nextLi = liList[ (i - 1) ];
                    break;
                  }
                }

                if (nextLi) {
                  nextLi.click();
                  nextLi.scrollIntoViewIfNeeded();
                }
              } else {
                liList[ (liList.length - 1) ].click();
                liList[ (liList.length - 1) ].scrollIntoViewIfNeeded();
              }
            }
          });

          // Open devTools for debug
          globalShortcut.register('ctrl+shift+d', function() {
            let Win = browserWindow.getFocusedWindow();

            if (Win.isDevToolsOpened()) {
              Win.closeDevTools();
            } else {
              Win.openDevTools();
            }
          });

          // Open dialog to add a repository
          globalShortcut.register('ctrl+shift+a', function() {
            let currentWindow = browserWindow.getFocusedWindow();

            dialog.showOpenDialog(currentWindow, { properties: [ 'openDirectory' ], title: MSGS['Add local git projects to GitPie'] }, function (filenames) {

              if (filenames) {
                this.addRepository(filenames[0]);
              }
            }.bind(this));
          }.bind(this));

        }.bind(this);

        registerShortcuts();

        WIN.on('blur', function () {
          globalShortcut.unregisterAll();
        });

        WIN.on('focus', function () {
          registerShortcuts();
        });
      },

      controllerAs: 'headerCtrl'
    };
  });
})();
