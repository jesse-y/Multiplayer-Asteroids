(function() {
	window.print_msg = function(id, message) {
		document.getElementById(id).innerHTML = message;
	};
})();