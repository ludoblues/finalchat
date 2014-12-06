(function() {
	var chat = angular.module('chat', [ 'ngRoute' ]);

	angular.module('chat').run(function($location, User, SocketManager) {
		User.loadSession()
			.then(function(UserSession) {
				console.log('Got session ', UserSession);
				$location.path('/welcome');
			}, function(err) {
				console.log('Any session found.');
				$location.path('/auth');
			})
	});
})();
