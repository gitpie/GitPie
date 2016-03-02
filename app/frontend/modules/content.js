'use strict';

(function () {
  var CodeProcessor = require('./app/core/code-processor'),
    cp = new CodeProcessor(),
    path = require('path'),
    wos = require('node-wos');

  angular.module('content', [])

  .directive('pieContent', function () {
    return {
      restrict: 'E',
      templateUrl: 'app/frontend/view/content/pieContent.html',

      controller: function ($scope, $sce, $compile, CommomService) {
        const remote = require('remote');
        const shell = require('shell');

        let selectedRepository = {},
          selectedCommit = {},
          selectedCommitAncestor = null,
          Menu = remote.require('menu'),
          MenuItem = remote.require('menu-item');

        this.loadingHistory = false;

        this.loadingChanges = false;

        this.repositories = CommomService.repositories;

        this.repositoryHistory = [];

        // List of files of the Changes tab
        this.commitChanges = [];

        // List of files of the History tab
        this.commitHistory = [];

        // Stash reference
        this.stash = {};

        this.hideHeaderMenus = CommomService.hideHeaderMenu;

        if (this.repositories.length > 0) {
          this.isRepositoryMenuEmpty = false;
        }

        this.enableCommitBlock = null;

        $scope.showApp = true;

        this.showRepositoryInfo = function (repository, forceReload) {

          if (forceReload || selectedRepository.name != repository.name) {
            this.loadingHistory = true;

            let notification;

            if (!forceReload) {
              this.setCommitMessage(null);
              this.setCommitDescription(null);
              
              notification = new GPNotification(`${MSGS['Opening repository']} <strong>${repository.name}</strong>`, { showLoad: true });

              notification.pop();
            }

            if (selectedRepository) {
              selectedRepository.selected = false;
            }

            repository.selected = true;
            selectedRepository = repository;
            this.commitChanges = [];
            this.commitHistory = [];
            selectedCommit = {};
            CommomService.selectedCommit = null;
            this.hideStashTab();

            GIT.getCommitHistory({
              path: repository.path
            }, function (err, historyList) {
              this.repositoryHistory = historyList;
              this.loadingHistory = false;

              if (notification) {
                notification.close();
              }

              applyScope($scope);
              $scope.$broadcast('repositorychanged', selectedRepository);

            }.bind(this));

            this.commitNumber = 'counting';

            GIT.getCommitCount(repository.path,function (err, size) {

              if (err) {
                alert(MSGS['Error counting commits. Error: '] + err);
              } else {
                this.commitNumber = size;
                applyScope($scope);
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
          CommomService.selectedCommit = commit;

          this.loadingChanges = true;

          if (selectedCommit) {
            selectedCommit.selected = false;
          }

          commit.selected = true;
          selectedCommit = commit;

          CommomService.changesTabPanel.select(0);

          GIT.getDiff(opts, function (err, files) {
            this.commitHistory = [];

            files.forEach(function (file) {

              if (file.name) {

                if (!file.isBinary) {
                  var changesHTML = [];

                  if (file.additions > 0) {
                    changesHTML.push('<span class="plus-text"><span class="octicon octicon-diff-added"></span>', file.additions, '</span>');
                  }


                  if (file.deletions > 0) {
                    changesHTML.push('<span class="minor-text"><span class="octicon octicon-diff-removed"></span>', file.deletions, '</span>');
                  }

                  file.changes = $sce.trustAsHtml(changesHTML.join(''));
                } else {
                  file.changes = $sce.trustAsHtml(`
                  <span class="label-binary no-background">
                    <span class="octicon octicon-file-binary"></span> ${MSGS.BINARY}
                  </span>`);
                }

                this.commitHistory.push(file);
              }
            }.bind(this));

            this.loadingChanges = false;

            applyScope($scope);
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

        this.getCommitBody = function () {
          return selectedCommit.body;
        };

        this.showFileDiff = function (change, forceReload) {

          if (!change.code || forceReload) {

            if (!change.isUnsyc) {
              GIT.getFileDiff({

                file: change.name,
                hash: selectedCommit.hash,
                path: selectedRepository.path

              }, function (err, stdout) {

                if (err) {
                  alert(err.message);
                } else {
                  change.code = $sce.trustAsHtml(cp.processCode( stdout, change.path ));

                  if (change.showCode) {
                    change.showCode = false;
                  } else {
                    change.showCode = true;
                  }

                  applyScope($scope);
                  PR.prettyPrint();
                }
              });
            } else if (change.type != 'DELETED') {

              GIT.getUnsyncFileDiff({
                path: selectedRepository.path,
                file: change.path
              },
              function (err, diff) {

                if (err) {
                  alert(err);
                } else {
                  change.code = $sce.trustAsHtml(cp.processCode( diff, change.path ));

                  if (!forceReload) {
                    change.showCode = !change.showCode;
                  }
                }

                applyScope($scope);
                PR.prettyPrint();
              });
            }

          } else {
            change.showCode = !change.showCode;
          }
        };

        this.showStashFileDiff = function (stashFile) {

          if (!stashFile.code) {

            GIT.diffStashFile(selectedRepository.path, {
              fileName: stashFile.name,
              reflogSelector: this.stash.info.reflogSelector,
              callback: function (err, diff) {

                if (err) {
                  alert(err);
                } else {
                  stashFile.code = $sce.trustAsHtml(cp.processCode( diff, stashFile.path ));

                  if (stashFile.showCode) {
                    stashFile.showCode = false;
                  } else {
                    stashFile.showCode = true;
                  }
                }

                applyScope($scope);
                PR.prettyPrint();
              }
            });

          } else {
            stashFile.showCode = !stashFile.showCode;
          }
        };

        this.commitSelectedChanges = function (commitMessage, commitDescription, event) {

          if (commitMessage) {
            let selectedFiles = [];

            event.target.setAttribute('disabled', true);

            this.commitChanges.forEach(function (file) {
              if (file.checked) {
                selectedFiles.push(file.path);
              }
            });

            if (selectedFiles.length > 0) {

              GIT.add(selectedRepository.path, {
                files: selectedFiles,
                callback: function (error) {

                  if (error) {
                    alert(`${MSGS['Error adding files. Error:']} ${error.message}`);

                    event.target.removeAttribute('disabled');
                  } else {

                    GIT.commit(selectedRepository.path, {
                      message: commitMessage,
                      description: commitDescription,
                      callback: function (err) {
                        if (err) {
                          alert(MSGS['Error commiting changes. Error: '] + err);
                        } else {
                          this.showRepositoryInfo(selectedRepository, true);

                          this.setCommitMessage(null);
                          this.setCommitDescription(null);
                        }

                        event.target.removeAttribute('disabled');
                      }.bind(this)
                    });

                  }
                }.bind(this)
              });
            } else {
              event.target.removeAttribute('disabled');
            }
          }
        };

        this.setCommitMessage = function (value) {
          $scope.commitMessage = value;
        };

        this.setCommitDescription = function (value) {
          $scope.commitDescription = value;
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
                alert(MSGS['Error getting more history. Error: '] + err.message);
              } else {
                this.repositoryHistory = this.repositoryHistory.concat(historyList);

                applyScope($scope);
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
              item.isUnsyc = true;
              item.checked = true;

              this.commitChanges.push(item);
            }.bind(this));

            applyScope($scope);
          }
        }.bind(this));

        this.openRepositoryContextualMenu = function (event, repository, index) {
          let menu = new Menu();

          menu.append(new MenuItem({
            label: MSGS.Remove,
            click : function () {
              this.removeRepository(repository.type, index);
            }.bind(this)
          }));
          menu.append(new MenuItem({
            label: MSGS['Move to Trash'],
            click : function () {
              shell.moveItemToTrash(repository.path);
              this.removeRepository(repository.type, index);
            }.bind(this)
          }));
          menu.append(new MenuItem({ type: 'separator' }));
          menu.append(new MenuItem({
            label: MSGS['Show in folder'],
            click: function () {
              this.openItemInFolder( path.join(repository.path, '.git') );
            }.bind(this)
          }));

          menu.popup(event.x, event.y);
        };

        this.openHistoryContextualMenu = function (event, history, index) {
          let menu = new Menu();

          menu.append(new MenuItem({
            label: MSGS['Show in folder'],
            click: function () {
              this.openItemInFolder(path.join(selectedRepository.path, history.name.trim()));
            }.bind(this)
          }));
          menu.append(new MenuItem({ type: 'separator' }));
          menu.append(new MenuItem({
            label: MSGS['Copy selection'],
            role: 'copy'
          }));

          menu.popup(event.x, event.y);
        };

        this.openChangesContextualMenu = function (event, change, index) {
          var isUnknowChange = change.type == 'NEW',
            dir = change.path.trim(),
            menu = new Menu();

          if (change.type == 'ADDED' || change.staged) {

            menu.append(new MenuItem({
              label: MSGS['Unstage file'],
              click : function () {
                this.unstageFile(dir, index);
              }.bind(this)
            }));
          } else if (change.type == 'UNMERGED') {

            menu.append(new MenuItem({
              label: MSGS['Use ours'],
              click : function () {
                GIT.useOurs(selectedRepository.path, {
                  fileName: dir,
                  callback: function (err) {
                              if (err) {
                      alert(err);
                    } else {
                      this.refreshRepositoryChanges();
                    }
                  }.bind(this)
                });
              }.bind(this)
            }));
            menu.append(new MenuItem({
              label: MSGS['Use theirs'],
              click : function () {
                GIT.useTheirs(selectedRepository.path, {
                  fileName: dir,
                  callback: function (err) {
                    if (err) {
                      alert(err);
                    } else {
                      this.refreshRepositoryChanges();
                    }
                  }.bind(this)
                });
              }.bind(this)
            }));
            menu.append(new MenuItem({
              label: MSGS['Open merge tool'],
              click: function () {
                let settingCtrl = $scope.settingsCtrl;

                if (settingCtrl.globalGitConfigs['merge.tool'] || settingCtrl.localGitConfigs['merge.tool']) {

                  GIT.mergeTool(selectedRepository.path, function (err) {

                    if (err) {
                      alert(err);
                    } else {
                      this.refreshRepositoryChanges();
                    }
                  }.bind(this));
                } else {
                  const remote = require('remote');
                  const dialog = remote.require('dialog');
                  const browserWindow = remote.require('browser-window');

                  let currentWindow = browserWindow.getFocusedWindow();

                  dialog.showMessageBox(currentWindow,
                    {
                      type: 'info',
                      title: `${MSGS['Merge Tool not defined']}`,
                      message: `${MSGS['No Merge Tool is globaly or localy defined. You can easily set one by the Setting menu']}`,
                      buttons: [`${MSGS['Open Setting menu']}`, `${MSGS['Maybe later']}`]
                    },
                    function (response) {

                      if (response === 0) {
                        $scope.showSettingsPage();
                      }
                    }
                  );
                }
              }.bind(this)
            }));
            menu.append(new MenuItem({
              label: MSGS['Stage file'],
              click: function () {
                GIT.add(selectedRepository.path, {
                  files: dir,
                  callback: function (err) {
                    if (err) {
                      alert(err);
                    } else {
                      this.refreshRepositoryChanges();
                    }
                  }.bind(this)
                });
              }.bind(this)
            }));
          } else {
            menu.append(new MenuItem({
              label: MSGS.Discart,
              click : function () {
                this.discartChanges(dir, index, isUnknowChange);
              }.bind(this)
            }));

            menu.append(new MenuItem({
              label: MSGS['Assume unchanged'],
              click : function () {
                this.assumeUnchanged(dir, index);
              }.bind(this)
            }));
          }

          menu.append(new MenuItem({ type: 'separator' }));
          menu.append(new MenuItem({
            label: MSGS['Show in folder'],
            click: function () {
              this.openItemInFolder(path.join(selectedRepository.path, dir));
            }.bind(this)
          }));
          menu.append(new MenuItem({ type: 'separator' }));
          menu.append(new MenuItem({
            label: MSGS['Copy selection'],
            role: 'copy'
          }));

          menu.popup(event.x, event.y);
        };

        this.getChangeTypeClass = function (type) {

          switch (type) {
            case 'MODIFIED':
              return 'label-modified';

            case 'DELETED':
              return  'label-deleted';

            case 'NEW':
                return  'label-new';

            case 'RENAMED':
              return 'label-renamed';

            case 'ADDED':
              return 'label-added';

            case 'UNMERGED':
              return 'label-unmerged';
          }
        };

        this.discartChanges = function (filePath, index, isUnknow) {
          let files = {
            path: filePath,
            isUnknow: isUnknow,
          };

          GIT.discartChangesInFile(selectedRepository.path, {
            files: files,
            callback: function (error) {

              if (error) {
                alert(error);
              } else {
                this.commitChanges.splice(index, 1);
                applyScope($scope);
              }

              $scope.$broadcast('apprefreshed', this.commitChanges);
            }.bind(this)
          });
        };

        this.unstageFile = function (filePath, index) {

          GIT.unstageFile(selectedRepository.path, {

            file: filePath,

            callback: function (err) {

              if (err) {
                alert(err);
              } else {
                this.refreshRepositoryChanges();
              }
            }.bind(this)
          });
        };

        this.openItemInFolder = function (path) {
          shell.showItemInFolder(path);
        };

        this.removeRepository = function (repositoryType, index) {
          var repositoryWasSelected = CommomService.removeRepository(repositoryType, index);

          if (repositoryWasSelected) {
            this.repositoryHistory = [];
            $scope.$broadcast('removedRepository');
          }

          applyScope($scope);
        };

        this.assumeUnchanged = function (filePath, index) {

          GIT.assumeUnchanged(selectedRepository.path, {
            file: filePath,

            callback: function (err) {

              if (err) {
                alert(err);
              } else {
                this.commitChanges.splice(index, 1);
                applyScope($scope);
              }
            }.bind(this)
          });
        };

        this.onFocusCommitMessageInput = function () {

          if (!this.enableCommitBlock) {
            CommomService.changesTabPanel.select(1);
          }
        };

        this.expandAll = function (fileList) {

          fileList.forEach(function (file) {

            if (!file.showCode) {
              this.showFileDiff(file);
            }

          }.bind(this));
        };

        this.collapseAll = function (fileList) {

          fileList.forEach(function (file) {

            if (file.showCode) {
              this.showFileDiff(file);
            }

          }.bind(this));
        };

        this.discartAllSelected = function (fileList) {
          let files = [];

          for (let i = 0; i < fileList.length; i++) {

            if (fileList[i].checked && !fileList[i].staged) {
              files.push({
                path: fileList[i].path,
                isUnknow: (fileList[i].type == 'NEW'),
              });
            }
          }

          if (files.length > 0) {

            GIT.discartChangesInFile(selectedRepository.path, {
              files: files,
              callback: function (error) {

                if (error) {
                  alert(error);
                }

                this.refreshRepositoryChanges();
              }.bind(this)
            });
          }
        };

        this.refreshRepositoryChanges = function () {

          GIT.getStatus(selectedRepository.path, function (err, syncStatus, files) {
            var i = 0,
              deorderedFiles = {},
              newChangesList = [];

            for (i; i < files.length; i++) {

              if (this.commitChanges[i]) {

                if (files[i].path == this.commitChanges[i].path || deorderedFiles[ this.commitChanges[i].path ]) {

                  if (this.commitChanges[i].code) {
                    this.showFileDiff(this.commitChanges[i], true);
                  }

                  this.commitChanges[i].staged = files[i].staged;
                  this.commitChanges[i].type = files[i].type;

                  newChangesList.push(this.commitChanges[i]);

                } else {
                  deorderedFiles[ this.commitChanges[i] ] = this.commitChanges[i];
                  files[i].checked = true;
                  files[i].isUnsyc = true;
                  newChangesList.push(files[i]);
                }

              } else {
                files[i].checked = true;
                files[i].isUnsyc = true;
                newChangesList.push(files[i]);
              }
            }

            this.commitChanges = newChangesList;

            $scope.$broadcast('apprefreshed', this.commitChanges, syncStatus);
            applyScope($scope);
          }.bind(this));
        };

        this.hideStashTab = function () {
          CommomService.changesTabPanel.hidePanel(2);
        };

        this.showStashTab = function () {
          CommomService.changesTabPanel.showPanel(2);
        };

        this.isRepositoryListEmpty = function () {
          return CommomService.isRepoListEmpty();
        };

        // Listener to "showStashDiff" event fired on click View file on a Stash
        $scope.$on('showStashDiff', function (event, stash, files) {
          this.stash.info = stash;
          this.stash.files = [];

          files.forEach(function (file) {

            if (file.name) {

              if (!file.isBinary) {
                var changesHTML = [];

                if (file.additions > 0) {
                  changesHTML.push('<span class="plus-text"><span class="octicon octicon-diff-added"></span>', file.additions, '</span>');
                }


                if (file.deletions > 0) {
                  changesHTML.push('<span class="minor-text"><span class="octicon octicon-diff-removed"></span>', file.deletions, '</span>');
                }

                file.changes = $sce.trustAsHtml(changesHTML.join(''));
              } else {
                file.changes = $sce.trustAsHtml(`<span class="label-binary no-background"><span class="octicon octicon-file-binary"></span> ${MSGS.BINARY}</span>`);
              }

              this.stash.files.push(file);
            }
          }.bind(this));

          this.showStashTab();

          applyScope($scope);
        }.bind(this));

        /* Update the changed files ever time the application is focused */
        WIN.on('focus', function () {

          if (selectedRepository.path) {
            this.refreshRepositoryChanges();
          }
        }.bind(this));
      },

      controllerAs: 'appCtrl'
    };
  });

})();
