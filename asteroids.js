var ws;
$().ready(function () {
	//change status code check if javascript has successfully loaded
	$('#status').text('sciprts loaded')

	$('#btnConnect').on('click', function() {
		$("#status").text("connecting");

		var ws_url = "ws://hawkleon.com:8080/connect";
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
})