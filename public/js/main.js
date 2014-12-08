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

	angular.module('chat')
    .filter('isEmpty', function () {
        var bar;
        return function(obj) {
            for (bar in obj) {
                if (obj.hasOwnProperty(bar)) {
                    return false;
                }
            }
            return true;
        };
    });
})();
