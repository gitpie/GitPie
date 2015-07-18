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
  })

  .directive('ngLoading', function () {

    return function(scope, element, attrs) {
      var loadingContainer = angular.element([
        '<div class="loading-container">',
          '<svg class="spinner" width="65px" height="65px" viewBox="0 0 66 66" xmlns="http://www.w3.org/2000/svg">',
             '<circle class="path" fill="none" stroke-width="6" stroke-linecap="round" cx="33" cy="33" r="30"></circle>',
          '</svg>',
        '</div>'
      ].join(''));

      element.append(loadingContainer);

      scope.$watch(attrs.ngLoading, function(isLoading) {

         if (isLoading) {
           console.log(element);
          //  img.removeClass('ng-hide');
          //  element.addClass('loading');
          //  element.attr('disabled', '');
         } else {
          //  img.addClass('ng-hide');
          //  element.removeClass('loading');
          //  element.removeAttr('disabled');
         }
      });
    };
  });

})();
