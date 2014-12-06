angular.module('chat').factory('User', function($http, $q, $location/*, RoomClass*/) {
	var UserClass = function() {
		this.is_authenticated = false;

		this._id = '';	
		this.pseudo = '';
		this.gender = '';
		this.age = 0;
		this.city = '';

		this.Rooms = {};
		this.CurrentRoom = {};
	};

	UserClass.prototype.assign = function(UserData) {
		if (!UserData) {
			console.log('No data to assign !');
			return ;
		}

		this._id = UserData._id;
		this.pseudo = UserData.pseudo;
		this.gender = UserData.gender;
		this.age = UserData.age;
		this.city = UserData.city;
	};	

	UserClass.prototype.loadSession = function() {
		var deferred = $q.defer();

		$http.get('/loadSession')
			.success(function(UserSession, status, headers, config) {
				User.assign(UserSession.User);
				User.is_authenticated = true;

				/*
				if (!SocketManager.is_connected) {
					SocketManager.startService();
				}

				$location.path('/chat');
				*/

				deferred.resolve(User);
			})
			.error(function(reason, status, headers, config) {
				User.is_authenticated = false;
				
				//$location.path('/auth');

				deferred.reject('not found');
			});

		return deferred.promise;
	};

	UserClass.prototype.logout = function() {
		$http.delete('/logout')
			.success(function() {
				User.is_authenticated = false;
				localStorage.removeItem('User');
				$location.path('/auth');
			});
	};

	UserClass.prototype.addRoom = function(Room) {
		/*
		if (!Room instanceof RoomClass) {
			console.log('Invalid Room');
			return;
		}
		*/

		this.Rooms[Room._id] = Room;
	};

	UserClass.prototype.leaveRoom = function(room_id) {
		console.log(this.Rooms);

		delete this.Rooms[room_id];
	};

	var User = new UserClass();
	return User;
});