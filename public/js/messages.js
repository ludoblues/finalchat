angular.module('chat').directive('messages', function(User) {
	return {
		restrict: 'A',
		templateUrl: 'partials/messages.html',
		controller: function($scope) {
			$scope.User = User;
		}
	};
});