angular.module('chat').directive('roomsTabs', function() {
	return {
		restrict: 'A',
		templateUrl: 'partials/rooms-tabs.html',
		controller: function($scope, User, RoomManager, MessageClass, SocketManager) {
			$scope.User = User;

			$scope.switch = function(Room) {
				Room.unreadMessage = false;
				User.CurrentRoom = Room;
			};

			$scope.leaveRoom = function(Room) {
				console.log('Room: ', Room);
				var Users = Room.Users.filter(function(_User) { return _User._id });
				SocketManager.Socket.emit('user-leave-room', { _id: Room._id, privacy: Room.privacy });
			};
		}
	};
});