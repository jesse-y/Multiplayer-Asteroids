//checking that script file has been found
print_status('scripts loaded');

var requestAnimFrame = (function(){
    return window.requestAnimationFrame       ||
        window.webkitRequestAnimationFrame ||
        window.mozRequestAnimationFrame    ||
        window.oRequestAnimationFrame      ||
        window.msRequestAnimationFrame     ||
        function(callback){
            window.setTimeout(callback, 1000 / 60);
        };
})();

//create and instantiate canvas object
var canvas = document.getElementById('viewport')
canvas.width = 640;
canvas.height = 480;
var ctx = canvas.getContext('2d');

//add event listeners to buttons
var ws;
document.getElementById('btnConnect').addEventListener('click', function(e) {
	print_status('connecting ...');
	var ws_url;
	if (document.getElementById('connectLocal').checked) {
		ws_url = 'ws://localhost:8080/connect';
	} else {
		ws_url = 'ws://hawkleon.com:8008/connect';
	}
	ws = new WebSocket(ws_url);
	ws.onopen = function () {
		print_status('connected');
		
		main();
	};
	ws.onmessage = function (e) {
		print_status(e.data);
	};
	ws.onerror = function (e) {
		print_status(e.message);
	};
	ws.onclose = function (e) {
		print_status('disconnected');
	};
});

document.getElementById('btnDisconnect').addEventListener('click', function(e) {
	ws.close();
});

var lastTime;
function main() {
	if (!ws || ws.readyState == WebSocket.CLOSED) {
		return;
	}

	var now = Date.now();
	var dt = (now - lastTime) / 1000.0;

	poll_input();

	lastTime = now;
	requestAnimFrame(main);
}

var player = {
	posx: 0,
	posy: 0,
	angle: 0,
}



show_menu();

//------------------------------------------------------------------------------------
//-HELPER FUNCTIONS-------------------------------------------------------------------
//------------------------------------------------------------------------------------
function poll_input() {
	console.log(window.input.allKeys());
}

function show_menu() {
	ctx.fillStyle = '#D9D9D9';
	ctx.fillRect(0,0,canvas.width, canvas.height);
};

function print_status(message) {
	document.getElementById('status').innerHTML = message;
};

/*
var ws;
$().ready(function () {
	//change status code check if javascript has successfully loaded
	$('#status').text('scripts loaded');

	var app = new Asteroids_App(document.getElementById('app'), 640, 480);

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
	});
});

function Asteroids_App(elem, width, height) {
	this.canvas = document.createElement('canvas');
	this.canvas.id = 'viewport';
	this.ctx = this.canvas.getContext('2d');

	elem.appendChild(this.canvas);

	this.start_page();

	//add event listeners
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
			this.game_page();
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

	this.canvas = $('#viewport')[0];
	this.ctx = this.canvas.getContext('2d');
	this.start_page();

};

Asteroids_App.prototype.start_page = function() {
	$('#controls').show();
	this.ctx.fillStyle = '#D9D9D9';
	this.ctx.fillRect(0,0,this.canvas.width, this.canvas.height);
}

Asteroids_App.prototype.game_page = function() {
	$('#controls').hide();

}

document.addEventListener('keydown', function(e) {
	var code = e.keyCode;
	if (!code &&e.charCode) {
		code = e.charCode;
	}
	if (ws && ws.readyState == WebSocket.OPEN) {
		ws.send(code);
		e.preventDefault();
	} else {
		print_status('connection is closed');
	}
});
*/