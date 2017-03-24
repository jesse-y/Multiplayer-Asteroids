(function() {
	window.print_msg = function(id, message) {
		document.getElementById(id).innerHTML = message;
	};
	window.show = function(id) {
		document.getElementById(id).style.display = 'block';
	};
	window.hide = function(id) {
		document.getElementById(id).style.display = 'none';
	};
})();