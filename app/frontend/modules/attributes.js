(function () {
  angular.module('attributes', [])

  .directive('ngRightClick', function($parse) {

    return function(scope, element, attrs) {
      var fn = $parse(attrs.ngRightClick);

      element.bind('contextmenu', function(event) {

        scope.$apply(function() {
          event.preventDefault();
          fn(scope, {$event:event});
        });
      });
    };
  })

  .directive('ngScroll', function ($parse) {

    return function (scope, element, attrs) {
      var fn = $parse(attrs.ngScroll);

      element.bind('scroll', function (event) {

        scope.$apply(function() {
          event.preventDefault();
          fn(scope, {$event:event});
        });
      });
    };
  });

})();
