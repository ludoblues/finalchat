angular.module('chat').config(function($routeProvider) {
	$routeProvider.
	  when('/', {
	    templateUrl: '/partials/chat.html',
	    controller: 'ChatPageCtrl'
	  }).
	  when('/auth', {
	    templateUrl: '/partials/auth.html',
	    controller: 'AuthPageCtrl'
	  }).
	  when('/admin', {
	    templateUrl: '/partials/admin.html',
	    controller: 'AdminPageCtrl'
	  }).
	  when('/welcome', {
	    templateUrl: '/partials/welcome.html',
	    controller: 'WelcomePageCtrl'
	  }).
	  otherwise({
	    redirectTo: '/'
	  });
	});