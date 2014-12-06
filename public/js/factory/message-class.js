angular.module('chat').factory('MessageClass', function() {
	function MessageClass(data) {
		this.room_id = data.room_id;
		this.privacy = data.privacy;
		this.author = data.author;
		this.text = data.text;
		this.created_at = data.created_at || new Date();
		this.is_mutted = data.is_mutted || false;
	}

	return MessageClass;
});