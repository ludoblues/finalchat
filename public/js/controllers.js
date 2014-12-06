angular.module('chat').controller('AuthPageCtrl', function($scope, $http, $routeParams, $location, User, SocketManager, RoomManager) {
	if (User.is_authenticated) {
		$location.path('/chat');
		return ;
	}

	var defaultDate = new Date();
	defaultDate.setFullYear(new Date().getFullYear() - 18);
	$scope.Anonymous = {
		email: '',
		pseudo: '',
		password: '',
		birthday: defaultDate,
		cp: 0
	};

	$scope.register = function() {
		$http.post('/register', $scope.Anonymous) 
			.success(function(data, status, headers, config) {
				console.log('POST REGISTER done sucessfully', data);
				User.assign(data);
				
				User.is_authenticated = true;

				if (!SocketManager.is_connected) {
					SocketManager.startService();
					RoomManager.bindEvents();
				}

				//SocketManager.Socket.emit('user-join-chat', { _id : data._id, pseudo: data.pseudo, gender: data.gender });
				$location.path("/chat");
			})
			.error(function(data, status, headers, config) {
				console.log('POST Error');
				alert(data);
		  });
	};

	$scope.LoginUser = {
		email: '',
		password: ''
	};

	$scope.login = function() {
		$http.post('/login', $scope.LoginUser) 
			.success(function(data, status, headers, config) {
				console.log('POST login done sucessfully', data);
				User.assign(data);
				
				User.is_authenticated = true;
				
				if (!SocketManager.is_connected) {
					SocketManager.startService();
					RoomManager.bindEvents();
				}

				//SocketManager.Socket.emit('user-join-chat', { _id : data._id, pseudo: data.pseudo, gender: data.gender });
				$location.path("/chat");
			})
			.error(function(data, status, headers, config) {
				console.log('POST LoginError');
				alert(data);
		  });
	};
});

angular.module('chat').controller('ChatPageCtrl', function($location, User) {
	if (!User.is_authenticated) {
		$location.path('/auth');
	}
});

angular.module('chat').controller('AdminPageCtrl', function() {

});

angular.module('chat').controller('WelcomePageCtrl', function($scope, $http, $location, SocketManager, RoomManager, User) {
	if (!User.is_authenticated) {
		$location.path('/auth');
		return ;
	}

	$scope.User = User;

	$scope.connection = function() {
		if (!SocketManager.is_connected) {
			SocketManager.startService();
			RoomManager.bindEvents();
		}
		$location.path('/chat');
	}
});