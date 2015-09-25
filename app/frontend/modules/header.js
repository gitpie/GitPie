(function () {
  var GitUrlParse = require('./node_modules/git-url-parse'),
    fs = require('fs'),
    path = require('path');

  angular.module('header', [])

  .directive('pieHeader', function () {
    return {
      restrict: 'E',
      templateUrl: 'app/frontend/view/header/pieHeader.html',

      controller: function ($scope, $element, CommomService) {
        var MSGS = $scope.MSGS;

        // Verify if a branch is in remoteBranchs array
        this.isRemoteBranch = function (branch) {

          for (var i = 0; i < this.remoteBranchs.length; i++) {

            if (this.remoteBranchs[i].trim() == branch.trim()) {
              return true;
            }
          }

          return false;
        };

        this.selectedRepository = null;
        this.remoteBranchs = [];
        this.tags = [];
        this.syncStatus = {};
        this.loading = false;

        // Menu show hide controller vars
        this.showAddMenu = false;
        this.showBranchMenu = false;
        this.showSettingsMenu = false;

        this.cloneNotify = {
          show: false,
          cloneURL: null,
          destinyFolder: null
        };

        this.createNotify = {
          show: false,
          repositoryHome: null
        };

        this.toggleMenu = function (menuIndex) {

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
          }
        };

        this.hideAllMenu = function () {
          this.showAddMenu = false;
          this.showBranchMenu = false;
          this.showSettingsMenu = false;

          CommomService.closeAnyContextMenu();
        };

        CommomService.hideHeaderMenu = this.hideAllMenu.bind(this);

        $scope.$on('repositorychanged', function (event, repository) {
          this.loading = true;

          this.selectedRepository = repository;

          GIT.getCurrentBranch(repository.path, function (err, currentBranch, remoteBranchs) {
            this.currentBranch = currentBranch;
            this.remoteBranchs = remoteBranchs;

            $scope.$apply();
          }.bind(this));

          GIT.getTag(this.selectedRepository.path, function (err, tags) {
            this.tags = tags;

            $scope.$apply();
          }.bind(this));

          GIT.fetch(this.selectedRepository.path, function (err) {
            // Ignored error for while to not block status for private repositories

            GIT.getStatus(repository.path, function (err, syncStatus, files) {
              this.syncStatus = syncStatus;
              this.loading = false;

              $scope.$apply();
            }.bind(this));

          }.bind(this));

          GIT.getStatus(repository.path, function (err, syncStatus, files) {
            $scope.$broadcast('unsynChanges', files);
          }.bind(this));

        }.bind(this));

        this.switchBranch = function (branch, forceCreateIfNotExists) {
          this.hideAllMenu();
          this.loading = true;

          GIT.switchBranch({
            path: this.selectedRepository.path,
            branch: branch,
            forceCreateIfNotExists: forceCreateIfNotExists
          }, function (err) {

            if (err) {
              alert(MSGS['Error switching branch. Error: '] + err);
            } else {
              this.currentBranch = branch;

              $scope.$broadcast('changedbranch', this.selectedRepository);
            }

            this.loading = false;
            $scope.$apply();
          }.bind(this));
        };

        this.sync = function () {

          if (this.selectedRepository && !this.loading) {
            this.loading = true;

            GIT.fetch(this.selectedRepository.path, function (err) {

              // Ignored error for while to not block status for private repositories

              GIT.sync({
                path: this.selectedRepository.path,
                branch: this.currentBranch,
                setUpstream: !this.isRemoteBranch(this.currentBranch),
                push: this.syncStatus.ahead
              }, function (err) {

                if (err) {
                  alert(MSGS['Error syncronazing repository. \n Error: '] + err.message);
                }

                // Emit changedbranch event even on error case as a workaround to git push command fail
                $scope.$broadcast('changedbranch', this.selectedRepository);
                this.loading = false;
                $scope.$apply();
              }.bind(this));
            }.bind(this));
          }
        };

        this.addRepository = function (repositoryPath) {

          CommomService.addRepository(repositoryPath, function (repository) {

            if (repository) {
              $scope.$broadcast('changedbranch', repository);
              CommomService.hideHeaderMenu();
            }
          });
        };

        this.checkoutBranch = function ($event, newBranch) {

          if ($event.keyIdentifier == 'Enter') {
            var newBranchName = this.treatBranch(newBranch),
              forceCreateIfNotExists = !this.branchExists(newBranchName);

            this.switchBranch(newBranchName, forceCreateIfNotExists);
          }
        };

        this.branchExists = function (branchName) {
          var treatedBranchName = this.treatBranch(branchName);

          for (var i = 0; i < this.remoteBranchs.length; i++) {

            if (this.remoteBranchs[i].trim() == treatedBranchName) {
              return true;
            }
          }

          return false;
        };

        this.treatBranch = function (branchName) {
          return branchName && branchName.replace(/ /g, '-');
        };

        this.cloneRepository = function (cloneURL, destiny) {

          if (cloneURL && destiny) {
            var me = this,
              repositoryData = GitUrlParse(cloneURL),
              destinyFolder;

            try {
              destinyFolder = fs.lstatSync(destiny);

              if (repositoryData.name) {
                me.cloneNotify.show = true;
                me.cloneNotify.cloneURL = cloneURL;
                me.cloneNotify.destinyFolder = destiny;

                CommomService.hideHeaderMenu();

                GIT.clone({
                  cloneURL: cloneURL,
                  destinyFolder: destiny,

                  callback: function (err) {

                    if (err) {
                      alert(err);
                    } else {
                      me.addRepository(path.join(destiny, repositoryData.name));
                    }

                    me.cloneNotify.show = false;
                    $scope.$apply();
                  }
                });
              } else {
                alert(MSGS['\'{cloneURL}\' not appears to be a git remote URL. Let\'s try again!'].replace('{cloneURL}', cloneURL));
              }

            } catch (err) {
              alert(MSGS['The path \'{path}\' is not a folder. Pick a valid directory to clone projects.'].replace('{path}', destiny));
            }

          }
        };

        this.showResetButton = function () {
          return CommomService.selectedCommit;
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

              CommomService.closeAnyContextMenu();
            }.bind(this)
          });
        };

        this.createRepository = function (repositoryName, repositoryHome) {

          if (repositoryName && repositoryHome) {
            var me = this,
              destinyFolder;

            try {
              destinyFolder = fs.lstatSync(repositoryHome);
              me.createNotify.repositoryHome = repositoryHome;
              me.createNotify.show = true;

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
                    }
                  }

                  me.createNotify.show = false;
                  $scope.$apply();
                }
              });

            } catch (err) {
              alert(MSGS['The path \'{path}\' is not a folder. Pick a valid directory to create projects.'].replace('{path}', repositoryHome));
            }
          }
        };
      },

      controllerAs: 'headerCtrl'
    };
  });
})();
