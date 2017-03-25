(function () {
	var keys = {};
	var mouse = {
		x: 0,
		y:0
	};

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
			case 27:
				key = 'ESCAPE'; break;
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
	});
	document.addEventListener('mousemove', function(e) {
		mouse.x = e.clientX;
		mouse.y = e.clientY;
	});

	window.input = {
		isDown: function(key) {
			return keys[key.toUpperCase()];
		},
		allKeys: function() {
			return keys;
		},
		mouseX: function() {
			return mouse.x;
		},
		mouseY: function() {
			return mouse.y;
		}
	};
})();