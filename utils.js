var cookie = require('cookie');
var cookieParser = require('cookie-parser');

module.exports = {
	getUserFromHandshake: function(SessionStore, handshake, callback) {
		if (!handshake.headers.cookie) {
			return callback('No cookie transmitted.', false);
	 	}

	 	var cookies = cookie.parse(handshake.headers.cookie);
		cookies = cookieParser.signedCookies(cookies, 'azerty');

	 	SessionStore.get(cookies['connect.sid'], function(err, session) {
	  	if (err || !session) {
	      return callback('No session found', false);
	    } 
	    
	    if (typeof session.User === "undefined") {
	      return callback("No User found", false);
	    }

	    handshake.headers.User = session.User;

	  	callback(null, true);
	  });
	}	
};

