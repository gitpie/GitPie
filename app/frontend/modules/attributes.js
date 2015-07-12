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
  })

  .directive('ngInputChange', function ($parse) {

    return {
      restrict: 'A',
      require: '?ngModel',

      link: function(scope, element, attrs, ngModel) {

        element.on('change', function (e) {

          if (ngModel) {
            ngModel.$setViewValue(e.srcElement.value);
          }
        });
      }
    };

    // return function (scope, element, attrs) {
    //   var fn = $parse(attrs.ngInputChange);
    //
    //   element.bind('change', function (event) {
    //
    //     scope.$apply(function() {
    //       event.preventDefault();
    //       fn(scope, {$event:event});
    //     });
    //   });
    // };
  });

})();
