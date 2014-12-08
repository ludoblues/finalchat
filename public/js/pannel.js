angular.module('chat').directive('pannel', function($http, User, MessageClass, SocketManager) {
	return {
		restrict: 'A',
		templateUrl: 'partials/pannel.html',
		controller: function($scope) {
			$scope.message = '';
			$scope.User = User;
			
			$scope.sendMessage = function(text) {
				var Message = new MessageClass({ room_id: User.CurrentRoom._id, privacy: User.CurrentRoom.privacy, author: { _id: User._id, pseudo: User.pseudo, gender: User.gender }, text: text });
				SocketManager.Socket.emit('user-send-message', Message);
				$scope.message = '';
			};

			$scope.call = function() {
				console.log('CALL...');
				var Room = User.CurrentRoom;
				var OtherUser = Room.Users[0]._id === User._id ? Room.Users[0]._id : Room.Users[1]._id;

				var OtherUser = Room.getOtherUserFromId(User._id);
				Room.turnCameraOn(OtherUser._id)
					.then(function() {

					}, function() {

					}, function() {
						console.log('Notify turn camera on...');
					});
			};	
		}
	};
});