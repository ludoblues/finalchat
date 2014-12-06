angular.module('chat').directive('privateRooms', function(User, RoomManager, SocketManager) {
	return {
		restrict: 'A',
		templateUrl: 'partials/private-rooms.html',
		scope: {},
		link: function(scope, element) {
      scope.RoomManager = RoomManager;

			scope.joinRoom = function(Room) {
				console.log('Join private-rooms');
				if (User.Rooms[Room._id]) {
					console.log('Room %s is already open', Room.name);
					return ;
				}

				SocketManager.Socket.emit('user-join-private-room', Room._id);
			};
    }
	};
});