var _ = require('lodash');
var bcrypt = require('bcrypt');
var Datastore = require('./datastore');
var UserClass = require('./user-class');

function UserManagerClass() {
	this.Users = {};
}

UserManagerClass.prototype.getRooms = function(requester) {
	return _.transform(this.Users, function(Users, User, user_id) {
		if (requester.toString() !== user_id) {
			Users[user_id] = { _id: User._id.toString(), privacy: 'private', name: User.pseudo, Users: [ { _id: User._id, pseudo: User.pseudo, gender: User.gender } ] };
		}
	});
};

UserManagerClass.prototype.getUserClass = function(user_id) {
	if (typeof this.Users[user_id] === 'undefined') {
		console.warn('User %s does not exits !', user_id);
		return null;
	}

	return this.Users[user_id];
};

UserManagerClass.prototype.getUser = function(user_id) {
	if (typeof this.Users[user_id] === 'undefined') {
		console.warn('User %s does not exits !', user_id);
		return null;
	}

	return { _id: this.Users[user_id]._id.toString(), pseudo: this.Users[user_id].pseudo, gender: this.Users[user_id].gender };
};

UserManagerClass.prototype.getUserFromId = function(user_id, full_entity) {
	return full_entity ? this.getUserClass(user_id) : this.getUser(user_id);
};

UserManagerClass.prototype.addUser = function(User) {
	if (!User instanceof UserClass) {
		console.error('This is not a User');
		return ;
	}

	this.Users[User._id] = User;
};

UserManagerClass.prototype.createUser = function(Socket, only_create) {
	var User = new UserClass(Socket);
	Socket.user_id = User._id;

	if (!only_create) {
		this.addUser(User);
	}

	return User;
};

UserManagerClass.prototype.disconnectUserFromChat = function(user_id) {
	if (typeof this.Users[user_id] === 'undefined') {
		console.log('Apparantly user %s is already disconnected', user_id);
		return ;
	}

	var User = this.getUser(user_id);
	console.log('User %s disconnect', User.pseudo);
	this.Users[user_id].Socket.broadcast.emit('user-leave-chat', User);

	delete this.Users[user_id];
};

UserManagerClass.prototype.logUser = function(email, password, done) {
	Datastore.Models.User.findOne({ email: email }, function(err, User) {
		if (err) {
			console.error('Error trying to find User');
			done('Error trying to find User');
			return ;
		}

		if (!User) {
			done(null);
			return ;
		}

		bcrypt.compare(password, User.password, function(err, isPassValid) {
			if (err) {
				console.error('Error comparing passwords: ', err);
				done('Invalid password');

				return ;
			}

			if (!isPassValid) {
				done('Invalid password');
				return ;
			}

			done(null, { _id: User._id, pseudo: User.pseudo, gender: User.gender });
		});

	});
};

UserManagerClass.prototype.registerUser = function(Credentials, done) {
	bcrypt.genSalt(10, function(err, salt) {
    bcrypt.hash(Credentials.password, salt, function(err, password) {
    	Credentials.password = password;
    	var NewUser = new Datastore.Models.User(Credentials);
    	NewUser.save(function(err, User) {
    		if (err) {
    			return done('Error registering new user');
    		}

    		done(null, { _id: NewUser._id, pseudo: NewUser.pseudo, gender: NewUser.gender });	
    	});
    });
	});
};

var UserManager = new UserManagerClass();
module.exports = UserManager