var _ = require('lodash');
var mongoose = require('mongoose');

function DatastoreClass() {
	this.db = {};
	this.Models = {};
};

DatastoreClass.prototype.loadSchemas = function() {
	var Schema = mongoose.Schema;

	var MessageSchema = new Schema({ from: { type: Schema.Types.ObjectId, ref: 'User' }, content: String });
	this.Models.Message = this.db.model('Message', MessageSchema);

	var RoomSchema = new Schema({ name: String, privacy: String, key: String, Messages: [ { type: Schema.Types.ObjectId, ref: 'Message' }], Users: [ { _id: String, pseudo: String, gender: String } ] });
	RoomSchema.methods.addUser = function(User) {
		var Clone = _.find(this.Users, function(_User) {
			return _User._id.toString() === User._id.toString();
		});

		if (Clone) {
			console.log('User %s already in room %s', User.pseudo, this._id);
			return ;
		}

		this.Users.push(User);
	};
	this.Models.Room = this.db.model('Room', RoomSchema);
	
	var UserSchema = new Schema({ pseudo: { type: String, unique: true }, email: { type: String, unique: true }, birthday: Date, cp: String, password: { type: String, required: true }, gender: { type: String, default: 'male' } });
	this.Models.User = this.db.model('User', UserSchema);

	console.log('Schemas loaded !');
};

DatastoreClass.prototype.connect = function(done) {
	this.db = mongoose.createConnection('mongodb://ludoblues:5fiQgm_z@localhost:27017/finalChat', { auth: { authdb: "admin" } });

	this.db.on('error', function(err) {
		done(err);
	});

	this.db.once('open', function() {
		console.log('Connection made to the db !');

		this.loadSchemas();

  	done();
	}.bind(this));
};

var Datastore = new DatastoreClass();
module.exports = Datastore;