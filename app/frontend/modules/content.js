(function () {
  angular.module('content', [])

  .directive('pieContent', function () {
    return {
      restrict: 'E',
      templateUrl: 'app/frontend/view/content/pieContent.html',

      controller: function ($scope, $sce, CommomService) {
        var selectedRepository = {},
          selectedCommit = {},
          selectedCommitAncestor = null;

        this.loading = false;

        this.repositories = CommomService.repositories;

        this.repositoryHistory = [];

        // List of files of the Changes tab
        this.commitChanges = [];

        // List of files of the History tab
        this.commitHistory = [];

        this.hideHeaderMenus = CommomService.hideHeaderMenu;

        if (this.repositories.length > 0) {
          this.isRepositoryMenuEmpty = false;
        }

        this.showRepositoryInfo = function (repository, forceReload) {

          if (forceReload || selectedRepository.name != repository.name) {

            if (selectedRepository) {
              selectedRepository.selected = false;
            }

            repository.selected = true;
            selectedRepository = repository;
            this.commitChanges = [];
            this.commitHistory = [];
            selectedCommit = {};

            GIT.getCommitHistory({
              path: repository.path
            }, function (err, historyList) {
              this.repositoryHistory = historyList;

              $scope.$apply();
              $scope.$broadcast('repositorychanged', selectedRepository);

            }.bind(this));

            this.commitNumber = 'counting';

            GIT.getCommitCount(repository.path,function (err, size) {

              if (err) {
                console.log('Error counting commits. Error: ' + err);
              } else {
                this.commitNumber = size;
                $scope.$apply();
              }
            }.bind(this));
          }
        };

        this.showCommitChanges = function (commit, commitIndex) {
          var ancestorCommit = this.repositoryHistory[commitIndex+1] || {},

            opts = {
              hash: commit.hash,
              ancestorHash: ancestorCommit.hash || '',
              path: selectedRepository.path
            };

          selectedCommitAncestor = ancestorCommit;

          this.loading = true;

          if (selectedCommit) {
            selectedCommit.selected = false;
          }

          commit.selected = true;
          selectedCommit = commit;

          GIT.getDiff(opts, function (err, files) {
            this.commitHistory = [];

            files.forEach(function (file) {

              if (file.name) {

                if (!file.isBinary) {
                  var changesHTML = [];

                  if (file.additions > 0) {
                    changesHTML.push('<span class="plus-text">+', file.additions, '</span>');
                  }


                  if (file.deletions > 0) {
                    changesHTML.push('<span class="minor-text">-', file.deletions, '</span>');
                  }

                  file.changes = $sce.trustAsHtml(changesHTML.join(''));
                } else {
                  file.changes = $sce.trustAsHtml('BINARY');
                }

                this.commitHistory.push(file);
              }
            }.bind(this));

            this.loading = false;

            $scope.$apply();
          }.bind(this));
        };

        this.getCommitMessage = function () {
          return selectedCommit.message;
        };

        this.getCommitHash = function () {
          return selectedCommit.hash;
        };

        this.getCommitUser = function () {
          return selectedCommit.user;
        };

        this.showFileDiff = function (change) {

          if (!change.isUnsyc) {
            GIT.getFileDiff({

              file: change.name,
              hash: selectedCommit.hash,
              path: selectedRepository.path

            }, function (err, stdout) {

              if (err) {
                alert(err.message);
              } else {
                change.code = stdout;

                if (change.showCode) {
                  change.showCode = false;
                } else {
                  change.showCode = true;
                }

                $scope.$apply();
              }
            });
          } else {

            GIT.getUnsyncFileDiff({
              path: selectedRepository.path,
              file: change.name
            },
            function (err, diff) {

              if (err) {
                alert(err);
              } else {
                change.code = diff;

                if (change.showCode) {
                  change.showCode = false;
                } else {
                  change.showCode = true;
                }
              }

              $scope.$apply();
            });
          }
        };

        this.commitSelectedChanges = function (commitMessage, commitDescription) {

          if (commitMessage) {

            this.commitChanges.forEach(function (file) {

              if (file.checked) {

                try {

                  GIT.add(selectedRepository.path, {
                    forceSync: true,
                    file: file.name
                  });
                } catch(err) {
                  alert('Error adding file "' + file.name + '" Error: ' + err);
                }
              }
            }.bind(this));

            try {

              GIT.commit(selectedRepository.path, {
                message: commitMessage,
                description: commitDescription,
                forceSync: true
              });

              this.showRepositoryInfo(selectedRepository, true);
            } catch (err) {
              alert('Error commiting changes. Error: ' + err);
            }

            $scope.commitMessage = null;
            $scope.commitDescription = null;
          }
        };

        this.loadMoreCommits = function ($event) {
          var element = $event.srcElement,
            historyContainerHeight = element.scrollHeight - element.clientHeight;

          if (historyContainerHeight == element.scrollTop && this.repositoryHistory.length < parseInt( this.commitNumber )) {

            GIT.getCommitHistory({
              path: selectedRepository.path,
              skip: this.repositoryHistory.length
            }, function (err, historyList) {

              if (err) {
                alert('Error getting more history. Error: ' + err.message);
              } else {
                this.repositoryHistory = this.repositoryHistory.concat(historyList);

                $scope.$apply();
              }

            }.bind(this));
          }
        }.bind(this);

        $scope.$on('changedbranch', function (event, repository) {
          this.showRepositoryInfo(repository, true);
        }.bind(this));

        $scope.$on('unsynChanges', function (event, files) {

          if (files.length > 0) {
            this.commitChanges = [];

            files.forEach(function (item) {
              item.name = item.path;
              item.isUnsyc = true;
              item.checked = true;

              this.commitChanges.push(item);
            }.bind(this));

            $scope.$apply();
          }
        }.bind(this));
      },

      controllerAs: 'appCtrl'
    };
  });

})();
