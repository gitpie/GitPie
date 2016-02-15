(function () {
  angular.module('components', [])

  .directive('tabs', function() {
    return {
      restrict: 'E',
      transclude: true,
      scope: {},
      controller: function($scope, $element, CommomService) {
        var panes = $scope.panes = [];

        if ($element.attr('id') == 'chagesTabPanel') {
          CommomService.changesTabPanel = $scope;
        }

        $scope.select = function(pane) {
          var selectedPane;

          angular.forEach(panes, function(pane) {
            pane.selected = false;
          });

          if (typeof pane == 'number') {
            panes[pane].selected = true;
            selectedPane = panes[pane];
          } else {
            selectedPane = pane;
            pane.selected = true;
          }

          if ($element.attr('id') == 'chagesTabPanel') {
            $scope.$root.appCtrl.enableCommitBlock = selectedPane.paneTitle == $scope.$root.MSGS.Changes;
          }
        };

        this.addPane = function(pane) {
          if (panes.length === 0) $scope.select(pane);

          pane.showTab = (pane.showPane == 'false' ? false : true);

          panes.push(pane);
        };

        $scope.hidePanel = function (paneIndex) {
          panes[paneIndex].selected = false;
          panes[paneIndex].showTab = false;
          panes[ (paneIndex-1) ].selected = true;

          $scope.select( (paneIndex-1) );
        };

        $scope.showPanel = function (paneIndex) {
          panes[paneIndex].showTab = true;

          $scope.select(paneIndex);
        }.bind(this);
      },
      templateUrl: 'app/frontend/view/components/tabs.html',
      replace: true
    };
  })

  .directive('pane', function() {
    return {
      require: '^tabs',
      restrict: 'E',
      transclude: true,
      scope: { paneTitle: '@', icon: '@', showPane: '@'},
      link: function(scope, element, attrs, tabsController) {
        tabsController.addPane(scope);
      },
      templateUrl: 'app/frontend/view/components/pane.html',
      replace: true
    };
  })

  .directive('loadingIcon', function () {

    return {
      restrict: 'E',
      scope: {},
      replace: true,
      templateUrl: 'app/frontend/view/components/loading-icon.html',
    };
  });

})();
