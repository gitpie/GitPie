'use strict';

var
  // nodejs child_process object
  cp = require('child_process'),

  // The executor of system process
  exec = cp.exec,

  // The executor of system process
  execSync = cp.execSync,

  ENV = process.env,

  wos = require('node-wos'),

  GitUrlParse = require('git-url-parse');

ENV.LANG = 'en_US';

/**
 * @class Git
 * Minimal wrapper to perform git operations
 */
function Git() {
  this.whoami = 'Git class that perform git operations';
}

/**
 * @private
 * @method invokeCallback
 * Verify if the callback param is a function an try to invoke it
 * @param {function} callback
 * @param {Array} args - Array of arguments
*/
function invokeCallback(callback, args) {

  if (callback && typeof callback == 'function') {
    callback.apply(this, args);
  }
}

/**
 * @method getCurrentBranch - Return current branch of a git repository
 *
 * @param  {string} path - Path of the git repository
 * @param  {function} callback - Callback to be execute in error or success case
 */
Git.prototype.getCurrentBranch = function (path, callback) {

  exec('git branch -r && git branch', { cwd: path, env: ENV }, function (error, stdout, stderr) {
    var err = null,
      lines = stdout.split('\n'),
      currentBranch,
      localBranches = [],
      remoteBranches = [],
      branchesDictionary = {};

    if (error !== null) {
      err = error;
    } else {

      for (let i = 0; i < lines.length; i++) {
        let isRemote = lines[i].indexOf('origin/') > -1;
        let isHEAD = lines[i].indexOf('HEAD ->') > -1;
        let existsInAnyList = branchesDictionary[ (lines[i].trim()) ];

        if (!existsInAnyList && !isHEAD && lines[i]) {

          if (isRemote) {
            lines[i] = lines[i].replace('origin/', '').trim();
            remoteBranches.push(lines[i]);
          } else {

            if (lines[i].indexOf('*') > -1) {
              lines[i] = lines[i].replace('*', '').trim();

              currentBranch = lines[i];
              continue;
            }

            localBranches.push(lines[i].trim());
          }

          branchesDictionary[ lines[i].trim() ] = lines[i].trim();
        }
      }
    }

    invokeCallback(callback, [ err, currentBranch, remoteBranches, localBranches ]);
  }.bind(this));
};

/**
 * @method getCommitHistory - Return a array with the commit history
 *
 * @param  {object} opts - Path of the git repository
 * - {string} path - Path of the git repository
 * - {Number} skip - Number of commits to skip
 * @param  {function} callback - Callback to be execute in error or success case
 */
Git.prototype.getCommitHistory = function (opts, callback) {
  var emoji = require('./emoji');

  exec(
    "git --no-pager log -n 50 --pretty=format:%an-gtseparator-%cr-gtseparator-%h-gtseparator-%s-gtseparator-%b-gtseparator-%ae-pieLineBreak-" + (opts.skip ? ' --skip '.concat(opts.skip) : '' ),

    { cwd: opts.path, env: ENV },

    function (error, stdout, stderr) {
    var lines = stdout.split('-pieLineBreak-'),
      historyList = [],
      err = null;

    if (error !== null) {
      err = error;
    } else {

      for (var i = 0; i < lines.length; i++) {

        if (lines[i] !== '') {
          var historyItem = lines[i].split('-gtseparator-');

          historyList.push({
            user: historyItem[0],
            date: historyItem[1],
            hash: historyItem[2],
            message: emoji.parse(historyItem[3]),
            body: historyItem[4],
            email: historyItem[5]
          });
        }
      }
    }

    invokeCallback(callback, [err, historyList] );
  }.bind(this));
};

/**
 * @method getStatus - Return the status of the repository
 *
 * @param  {string} path - Path of the git repository
 * @param  {function} callback - Callback to be execute in error or success case
 */
