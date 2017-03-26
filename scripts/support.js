(function() {
	window.print_msg = function(id, message) {
		var element = document.getElementById(id);
		if (element == undefined) {
			element = document.createElement('div');
			element.id = id;
			element.innerHTML = message;
			document.body.appendChild(element);
		} else {
			document.getElementById(id).innerHTML = message;
		}
	};
	window.show = function(id) {
		document.getElementById(id).style.display = 'block';
	};
	window.hide = function(id) {
		document.getElementById(id).style.display = 'none';
	};
	window.netm = {
		'MSG_ERROR' : 'nm00',
		'MSG_JOIN' : 'nm01',
		'MSG_QUIT' : 'nm02',
		'MSG_MOVE' : 'nm03',
		'MSG_G_STATE' : 'nm04',
		'MSG_START' : 'nm05'
	}
})();