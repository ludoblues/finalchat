var _ = require('lodash');
var Datastore = require('./datastore');
var Privacies = [ 'Public', 'Private' ];
var UserManager = require('./user-manager');
var UserClass = require('./user-class');

function RoomManagerClass() {
	this.Rooms = {
		Private: {},
		Public: {}
	};
}

RoomManagerClass.prototype.bindUsersWithRoom = function(room_id, privacy) {
	var privacy = privacy.charAt(0).toUpperCase() + privacy.slice(1);

	if (Privacies.indexOf(privacy) === -1) {
		console.error('Invalid privacy name (%s)', privacy);
		return null;
	}

	if (typeof this.Rooms[privacy][room_id] === 'undefined') {
		console.log('room_id %s does not exist in %s privacy', room_id, privacy);
		return ;
	}

	var User = {};
	_.pluck(this.Rooms[privacy][room_id].Users, '_id').forEach(function(user_id) {
		User = UserManager.Users[user_id];

		if (typeof User === 'undefined') {
			console.log('user_id %s unknown', user_id);
			return ;
		}

		if (User.Socket.rooms.indexOf(room_id) === -1) {
			console.log('--> User %s has been re binded to the room_id %s', User.pseudo, room_id);
			User.Socket.join(room_id);
		}else {
			console.info('--> User %s was already binded to the room_id %s', User.pseudo, room_id);
		}
	});
};

RoomManagerClass.prototype.generateKeyFromUsers = function(A, B) {
	if (!A instanceof UserClass || !B instanceof UserClass) {
		console.log('One of the users is corrupted');
		return null;
	}

	return [ A._id.toString(), B._id.toString() ].sort().join('-');
};

RoomManagerClass.prototype.generateKeyFromRoom = function(Room) {
	if (!Room || Room.privacy !== 'private' || !Room.Users || Room.Users.length !== 2) {
		console.log('Invalid private room: ', JSON.stringify(Room));
		return null;
	}

	return [ Room.Users[0]._id.toString(), Room.Users[1]._id.toString() ].sort().join('-');
};

RoomManagerClass.prototype.findOrCreatePrivateRoom = function(A, B, callback) {
	var room_key = this.generateKeyFromUsers(A, B);

	if (!room_key) {
		console.log('No key provided...');
		return ;
	}

	var PrivateRoom = this.Rooms.Private[room_key];

	if (PrivateRoom) {	
		console.log('-->Private room found !');
		return callback(null, PrivateRoom, room_key);
	}
	console.log('-->No private room found...');

	var Room = new Datastore.Models.Room({ privacy: 'private', name: 'private', Users: [ A, B ], key: room_key });
	console.log('---->Private room %s created for them !', Room._id);
		
	this.Rooms.Private[room_key] = Room;
	callback(null, Room, room_key);
}

RoomManagerClass.prototype.disconnectUserFromChat = function(user_id) {
	_.forEach(this.Rooms.Public, function(Room) {
		Room.Users = Room.Users.filter(function(User) {
			if (User._id.toString() !== user_id.toString()) {
				return User;
			}
		});
	});
};

RoomManagerClass.prototype.getRoomFromId = function(room_id, privacy) {
	if (!privacy) {
		console.error('No privacy provided !');
		return ;
	}
	
	var privacy = privacy.charAt(0).toUpperCase() + privacy.slice(1);

	if (Privacies.indexOf(privacy) === -1) {
		console.error('Invalid privacy name (%s)', privacy);
		return null;
	}

	return this.Rooms[privacy][room_id];
};

RoomManagerClass.prototype.getPrivateRoomFromUsers = function(Users) {
	if (Users.length !== 2) {
		console.log('A private room is composed by 2 users and not %s', Users.length);
		return null;
	}

	var room_key = this.generateKeyFromUsers(Users[0], Users[1]);
	return this.Rooms.Private[room_key];
}

RoomManagerClass.prototype.disconnectUserFromRoom = function(Leaver, Room) {
	//var Room = this.Rooms[Room.privacy][Room._id]; 
	
	Room.Users = Room.Users.filter(function(User) {
		if (User._id.toString() === Leaver._id.toString()) {
			var Socket = UserManager.getUserClass(User._id.toString()).Socket;

			var room_id = Room._id.toString();
			if (Room.privacy === 'private') {
				room_id = this.generateKeyFromRoom(Room);
			}

			Socket.emit('user-leave-room', { room_id: room_id, leaver_id: Leaver._id, privacy: Room.privacy });
			
			// If private, we keep the both users
			if (Room.privacy !== 'private') {
				Socket.leave(room_id);
				return false;
			}
		}

		return User;
	}.bind(this));
};

RoomManagerClass.prototype.loadRooms = function(done) {
	Datastore.Models.Room.find(function(err, Rooms) {
		if (err) {
			console.error('The rooms could not be loaded : ', err);
			return done(err);
		}

		var nb_rooms = 0;
		// TODO: Reset Users to {} (find a way in client side to send all opened rooms on an "init" stage)
		Rooms.forEach(function(Room) {
			var privacy = Room.privacy.charAt(0).toUpperCase() + Room.privacy.slice(1);
			this.Rooms[privacy][Room.id] = Room;
			nb_rooms++;
		}.bind(this));

		console.log(nb_rooms + ' Rooms model loaded !');
		done();
	}.bind(this));
};

RoomManagerClass.prototype.getRooms = function() {
	return _.transform(this.Rooms.Public, function(Rooms, Room, room_id) {
		Rooms[room_id] = { _id: Room._id.toString(), privacy: Room.privacy, name: Room.name, Users: Room.Users };
	});
};

RoomManagerClass.prototype.getRoomFromUsers = function(Users, privacy) {
	var privacy = privacy.charAt(0).toUpperCase() + privacy.slice(1);

	var Room = _.find(this.Rooms[privacy], function(Room) {
		console.log('Room = ', Room);

		console.log('Users: ', Users);

		console.log('_.pluck(Room.Users, _id) = ', _.pluck(Room.Users, '_id'));
		console.log('_.pluck(Users, _id) = ', _.pluck(Users, '_id'));
		return !_.difference(_.pluck(Room.Users, '_id'), _.pluck(Users, '_id'));
	});

	console.log('Room found ! ', Room);
};

RoomManagerClass.prototype.createRoom = function(RoomDatas, callback) {
	var Room = new Datastore.Models.Room(RoomDatas);
	Room.key = Room._id;
	Room.save(function(err) {
		if (typeof callback === 'function') {
			callback(err);
		}
	});
};

var RoomManager = new RoomManagerClass();
module.exports = RoomManager;