Git.prototype.getStatus = function (path, callback) {

  exec('git status -sb', {cwd: path, env: ENV}, function (error, stdout, stderr) {
    var err = null,
      syncStatus = {
        ahead: null,
        behind: null
      },
      files = [],
      lines = stdout.split('\n'),
      unsynChanges,
      unsyncParts;

    if (error !== null) {
      err = error;
    }

    // First line ever is the sync numbers status
    unsynChanges = lines[0].substring(lines[0].lastIndexOf("[") + 1, lines[0].lastIndexOf("]"));

    unsyncParts = unsynChanges.split(',');

    unsyncParts.forEach(function (i) {
      var item = i.trim();

      if (item.indexOf('ahead') > -1) {
        syncStatus.ahead = item.substring(item.lastIndexOf('ahead') + 5, item.length).trim();
      } else if (item.indexOf('behind') > -1) {
        syncStatus.behind = item.substring(item.lastIndexOf('behind ') + 6, item.length).trim();
      }
    });

    for (var i = 1; i < lines.length; i++) {
      let staged = false,
        referenceChar;

      if (lines[i][0] != ' ' && lines[i][0] != '?') {
        referenceChar = lines[i][0];
        staged = true;
      } else {
        referenceChar = lines[i][1];
      }

      switch (referenceChar) {
        case 'R':
          files.push({
            type: 'RENAMED',
            displayPath: lines[i].replace('R', '').replace(/"/g, '').trim(),
            path: lines[i].replace('R', '').replace(/"/g, '').split('->')[1].trim(),
            staged: staged
          });
          break;

        case 'M':
          files.push({
            type: 'MODIFIED',
            displayPath: lines[i].replace('M', '').replace(/"/g, '').trim(),
            path: lines[i].replace('M', '').replace(/"/g, '').trim(),
            staged: staged
          });
          break;

          case '?':
            files.push({
              type: 'NEW', //UNTRACKED
              displayPath: lines[i].replace('??', '').replace(/"/g, '').trim(),
              path: lines[i].replace('??', '').replace(/"/g, '').trim(),
              staged: staged
            });
            break;

          case 'A':
            files.push({
              type: 'ADDED',
              displayPath: lines[i].replace('A', '').replace(/"/g, '').trim(),
              path: lines[i].replace('A', '').replace(/"/g, '').trim(),
              staged: staged
            });
            break;

          case 'D':
            files.push({
              type: 'DELETED',
              displayPath: lines[i].replace('D', '').replace(/"/g, '').trim(),
              path: lines[i].replace('D', '').replace(/"/g, '').trim(),
              staged: staged
            });
            break;

          case 'U':
            files.push({
              type: 'UNMERGED',
              displayPath: lines[i].replace('UU', '').replace(/"/g, '').trim(),
              path: lines[i].replace('UU', '').replace(/"/g, '').trim(),
              // staged: staged TODO: Improve indicators to UNMERGED files
            });
            break;
      }
    }

    invokeCallback(callback, [ err, syncStatus, files ]);
  });
};

/**
 * @method fetch - Fetch with --prune flag the repository
 *
 * @param  {string} path - Path of the git repository
 * @param  {function} callback - Callback to be execute in error or success case
 */
Git.prototype.fetch = function (path, callback) {

  exec('git fetch --prune', {cwd: path, env: ENV}, function (error, stdout, stderr) {
    var err = null;

    if (error) {
      err = error.message;
    }

    invokeCallback(callback, [ err ]);
  });
};

Git.prototype.getDiff = function (opts, callback) {

  exec('git diff --numstat ' + opts.ancestorHash + ' ' + opts.hash, { cwd: opts.path, env: ENV}, function (error, stdout, stderr) {
    var err = null,
      files = [];

    if (error !== null) {
      err = error;
    } else {
      var lines = stdout.split('\n');

      lines.forEach(function (line) {

        if (line) {
          var props = line.split('\t');

          files.push({
            name: props[2],
            additions: parseInt(props[0]),
            deletions: parseInt(props[1]),
            isBinary: (props[0] == '-' || props[1] == '-') ? true : false
          });
        }
      });
    }

    invokeCallback(callback, [ err, files ]);
  });
};

Git.prototype.getUnsyncFileDiff = function (opts, callback) {
  opts = opts || {};
  var path = opts.path,
    file = opts.file;

  exec('git diff HEAD "'.concat(file.trim()).concat('"'), { cwd: path,  env: ENV}, function(error, stdout, stderr) {
    var err = null;

    if (error !== null) {
      err = error;
    }

    invokeCallback(callback, [ err, stdout ]);
  });
};

Git.prototype.getFileDiff = function (opts, callback) {

  exec('git log --format=\'%N\' -p -1 '.concat(opts.hash).concat(' -- "').concat(opts.file).concat('"'), { cwd: opts.path, env: ENV}, function (error, stdout, stderr) {
    var err = null;

    if (error !== null) {
      err = error;
    }

    if (callback && typeof callback == 'function') {
      invokeCallback(callback, [ err, stdout ]);
    }
  });
};

Git.prototype.sync = function (opts, callback) {
  opts = opts || {};

  this.listRemotes(opts.path, function (err, repositoryRemotes) {
    var gitFetchURL = GitUrlParse(repositoryRemotes.origin.fetch);
    var gitPushURL = GitUrlParse(repositoryRemotes.origin.push);
    var fetchOrigin = 'origin';
    var pushOrigin = 'origin';

    if (gitFetchURL.protocol == 'https' && opts.httpsConfigs) {
      fetchOrigin = 'https://' + opts.httpsConfigs.username + ':' + opts.httpsConfigs.password + '@' + gitFetchURL.source + gitFetchURL.pathname;
    }

    if (gitPushURL.protocol == 'https' && opts.httpsConfigs) {
      pushOrigin = 'https://' + opts.httpsConfigs.username + ':' + opts.httpsConfigs.password + '@' + gitPushURL.source + gitPushURL.pathname;
    }

    if (opts.setUpstream) {

      if (gitPushURL.protocol == 'https' && !opts.httpsConfigs) {
        invokeCallback(opts.noHTTPAuthcallback, [gitFetchURL, gitPushURL]);
      } else {
        exec('git push -u '.concat(pushOrigin).concat(' ').concat(opts.branch), { cwd: opts.path,  env: ENV}, function (error) {
          invokeCallback(callback, [ error ]);
        });
      }
    } else {

      exec('git pull '.concat(fetchOrigin), { cwd: opts.path,  env: ENV}, function (error, stdout, stderr) {

        if (error) {

          invokeCallback(callback, [ error ]);
        } else if (opts.push) {

          if (gitPushURL.protocol == 'https' && !opts.httpsConfigs) {
            invokeCallback(opts.noHTTPAuthcallback, [gitFetchURL, gitPushURL]);
          } else {
            exec('git push '.concat(pushOrigin).concat(' ').concat(opts.branch), { cwd: opts.path,  env: ENV}, function (error) {
              invokeCallback(callback, [ error ]);
            });
          }
        } else {

          invokeCallback(callback, [ error ]);
        }
      });
    }
  });
};

Git.prototype.add = function (path, opts) {

  if (opts.forceSync) {
    return execSync('git add "'.concat(opts.file).concat('"'), { cwd: path});
  } else {

    exec(
      'git add "'.concat(opts.file).concat('"'),
      { cwd: path}, function (error, stdout, stderr) {
      var err = null;

      if (error !== null) {
        err = error;
      }

      invokeCallback(opts.callback, [ err ]);
    });
  }
};

Git.prototype.commit = function (path, opts) {
  var commad = 'git commit -m "'.concat( (opts.message.replace(/"/g, '\\"')) ).concat('"');

  if (opts.description) {

    if (wos.isWindows()) {
      commad = commad + ' -m "' + opts.description.replace(/"/g, '\\"').replace(/\n/g, '" -m "') + '"';
    } else {
      commad = commad.concat(' -m "').concat( (opts.description.replace(/"/g, '\\"')) ).concat('"');
    }
  }

  if (opts.forceSync) {
    return execSync(commad, { cwd: path});
  } else {

    exec(commad, { cwd: path}, function (error, stdout, stderr) {
      var err = null;

      if (error !== null) {
        err = error;
      }

      invokeCallback(opts.callback, [ err ]);
    });
  }
};

Git.prototype.switchBranch = function (opts, callback) {
  opts = opts || {};
  var path = opts.path,
    branch = opts.branch,
    forceCreateIfNotExists = opts.forceCreateIfNotExists;

  if (opts.forceSync) {
    execSync('git checkout ' + (forceCreateIfNotExists ? ' -b ': '') + branch, { cwd: path,  env: ENV});
  } else {

    exec('git checkout ' + (forceCreateIfNotExists ? ' -b ': '') + branch, { cwd: path,  env: ENV}, function(error, stdout, stderr) {
      var err = null;

      if (error !== null) {
        err = error.message;
      }

      invokeCallback(callback, [ err ]);
    });
  }
};

Git.prototype.getCommitCount = function (path, callback) {

  exec('git rev-list HEAD --count', { cwd: path,  env: ENV}, function  (error, stdout, stderr){
    var err = null;

    if (error !== null) {
      err = error.message;
    }

    invokeCallback(callback, [ err, stdout ]);
  });
};

Git.prototype.showRemotes = function (path, callback) {

  exec('git remote -v', { cwd: path,  env: ENV}, function (error, stdout, stderr) {
    var err = null;

    if (error !== null) {
      err = error.message;
    }

    invokeCallback(callback, [ err, stdout ]);
  });
};

Git.prototype.listRemotes = function (path, callback) {

  exec('git remote show', { cwd: path,  env: ENV}, function (error, stdout, stderr) {
    var err = null,
      repositoryRemotes = {};

    if (error !== null) {
      err = error.message;

      invokeCallback(callback, [ err, repositoryRemotes ]);
    } else {
      var remoteShowLines = stdout.split('\n');

      remoteShowLines.forEach(function (line) {

        if (line) {
          repositoryRemotes[ line.trim() ] = {};
        }
      });

      this.showRemotes(path, function (err, remotes) {

        if (!err) {
          var remoteList = remotes.split('\n');

          for (var remote in repositoryRemotes) {

            remoteList.forEach(function (remoteLine) {

              if (remoteLine.indexOf(remote) > -1) {

                if (remoteLine.indexOf('(push)') > -1) {
                  repositoryRemotes[remote].push = remoteLine.replace('(push)', '').replace(remote, '').trim();
                } else if (remoteLine.indexOf('(fetch)')) {
                  repositoryRemotes[remote].fetch = remoteLine.replace('(fetch)', '').replace(remote, '').trim();
                }
              }
            });
          }
        }

        invokeCallback(callback, [ err, repositoryRemotes ]);
      });
    }
  }.bind(this));
};

Git.prototype.discartChangesInFile = function (path, opts) {
  var command;

  opts = opts || {};

  if (opts.isUnknow) {
    command = 'git clean -df "'.concat(opts.file.trim()).concat('"');
  } else {
    command = 'git checkout -- "'.concat(opts.file.trim()).concat('"');
  }

  if (opts.forceSync) {
    return execSync(command, { cwd: path,  env: ENV });
  } else {

    exec(command, { cwd: path,  env: ENV}, function (error, stdout, stderr) {
      var err = null;

      if (error !== null) {
        err = error.message;
      }

      invokeCallback(opts.callback, [ err, stdout ]);
    });
  }
};

Git.prototype.unstageFile = function (path, opts) {
  opts = opts || {};

  var command = 'git reset "'.concat(opts.file.trim()).concat('"');

  exec(command, { cwd: path,  env: ENV}, function (error, stdout, stderr) {
    var err = null;

    if (error !== null) {
      err = error.message;
    }

    invokeCallback(opts.callback, [ err, stdout ]);
  });
};

Git.prototype.getTag = function (path, callback) {

  exec('git tag', { cwd: path,  env: ENV}, function (error, stdout, stderr) {
    var err = null,
      tags = [];

    if (error !== null) {
      err = error.message;
    } else {
      var lines = stdout.split('\n');

      lines.forEach(function (tag) {

        if (tag !== '') {
          tags.push(tag);
        }
      });
    }

    invokeCallback(callback, [ err, tags ]);
  });
};

Git.prototype.assumeUnchanged = function (path, opts) {

  exec(' git update-index --assume-unchanged "'.concat(opts.file).concat('"'), { cwd: path,  env: ENV}, function (error, stdout, stderr) {
    var err = null;

    if (error !== null) {
      err = error.message;
    }

    invokeCallback(opts.callback, [ err ]);
  });
};

Git.prototype.clone = function (opts) {
  opts = opts || {};

  exec('git clone --recursive '.concat(opts.cloneURL), { cwd: opts.destinyFolder,  env: ENV}, function (error, stdout, stderr) {
    var err = null;

    if (error !== null) {
      err = error.message;
    }

    invokeCallback(opts.callback, [ err ]);
  });
};

Git.prototype.reset = function (path, opts) {

  exec('git reset --soft '.concat(opts.hash), { cwd: path,  env: ENV}, function (error, stdout, stderr) {
    var err = null;

    if (error !== null) {
      err = error.message;
    }

    invokeCallback(opts.callback, [ err ]);
  });
};

Git.prototype.createRepository = function (opts) {
  var fs = require('fs'),
    path = require('path'),
    err = null;

  opts = opts || {};

  fs.writeFile( path.join(opts.repositoryHome, '.gitignore'), '// # Logs and databases # \n ####################### \n *.log \n *.sql \n .sqlite', 'utf8', function (errFile) {

    if (errFile) {
      err = errFile.message;

      if (opts.callback && typeof opts.callback == 'function') {
        opts.callback.call(this, err);
      }
    } else {

      try {
        execSync('git init', { cwd: opts.repositoryHome,  env: ENV});

        this.switchBranch({
          path: opts.repositoryHome,
          branch: 'master',
          forceCreateIfNotExists: true,
          forceSync: true
        });

        this.add(opts.repositoryHome, {
          forceSync: true,
          file: '.gitignore'
        });

        this.commit(opts.repositoryHome, {
          forceSync: true,
          file: '.gitignore',
          message: '.gitignore'
        });
      } catch (error) {
        err = error.message;
      }

      invokeCallback(opts.callback, [ err ]);
    }

  }.bind(this));
};

Git.prototype.getStashList = function (path, callback) {

  exec('git stash list --pretty=format:%gd-gtseparator-%gn-gtseparator-%gs', { cwd: path,  env: ENV}, function (error, stdout, stderr) {
    var err = null,
      stashs = [];

    if (error !== null) {
      err = error.message;
    } else {
      var lines = stdout.split('\n');

      lines.forEach(function (stash) {

        if (stash !== '') {
          var stashInfo = stash.split('-gtseparator-');

          stashs.push({
            reflogSelector: stashInfo[0],
            author: stashInfo[1],
            subject: stashInfo[2]
          });
        }
      });
    }

    invokeCallback(callback, [ err, stashs ]);
  });
};

Git.prototype.stashChanges = function (path, callback) {

  exec('git stash', {cwd: path, env: ENV}, function (error) {
    invokeCallback(callback, [ error ]);
  });
};

Git.prototype.dropStash = function (path, opts) {

  exec('git stash drop '.concat(opts.reflogSelector), {cwd: path, env: ENV}, function (error) {
    invokeCallback(opts.callback, [ error ]);
  });
};

Git.prototype.popStash = function (path, opts) {

  exec('git stash pop '.concat(opts.reflogSelector), {cwd: path, env: ENV}, function (error) {
    invokeCallback(opts.callback, [ error ]);
  });
};

Git.prototype.showStash = function (path, opts) {

  exec('git stash show '.concat(opts.reflogSelector).concat(' --numstat'), {cwd: path, env: ENV}, function (error, stdout) {
    var lines = stdout.split('\n'),
      files = [];

    lines.forEach(function (line) {

      if (line) {
        var props = line.split('\t');

        files.push({
          name: props[2],
          additions: parseInt(props[0]),
          deletions: parseInt(props[1]),
          isBinary: (props[0] == '-' || props[1] == '-') ? true : false
        });
      }
    });

    invokeCallback(opts.callback, [ error, files ]);
  });
};

Git.prototype.diffStashFile = function (path, opts) {

  exec('git diff '.concat(opts.reflogSelector).concat(' -- "').concat(opts.fileName.trim()).concat('"'), {cwd: path, env: ENV}, function (error, stdout) {
    invokeCallback(opts.callback, [ error, stdout ]);
  });
};

Git.prototype.getGlobalConfigs = function (callback) {

  exec('git config --global -l', {env: ENV}, function (error, stdout) {
    var err,
      configs = {};

    if (error) {
      err = error;
    } else {
      var lines = stdout.split('\n');

      lines.forEach(function (line) {

        if (line) {
          var config = line.split('=');

          configs[config[0].trim()] = config[1].trim();
        }
      });
    }

    invokeCallback(callback, [ err, configs ]);
  });
};

Git.prototype.getLocalConfigs = function (path, callback) {

  exec('git config -l', {cwd: path, env: ENV}, function (error, stdout) {
    var err,
      configs = {};

    if (error) {
      err = error;
    } else {
      var lines = stdout.split('\n');

      lines.forEach(function (line) {

        if (line) {
          var config = line.split('=');

          configs[config[0].trim()] = config[1].trim();
        }
      });
    }

    invokeCallback(callback, [ err, configs ]);
  });
};

Git.prototype.alterGitConfig = function (path, opts) {
  var command,
    execOpts = {
      env: ENV
    },
    concatConfig = function (name, value) {

      if (value) {

        if (command) {
          command = command.concat(' && ');
        } else {
          command = '';
        }

        command = command.concat('git config ');

        if (opts.global) {
          command = command.concat('--global ');
        }

        command = command.concat(name).concat(' ').concat(value);
      }
    };

  opts = opts || {};

  concatConfig('user.name', `"${opts.username}"`);
  concatConfig('user.email', `"${opts.email}"`);

  if (opts.mergeTool) {
    concatConfig('merge.tool', opts.mergeTool);

    if (wos.isWindows()) {
      // TODO
    } else {
      concatConfig(`mergetool.${opts.mergeTool}.cmd`, `'${opts.mergeTool} "$LOCAL" "$MERGED" "$REMOTE"'`);
      concatConfig(`mergetool.${opts.mergeTool}.trustExitCode`, 'true');
    }
  }

  if (!opts.global) {
    execOpts.cwd = path;
  }

  if (command) {

    exec(command, execOpts, function (error) {
      invokeCallback(opts.callback, [  ]);
    });
  }
};

Git.prototype.useOurs = function (path, opts) {
  opts = opts || {};

  exec('git checkout --ours '.concat(opts.fileName), {cwd: path, env: ENV}, function (error) {
    invokeCallback(opts.callback, [ error ]);
  });
};

Git.prototype.useTheirs = function (path, opts) {
  opts = opts || {};

  exec('git checkout --theirs '.concat(opts.fileName), {cwd: path, env: ENV}, function (error) {
    invokeCallback(opts.callback, [ error ]);
  });
};

Git.prototype.deleteBranch = function (path, opts) {
  opts = opts || {};

  exec('git branch -D '.concat(opts.branchName), {cwd: path, env: ENV}, function (error) {
    invokeCallback(opts.callback, [ error ]);
  });
};

Git.prototype.geDiffMerge = function (path, opts) {
  opts = opts || {};

  exec('git diff '.concat(opts.branchCompare).concat(' --numstat --shortstat'), {cwd: path, env: ENV}, function (error, stdout) {

    if (error) {
      invokeCallback(opts.callback, [ error ]);
    } else {
      let diffInformation = {
        shortstat: null,
        files: []
      };
      let lines = stdout.split('\n');

      for (let i = 0; i < (lines.length - 2); i++) {

        if (lines[i]) {
          let props = lines[i].split('\t');

          diffInformation.files.push({
            name: props[2],
            additions: parseInt(props[0]),
            deletions: parseInt(props[1]),
            isBinary: (props[0] == '-' || props[1] == '-') ? true : false
          });
        }
      }

      diffInformation.shortstat = lines[ (lines.length - 2) ];

      invokeCallback(opts.callback, [ error, diffInformation ]);
    }
  });
};

Git.prototype.merge = function (path, opts) {
  opts = opts || {};

  exec('git merge '.concat(opts.branchCompare), {cwd: path, env: ENV}, function (error, stdout, stderr) {
    let isConflituosMerge = false;

    if (error && stdout.toString().indexOf('Automatic merge failed') > -1) {
      isConflituosMerge = true;
    }

    invokeCallback(opts.callback, [ error, stdout, isConflituosMerge ]);
  });
};

Git.prototype.mergeAbort = function (path, callback) {

  exec('git merge --abort', {cwd: path, env: ENV}, function (error) {
    invokeCallback(callback, [ error ]);
  });
};

Git.prototype.isMerging = function (path) {
  let fs = require('fs');
  let pathModule = require('path');

  try {
    let statRepository = fs.statSync( pathModule.join(path, '.git', 'MERGE_HEAD') );

    return statRepository.isFile();
  } catch (err) {
    return false;
  }
};

Git.prototype.mergeTool = function (path, callback) {

  exec('git mergetool', {cwd: path, env: ENV}, function (error) {
    invokeCallback(callback, [ error ]);
  });
};

module.exports = new Git();
