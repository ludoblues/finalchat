function UserClass(Socket) {
	this._id = Socket.handshake.headers.User._id;
	this.pseudo = Socket.handshake.headers.User.pseudo;
	this.gender = Socket.handshake.headers.User.gender;

	this.Socket = Socket;
}

UserClass.prototype.joinRoom = function(room_id) {
	room_id = room_id.toString();
	if (this.Socket.rooms.indexOf(room_id) === -1) {
		this.Socket.join(room_id);
	}
}

module.exports = UserClass;