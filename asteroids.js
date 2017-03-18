var ws;
$().ready(function () {
	//change status code check if javascript has successfully loaded
	$('#status').text('scripts loaded');

	var app = new Asteroids_App(document.getElementById('app'), 640, 480);


	$('#btnConnect, #btnConnectLocal').on('click', function() {
		$("#status").text("connecting");

		if (this.id == 'btnConnectLocal') {
			var ws_url = "ws://localhost:8080/connect";
		} else {
			var ws_url = "ws://hawkleon.com:8008/connect";
		}
		ws = new WebSocket(ws_url);
		ws.onopen = function() {
			$('#status').text("connected");
		};
		ws.onmessage = function (e) {
			$('#status').text(e.data);
		};
		ws.onerror = function (e) {
			$('#status').text(e.message);
		};
		ws.onclose = function (e) {
			$('#status').text("disconnected");
		};
	});

	$(document).keypress(function(event) {
		var code = event.keyCode;
		if (!code && event.charCode)
			code = event.charCode;

		if (ws && ws.readyState == WebSocket.OPEN) {
			ws.send(code);
			event.preventDefault();
		} else {
			$('#status').text('connection is closed');
		}
	});

	$('#btnDisconnect').on('click', function() {
		ws.close();
	})
});

function Asteroids_App(elem, width, height) {
	this.canvas = document.createElement('canvas');
	this.ctx = this.canvas.getContext('2d');
	this.canvas.id = 'viewport';
	//this.canvas.height = height;
	//this.canvas.width = width;
	elem.appendChild(this.canvas);

	this.start_page();
};

Asteroids_App.prototype.start_page = function() {
	this.ctx.fillStyle = '#D9D9D9';
	this.ctx.fillRect(0,0,this.canvas.width, this.canvas.height);
}