var express = require('express');
var app = express();
var session = require('express-session');
var MongoStore = require('connect-mongo')(session);
var SessionStore = new MongoStore({ url: 'mongodb://ludoblues:5fiQgm_z@127.0.0.1:27017/admin' });
var server = require('http').Server(app);
var io = require('socket.io')(server);
var _ = require('lodash');
var bodyParser = require('body-parser');

var Utils = require('./utils');
var Datastore = require('./datastore');
var UserManager = require('./user-manager');
var RoomManager = require('./room-manager');
var UserClass = require('./user-class');

function createFixtures(callback) {
	var async = require('async');

	var Rooms = [
		{ privacy: 'public', name: 'general' },
		{ privacy: 'public', name: 'fan de vin' },
		{ privacy: 'public', name: 'fan de money' }
	];

	var RegisterRooms = Rooms.map(function(Room) {
		return function(done) {
			RoomManager.createRoom(Room, done);
		};
	});

	async.parallel(RegisterRooms, function(err, res) {
		if (err) {
			console.log('SOMETHIG WENT WRONG CREATING THE FIXTURES !');
			return callback(err)
		}

		console.log('All fixtures created succesffully !');
		callback();
	})
}

Datastore.connect(function(err) {
	if (err) {
		console.error('Error starting datastore: ', err);
		return ;
	}
	RoomManager.loadRooms(function(err) {
		if (err) {
			console.error('Error loading Rooms: ', err);
			return ;
		}
		
		createFixtures(function(err) {

			console.log('START SERVER !');
			server.listen(3000);
		});
	});
});

app.use(express.static(__dirname + '/public'));
app.use(bodyParser.json());
app.use(session({
	secret: 'azerty',
  store: SessionStore
}));

app.get('/', function(req, res) {
	res.sendFile(__dirname + '/index.html');
});

app.post('/register', function(req, res) {
	UserManager.registerUser(req.body, function(err, User) {
		if (err) {
			return res.status(410).send(err);
		}

		req.session.User = User;
		res.send(User);
	});
});

app.post('/login', function(req, res) {
	if (typeof req.session.User !== 'undefined' && typeof req.body.email === 'undefined') {
		console.log('session of user %s found !', req.session.User.pseudo);
		return res.send(req.session.User);
	}

	UserManager.logUser(req.body.email, req.body.password, function(err, User) {
		if (err) {
			return res.status(410).send(err);
		}

		if (!User) {
			console.log('No user found !');
			return res.sendStatus(404);
		}

		console.log('User %s login', User.pseudo);
		req.session.User = User;
		res.send(User);
	});
});

app.del('/logout', function(req, res) {
	if (!req.session.User) {
		return res.sendStatus(204)
	}

	console.log('User %s leave logout the chat ', req.session.User.pseudo);

	UserManager.disconnectUserFromChat(req.session.User._id);	
	RoomManager.disconnectUserFromChat(req.session.User._id);
	
	delete req.session.User;

	res.sendStatus(200)
});

app.get('/loadSession', function(req, res) {
	if (typeof req.session.User === 'undefined') {
		return res.sendStatus(404);
	}

	var UserSession = {
		User: req.session.User
	};

	console.log('Send session: ', JSON.stringify(UserSession));

	res.send(UserSession);
});

io.set('authorization', Utils.getUserFromHandshake.bind(null, SessionStore));

