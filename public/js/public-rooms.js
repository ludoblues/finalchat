angular.module('chat').directive('publicRooms', function(User, RoomManager, SocketManager) {
	return {
		restrict: 'A',
		templateUrl: 'partials/public-rooms.html',
		scope: {},
		link: function(scope, element) {
      scope.RoomManager = RoomManager;

			scope.joinRoom = function(Room) {
				console.log('Join public-rooms');
				if (User.Rooms[Room._id]) {
					console.log('Room %s is already open', Room.name);
					return ;
				}

				SocketManager.Socket.emit('user-join-public-room', Room._id);
			};
		}
	};
});