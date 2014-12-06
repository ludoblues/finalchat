angular.module('chat').factory('RoomManager', function($rootScope, $sce, User, MessageClass, RoomClass, MessageClass, SocketManager) {
	var RoomManagerClass = function() {
		this.Rooms = {
			Public: {},
			Private: {}
		};
		this.Users = {};

		this.CurrentRoom = {};
	};

	RoomManagerClass.prototype.bindEvents = function() {
		SocketManager.Socket.on('user-join-private-room', function(Room) {
			if (User.Rooms[Room._id]) {
				console.log('Room %s already created !', Room.name);
				return ;
			}

			console.log('Create new Private Room : ', Room);
			var Room = new RoomClass(Room);
			
			if (!Room) {
				console.log('No Room found for id %s !', Room._id);
				return ;
			}

			$rootScope.$apply(function() {
				User.addRoom(Room);
				User.CurrentRoom = Room;
			});
		});

		SocketManager.Socket.on('user-join-public-room', function(Data) {
			var Room = this.Rooms.Public[Data.room_id];
			Room.Users = Data.Users;

			if (!Room) {
				console.log('No Room found for id %s !', Data.room_id);
				return ;
			}

			if (Data.User._id === User._id) {
				$rootScope.$apply(function() {
					User.addRoom(Room);
					User.CurrentRoom = Room;
				});
			}else {
				var Message = new MessageClass({ room_id: Data.room_id, privacy: 'public', author: 'MrChat', text: 'User ' + Data.User.pseudo + ' join the room', is_mutted: true });
				$rootScope.$apply(function() {
					Room.Messages.push(Message);
				});
			}
		}.bind(this));

		SocketManager.Socket.on('init-services', function(Rooms) {
			$rootScope.$apply(function() {
				for (var room_id in Rooms.Public) {
				  if (Rooms.Public.hasOwnProperty(room_id)) {
				  	this.buildRoom(Rooms.Public[room_id], true);
				  } 
				}

				for (var room_id in Rooms.Private) {
				  if (Rooms.Private.hasOwnProperty(room_id)) {
				  	this.buildRoom(Rooms.Private[room_id], true);
				  } 
				}
			}.bind(this));
		}.bind(this));

		SocketManager.Socket.on('user-receive-message', function(MessageData) {
			var Message = new MessageClass(MessageData);
			var Room = User.Rooms[Message.room_id];
			$rootScope.$apply(function() {
				if (typeof Room !== 'undefined') {
					Room.Messages.push({
						author: Message.author,
						text: Message.text,
						created_at: Message.created_at
					});

					if (Room._id !== User.CurrentRoom._id && !Message.is_mutted) {
						Room.unreadMessage = true;
					}
				}else if (Message.privacy === 'private') {
					console.log('Create Private Room from a received message');
					User.Rooms[Message.room_id] = this.buildRoom(Message, false);
					User.Rooms[Message.room_id].unreadMessage = true;
				}
			}.bind(this));
		}.bind(this));

		SocketManager.Socket.on('user-leave-room', function(Data) {
			console.log('User leave room ', Data);

			var privacy = Data.privacy.charAt(0).toUpperCase() + Data.privacy.slice(1);
			var Leaver = this.getUser(Data.leaver_id);
			var Room = User.Rooms[Data.room_id];

			if (!Room) {
				console.log('No room %s found !', Data.room_id);
				return ;
			}

			console.log('User %s wants to leave the room %s', Leaver.name, Room.name);

			$rootScope.$apply(function() {
				if (Room.privacy === 'public') {
					this.disconnectUserFromRoom(Leaver, Room);
				}
				
				if (Leaver._id === User._id) {
					console.log('I am the leaver');
					User.leaveRoom(Data.room_id);
				}else {
					console.log('I am not the leaver');
					var Message = new MessageClass({
						room_id: Data.room_id,
						privacy: Room.privacy,
						author: 'MrChat',
						text: 'User ' + Data.pseudo + ' leave the room',
						is_mutted: true
					});
					Room.Messages.push(Message);
				}
			}.bind(this));
		}.bind(this));

		SocketManager.Socket.on('user-leave-chat', function(User) {
			console.log('user %s leave the chat', User.pseudo);
			
			$rootScope.$apply(function() {
				this.disconnectUserFromRooms(User);
			}.bind(this));
		}.bind(this));

		SocketManager.Socket.on('user-join-chat', function(User) {
			console.log('User join chat...', User);
			
			$rootScope.$apply(function() {
				this.buildRoom({ _id: User._id, name: User.pseudo, privacy: 'private' }, true);
			}.bind(this));
		}.bind(this));

		SocketManager.Socket.on('turn-camera-on', function(data) {
			console.log('user %s from the room %s turned on its camera and ask you now to do the same', data.caller_id, data.room_id);

			var Room = User.Rooms[data.room_id];
			if (!Room) {
				console.log('-->No room in User ones for key %s.', data.room_id);

				Room = this.Rooms.Private[data.caller_id];
				if (!Room) {
					console.log('---->No room either in Private Rooms for user_id %s', data.caller_id);
					return ;
				}
			}

			console.log('-->Room found !', Room);
				
			Room.pc = new RTCPeerConnection(ICE_config);

		  Room.pc.onicecandidate = function(evt) {
		  	console.log('CANDIDATE : ', evt);
		  	if (evt.candidate) {
		    	SocketManager.Socket.emit('candidate', { candidate: evt.candidate, user_id: data.caller_id, room_key: Room._id });
		  	}
		  }.bind(this);

		  Room.pc.onaddstream = function(evt) {
		    var remote_url = $sce.trustAsResourceUrl(URL.createObjectURL(evt.stream));
		      
		    var UserCalling = evt.local ? Room.getUserFromId(User._id) : Room.getOtherUserFromId(User._id);

	      console.log('onaddstream user %s', (evt.local ? 'local' : 'extern'), UserCalling);

	      $rootScope.$apply(function() {
					UserCalling.rtc = remote_url;
				});

				//deferred.notify(streamRemoteURL);
		  }.bind(this);

			navigator[GET_USER_MEDIA](constraints, function(stream) { 

				Room.Stream = stream; // obsolete ?
			  var streamLocaleURL = $sce.trustAsResourceUrl(URL.createObjectURL(stream));
				  
			  Room.pc.onaddstream({ stream: stream, local: true });
			  Room.pc.addStream(stream);

				Room.makeCall(data.caller_id);
			}.bind(this), function() {
				console.log('error getUserMedia');
			});
		}.bind(this));

		SocketManager.Socket.on('candidate', function(evt) {
		  var Room = User.Rooms[evt.room_key];
		  if (!Room) {
		  	console.error('No room found foro key %s !', evt.room_key);
		  	return ;
		  }

		  if (evt.candidate) {
			  Room.pc.addIceCandidate(new RTCIceCandidate(evt.candidate));
			  console.log('Local ICE candidate: \n' + evt.candidate.candidate);
		  }else {
		  	console.log('End of candidates ', evt.candidate);
		  }
		}.bind(this));

		SocketManager.Socket.on('call', function(evt) {
			console.log('[Room %s]receive call from user %s: ', evt.room_key, evt.caller_id, evt.stream);

			var Room = User.Rooms[evt.room_key];
			if (!Room) {
				console.error('No room found !');
				return ;
			}

			console.log('Room found !');
		  Room.receiveCall(evt.caller_id, evt.stream)
		  	.then(function() {

		  	}, function() {

		  	}, function(url) {
					deferred.notify('receiveCall using url : ', url);			
		  	});

		}.bind(this));

		SocketManager.Socket.on('answer', function(evt) {
			console.log('receive answer: ', evt.stream);

			console.log('SET REMOTE DESCRIPTION', evt.stream);
			
			var Room = User.Rooms[evt.room_key]; 
			if (!Room) {
				console.error('No room found for key %s ', evt.room_key);
				return ;
			}
			
			Room.pc.setRemoteDescription(new RTCSessionDescription(evt.stream));

		}.bind(this));
	};

	RoomManagerClass.prototype.buildRoom = function(data, to_add) {
		var NewRoom = new RoomClass(data, User);
		console.log('Build Room ', NewRoom);

		if (to_add) {
			var privacy = NewRoom.privacy.charAt(0).toUpperCase() + NewRoom.privacy.slice(1);
			this.Rooms[privacy][NewRoom._id] = NewRoom;
		}

		return NewRoom;
	};

	RoomManagerClass.prototype.disconnectUserFromRoom = function(Leaver, Room) {
		if (Room.privacy !== 'public') {
			console.log('No user to disconnect in private room');
			return ;
		}
		
		this.Rooms.Public[Room._id].Users = this.Rooms.Public[Room._id].Users.filter(function(User) {
			if (User._id === Leaver._id) {
				return false;
			}

			return User;
		});
	};

	RoomManagerClass.prototype.disconnectUserFromRooms = function(Leaver) {
		for (var room_id in this.Rooms.Public) {
	    if (this.Rooms.Public.hasOwnProperty(room_id)) {
	  		this.Rooms.Public[room_id].Users = this.Rooms.Public[room_id].Users.filter(function(User) {
	  			if (Leaver._id !== User._id) {
	  				return User;
	  			}
	  		});
	    }
		}

		delete this.Rooms.Private[Leaver._id];
		/*		
		for (var room_id in this.Rooms.Private) {
			if (this.Rooms.Private[room_id]._id === Leaver._id) {
				delete this.Rooms.Private[room_id];
			}
		}
		*/
	};

	RoomManagerClass.prototype.getUser = function(user_id) {
		if (user_id === User._id) {
			return User;
		}

		return this.Rooms.Private[user_id];
	};

	var RoomManager = new RoomManagerClass();
	return RoomManager;
});