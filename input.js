(function () {
	var keys = {};

	function setKey(event, status) {
		var code = event.keyCode;
		var key;

		switch(code) {
			case 38:
			case 87:
				key = 'UP'; break;
			case 40:
			case 83:
				key = 'DOWN'; break;
			case 37:
			case 65:
				key = 'LEFT'; break;
			case 39:
			case 68:
				key = 'RIGHT'; break;
			default:
				key = String.fromCharCode(code);
		}
		keys[key] = status;
	}

	document.addEventListener('keydown', function(e) {
		setKey(e, true);
	});
	document.addEventListener('keyup', function(e) {
		setKey(e, false);
	});
	document.addEventListener('blur', function () {
		keys= {};
	})

	window.input = {
		isDown: function(key) {
			return keys[key.toUpperCase()];
		},
		allKeys: function() {
			return keys;
		}
	};
})();