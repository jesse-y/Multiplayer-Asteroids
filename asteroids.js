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

	update(dt);
	render();

	lastTime = now;
	requestAnimFrame(main);
}

var player = {
	x: canvas.width/2,
	y: canvas.height/2,
	angle: 0
}

var playerSpeed = 200;

function update(dt) {
	if (window.input.isDown('UP')) {
		player.y -= playerSpeed * dt;
		//player.x += playerSpeed * dt * Math.sin(player.angle);
		//player.y += playerSpeed * dt * Math.cos(player.angle);
	}
	if (window.input.isDown('DOWN')) {
		player.y += playerSpeed * dt;
		//player.x -= playerSpeed * dt * Math.sin(player.angle);
		//player.y -= playerSpeed * dt * Math.cos(player.angle);
	}
	if (window.input.isDown('LEFT')) {
		player.x -= playerSpeed * dt;
		//player.angle += playerRotSpeed * dt;
	}
	if (window.input.isDown('RIGHT')) {
		player.x += playerSpeed * dt;
		//player.angle -= playerRotSpeed * dt;
	}
	var rect = canvas.getBoundingClientRect();
	cx = window.input.mouseX() - rect.left;
	cy = window.input.mouseY() - rect.top;

	player.angle = Math.atan2((cx-player.x), (cy-player.y));
}

function render() {
	document.getElementById('debug').innerHTML = '[x: ' + Math.floor(player.x) + 
	', y: ' + Math.floor(player.y) + 
	', angle: ' + player.angle + 
	', mouseX: ' + window.input.mouseX() + 
	', mouseY: ' + window.input.mouseY() + ']';
	
	ctx.fillStyle = '#D9D9D9';
	ctx.fillRect(0,0,canvas.width, canvas.height);

	px = 50 * Math.sin(player.angle);
	py = 50 * Math.cos(player.angle);

	ctx.save();
	ctx.translate(player.x, player.y);

	ctx.fillStyle = '#2176ff';
	ctx.fillRect(-10,-10,20,20);

	ctx.beginPath();
	ctx.moveTo(0,0);
	ctx.lineTo(px, py);
	ctx.stroke();
	ctx.restore();
}

show_menu();

//------------------------------------------------------------------------------------
//-HELPER FUNCTIONS-------------------------------------------------------------------
//------------------------------------------------------------------------------------
function show_menu() {
	ctx.fillStyle = '#D9D9D9';
	ctx.fillRect(0,0,canvas.width, canvas.height);
	console.log(canvas.width, canvas.height);
};

function print_status(message) {
	document.getElementById('status').innerHTML = message;
};