io.on('connection', function(socket) {
	console.log('New Connection ! ', socket.handshake.headers.User.pseudo);

	var NewUser = UserManager.createUser(socket);

	socket.broadcast.emit('user-join-chat', { _id: NewUser._id, pseudo: NewUser.pseudo, gender: NewUser.gender, created_at: new Date() }); // getUser

	socket.on('user-join-public-room', function(room_id) {
		console.log('user try to join public room...');

		var User = UserManager.getUser(socket.user_id);

		if (!User) {
			console.error('User %s does not exist !', socket.user_id);
			return ;
		}

		console.log('-> User %s found.', User.pseudo);
		
		var Room = RoomManager.getRoomFromId(room_id, 'Public');
		
		if (!Room) {
			console.error('Room %s does not exist !', room_id);
			return ;
		}

		console.log('->Room %s found.', Room.name);

		Room.addUser(User);
		console.log('->User %s added to the room', User.pseudo);

		console.log('The room %s contains now %s users', Room.name, Room.Users.length);

		socket.join(room_id, function(err) {
			if (err) {
				console.log('err: ', err);
				return ;
			}
		
			console.log('->User %s has joined the room %s', User.pseudo, Room.name);

			socket.emit('user-join-public-room', { room_id: room_id, User: User, Users: Room.Users });
			socket.to(room_id).emit('user-join-public-room', { room_id: room_id, User: User, Users: Room.Users });
		});
	});

	socket.on('user-join-private-room', function(user_id) {
		console.log('user try to join private room...');

		var Caller = UserManager.getUserClass(socket.user_id);
		var Callee = UserManager.getUserClass(user_id);

		if (!Caller instanceof UserClass || !Callee instanceof UserClass) {
			console.error('User %s or %s does not exist !', socket.user_id, user_id);
			return ;
		}

		console.log(!Caller instanceof UserClass);
		console.log(!Callee instanceof UserClass);
		console.log('-> Caller %s found.', Caller.pseudo);
		console.log('-> Callee %s found.', Callee.pseudo);

		RoomManager.findOrCreatePrivateRoom(Caller, Callee, function(err, Room, room_key) {
			if (err) {
				console.error('Error creating a private room: ', err);
				return ;
			}

			Caller.joinRoom(room_key);
			Callee.joinRoom(room_key);
			
			console.log('-> Both Users joined the Private Room');
					
			socket.emit('user-join-private-room', { _id: room_key, name: Callee.pseudo, privacy: 'private', Users: Room.Users });
		});
	});

	socket.on('disconnect', function() {
		UserManager.disconnectUserFromChat(socket.user_id);
		RoomManager.disconnectUserFromChat(socket.user_id);

		console.log('User %s has been disconnected !', socket.handshake.headers.User.pseudo);
	});

	socket.on('init-services', function() {
		var Rooms = {
			Public: RoomManager.getRooms(),
			Private: UserManager.getRooms(socket.user_id)
		};

		socket.emit('init-services', Rooms);
	});


	socket.on('user-send-message', function(Message) {
		var room_id = Message.room_id;
		var User = UserManager.getUser(socket.user_id);
		var Room = RoomManager.getRoomFromId(room_id, Message.privacy);

		if (!User) {
			console.error('User %s does not exist !', socket.user_id);
			return ;
		}

		if (!Room) {
			console.error('Room %s does not exits !', room_id);
			return ;
		}

		console.log('User %s want to speak with the room %s', User.pseudo, room_id);
		//var Message = new MessageClass(Message);

		console.log('Make sure users sockets are binded to the room_id %s', room_id);
		if (Room.privacy === 'private') {
			RoomManager.bindUsersWithRoom(room_id, Room.privacy);
		}

		socket.to(room_id).emit('user-receive-message', Message);
		socket.emit('user-receive-message', Message);
	});

	socket.on('user-leave-room', function(RoomDatas) {
		var User = UserManager.getUser(socket.user_id);

		var Room = RoomManager.getRoomFromId(RoomDatas._id, RoomDatas.privacy);

		if (!Room) {
			console.log('No room found...');
			return ;
		}

		console.log('User %s leave the room %s', User.pseudo, Room.name);

		var room_id = RoomDatas._id;
		
		socket.to(room_id).emit('user-leave-room', { leaver_id: socket.user_id, room_id: room_id, privacy: Room.privacy });
		console.log('--> Message broadcasted.');

		RoomManager.disconnectUserFromRoom(User, Room);
		console.log('--> User removed from Rooms (reals one and socket one).');
	});

	// RTC Stuff
	socket.on('turn-camera-on', function(callee_id) {
		console.log('>turn-camera-on from caller_id %s to callee_id %s', socket.user_id, callee_id);

		var Caller = UserManager.getUserFromId(socket.user_id);
		var Callee = UserManager.getUserFromId(callee_id);

		console.log('-->User %s turned on its camera and want %s to do the same', Caller.pseudo, Callee.pseudo);
		
		var Room = RoomManager.getPrivateRoomFromUsers([ Caller, Callee ]);
		if (!Room) {
			console.log('--> No Room found...');
			return ;
		}
		console.log('--> Room %s found !', Room.key);

		console.log('Make sure users sockets are binded to the room_id %s', Room.key);
		if (Room.privacy === 'private') {
			RoomManager.bindUsersWithRoom(Room.key, Room.privacy);
		}

		socket.to(Room.key).emit('turn-camera-on', { caller_id: Caller._id, room_id: Room.key });
	});

	socket.on('call', function(data) {
		var Caller = UserManager.getUserFromId(socket.user_id);
		var Callee = UserManager.getUserFromId(data.callee_id, true);
		data.caller_id = Caller._id;
		console.log('User %s call user %s in the room %s', Caller.pseudo, Callee.pseudo, data.room_key);

		var Room = RoomManager.getRoomFromId(data.room_key, 'private');
		if (!Room) {
			console.error('No room found !');
			return ;
		}
		console.log('Room %s found !', Room.key);

		Callee.Socket.emit('call', data);
	});

	socket.on('answer', function(data) {
		var Callee = UserManager.getUserFromId(socket.user_id);
		var Caller = UserManager.getUserFromId(data.caller_id, true);
		console.log('User %s answer user %s', Callee.pseudo, Caller.pseudo);

		var Room = RoomManager.getRoomFromId(data.room_key, 'private');
		if (!Room) {
			console.error('No room found !');
			return ;
		}
		console.log('Room %s found !', Room.key);

		Caller.Socket.emit('answer', data);
	});

	socket.on('candidate', function(data) {
		var Callee = UserManager.getUserFromId(socket.user_id);
		var Caller = UserManager.getUserFromId(data.user_id, true);
		console.log('User %s send its candidates to User %s', Callee.pseudo, Caller.pseudo);

		var Room = RoomManager.getRoomFromId(data.room_key, 'private');
		if (!Room) {
			console.error('No room found from key %s !', data.room_key);
			return ;
		}
		console.log('Room %s found !', Room.key);

		Caller.Socket.emit('candidate', data);
	});	
});

server.listen(3000);
