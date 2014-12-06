var ICE_config= {
  'iceServers': [
    {
      'url': 'stun:stun.l.google.com:19302'
    }
    /*,
    {
      'url': 'turn:192.158.29.39:3478?transport=udp',
      'credential': 'JZEOEt2V3Qb0y27GRntt2u2PAYA=',
      'username': '28224511:1379330808'
    },
    {
      'url': 'turn:192.158.29.39:3478?transport=tcp',
      'credential': 'JZEOEt2V3Qb0y27GRntt2u2PAYA=',
      'username': '28224511:1379330808'
    }
    */
  ]
};
var constraints = { "audio": true, "video": true };
var RTCPeerConnection = window.RTCPeerConnection || window.mozRTCPeerConnection || window.webkitRTCPeerConnection;
var RTCSessionDescription = window.RTCSessionDescription || window.mozRTCSessionDescription || window.webkitRTCSessionDescription;
var RTCIceCandidate = window.RTCIceCandidate || window.mozRTCIceCandidate || window.webkitRTCIceCandidate;
var GET_USER_MEDIA = navigator.getUserMedia ? "getUserMedia" :
                     navigator.mozGetUserMedia ? "mozGetUserMedia" :
                     navigator.webkitGetUserMedia ? "webkitGetUserMedia" : "getUserMedia";
var URL = window.URL || window.mozURL || window.webkitURL;

angular.module('chat').factory('RoomClass', function($sce, $q, MessageClass, SocketManager, User) {
	var RoomClass = function(data, User) {
		// Create a room from a private message received since public ones does not create one
		if (data instanceof MessageClass) {
			this._id = data.room_id;
			this.privacy = data.privacy;
			this.name = data.author.pseudo;
			this.Messages = [ { author: data.author, text: data.text, created_at: data.created_at } ];
			this.Users = [ data.author, { _id: User._id, pseudo: User.pseudo, gender: User.gender } ];
		}else {
			this._id = data._id;
			this.privacy = data.privacy;
			this.name = data.name;
			this.Messages = [];
			this.Users = data.Users || [];
		}

		this.pc = {};
	};

	RoomClass.prototype.getUserFromId = function(user_id) {
		return this.Users.filter(function(User) {
			return User._id === user_id;
		})[0];
	};

	RoomClass.prototype.getOtherUserFromId = function(user_id) {
		return this.Users.filter(function(User) {
			return User._id !== user_id;
		})[0];
	};

	RoomClass.prototype.makeCall = function(callee_id) {
		console.log('-->[Room %s]Call callee_id '+callee_id+' !', this._id);

   	console.log('---->[Room %s]CREATE OFFER', this._id);
    this.pc.createOffer(function(offer) {
    	console.log('------>[Room %s]SET LOCAL DESCRIPTION ', this._id, offer);
	    this.pc.setLocalDescription(new RTCSessionDescription(offer), function() {
		    SocketManager.Socket.emit('call', { stream: offer, callee_id: callee_id, room_key: this._id } );
      }.bind(this));
    }.bind(this), function(err) {
    	console.log('Error... ', err);
    });
	};

	RoomClass.prototype.turnCameraOn = function(user_id) {
		console.log('turn camera on...');
		var deferred = $q.defer();

		this.pc = new RTCPeerConnection(ICE_config);

    this.pc.onicecandidate = function(evt) {
    	console.log('SEND CANDIDATES...', evt);
		  if (evt.candidate) {
      	SocketManager.Socket.emit('candidate', { candidate: evt.candidate, user_id: user_id, room_key: this._id });
      }
    };

    this.pc.onaddstream = function(evt) {
    	console.log('ADD STREAM CALLBACK..', evt.stream);
      
      var remote_url = $sce.trustAsResourceUrl(URL.createObjectURL(evt.stream));

		  var UserCalling = evt.local ? this.getUserFromId(User._id) : this.getOtherUserFromId(User._id);

      console.log('onaddstream user %s', (evt.local ? 'local' : 'extern'), UserCalling);

			UserCalling.rtc = remote_url;

			deferred.notify(remote_url);
    }.bind(this);

		navigator[GET_USER_MEDIA](constraints, function(stream) {

			this.pc.onaddstream({ stream: stream, local: true });
	  	this.pc.addStream(stream);

			console.log('Ask to user %s to turn on its camera', user_id)
			SocketManager.Socket.emit('turn-camera-on', user_id);
		
		}.bind(this), function() {
			console.log('error getUserMedia');
		});

		return deferred.promise;
	};

	RoomClass.prototype.stopCall = function(room_id, to_emit) {
		console.log('stop stream...');

		if (typeof room_id === 'undefined') {
			room_id = this.CurrentRoom._id;
		}

		this.Stream.stop();
		delete this.Stream;
		delete this.CurrentRoom.Users[0].rtc;
		delete this.CurrentRoom.Users[1].rtc;		
		delete User.rtc;
		this.pc.close();
		delete this.pc;

		if (typeof to_emit !== 'undefined')
			SocketManager.Socket.emit('user-stop-call', room_id);
	};

	RoomClass.prototype.receiveCall = function(caller_id, RemoteStream) {
		var deferred = $q.defer();

		console.log('-->SET REMOTE DESCRIPTION', RemoteStream);
		this.pc.setRemoteDescription(new RTCSessionDescription(RemoteStream));

   	console.log('---->CREATE ANSWER');
	  this.pc.createAnswer(function(answer) {
    	
    	console.log('------>SET LOCAL DESCRIPTION ', answer);
	    this.pc.setLocalDescription(new RTCSessionDescription(answer), function() {
				
				console.log('-------->Send answer from caller ', caller_id);
	    	SocketManager.Socket.emit('answer', { stream: answer, caller_id: caller_id, room_key: this._id } );		    	
	    
	    }.bind(this));
    }.bind(this), function(e) {
	 		console.log('Error: ', e);
		});

		return deferred.promise;
	};

	return RoomClass;
});