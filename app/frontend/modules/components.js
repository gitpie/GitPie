(function () {
  angular.module('components', [])

  .directive('tabs', function() {
    return {
      restrict: 'E',
      transclude: true,
      scope: {},
      controller: function($scope, $element) {
        var panes = $scope.panes = [];

        $scope.select = function(pane) {
          angular.forEach(panes, function(pane) {
            pane.selected = false;
          });
          pane.selected = true;
        };

        this.addPane = function(pane) {
          if (panes.length === 0) $scope.select(pane);
          panes.push(pane);
        };
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
      scope: { paneTitle: '@', icon: '@'},
      link: function(scope, element, attrs, tabsController) {
        tabsController.addPane(scope);
      },
      templateUrl: 'app/frontend/view/components/pane.html',
      replace: true
    };
  })

  .directive('pieDialog', function() {
    var template = [
      '<div class="modal" ng-show="show">',
        '<div class="modal-overlay" ng-click="hideModal()"></div>',
        '<div class="modal-dialog" ng-style="dialogStyle">',
          '<div class="modal-close" ng-click="hideModal()"><span class="octicon octicon-x"></span></div>',
          '<div class="modal-dialog-content" ng-transclude></div>',
        '</div>',
      '</div>'
    ].join('');

    return {
      restrict: 'E',
      scope: {
        show: '='
      },
      replace: true, // Replace with the template below
      transclude: true, // we want to insert custom content inside the directive
      link: function($scope, $element, $attrs) {

        if ($attrs.width)
          $scope.dialogStyle.width = $attrs.width;
        if ($attrs.height)
          $scope.dialogStyle.height = $attrs.height;

        $scope.hideModal = function() {
          $scope.show = false;
        };
      },
      template: template
    };
  });

})();
