angular.module('chat').directive('navbar', function($http, $location, User) {
	return {
		restrict: 'A',
		templateUrl: 'partials/navbar.html',
		controller: function($scope) {
			$scope.User = User;
		}
	};
});