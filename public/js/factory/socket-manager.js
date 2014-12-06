angular.module('chat').factory('SocketManager', function(/*$rootScope, User, MessageClass, RoomClass, RoomManager*/) {
	function SocketManagerClass() {
		this.Socket = {};
		this.is_connected = false;
	}

	SocketManagerClass.prototype.startService = function() {
		this.connect();
		this.bindEvents();
		this.initServices();
	};

	SocketManagerClass.prototype.connect = function() {
		this.Socket = io.connect('http://localhost:3000');

		this.Socket.on('connect', function() {
			console.log('Connection suceed !');
      this.is_connected = true;
    }.bind(this));
    
    this.Socket.on('error', function(reason) {
    	console.log('Connection failed: ', reason);
      this.is_connected = false;
    }.bind(this));
	};

	SocketManagerClass.prototype.bindEvents = function() {
	};

	SocketManagerClass.prototype.initServices = function() {
		this.Socket.emit('init-services');
	};

	var SocketManager = new SocketManagerClass();
	return SocketManager;
});