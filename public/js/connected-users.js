angular.module('chat').directive('connectedUsers', function(User, RoomManager) {
	return {
		restrict: 'A',
		templateUrl: 'partials/connected-users.html',
		scope: {},
		link: function(scope, element) {
			console.log(User.CurrentRoom);
      scope.User = User;
    }
	};
});