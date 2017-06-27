import http.client as httplib, urllib, sys

#-----CREATE NEW INDEX FILE-----------------------------------------//

print('Creating index.html file ...')

index_file = [
	'<!DOCTYPE html>',
	'<html>',
		'<head>',
			'<meta http-equiv="Content-Type" content="text/html; charset=utf-8" />',
			'<title>Asteroids Multiplayer</title>',
			'<link rel="stylesheet" type="text/css" href="style.css" />',
		'</head>',
		'<body>',
			'<div id="page">',
				'<div id="status">Status</div>',
				'<div id="network">network info</div>',
				'<div id="app"></div>',
				'<p> Move using WASD keys </p>',
				'<p> Shoot with LMB </p>',
				'<p> Your ship can take 3 points of damage before you are vulnerable to enemy fire! Your shields will recharge after 3 seconds as long as you don't take any additional damage. </p>',
				'<p> Fire a Rocket with V. The rocket will target and home in on the player closest to your cursor. You can store up to 2 rockets at a time. Rockets take 3 seconds to recharge. Rockets pierce shields. </p>',
				'<p> Destroying large and medium asteroids will occassionally drop invulnerability powerups. Press SPACE to use. Lasts 2 seconds. </p>',
				'<p> Good luck out there! </p>',
				'<p> (C) Jesse Yue 2017',
			'</div>',
		'</body>',
		'<script type="text/javascript" src="js/app.js"></script>',
	'</html>'
]

with open('index.html', 'w') as output:
	for line in index_file:
		output.write(line)

#-----COLLECT AND CONCATENATE JAVASCRIPT FILES----------------------//

files = [
	"scripts/support.js",
	"scripts/game_state.js",
	"scripts/input.js",
	"scripts/visual_effects.js",
	"scripts/game_client.js",
	"scripts/asteroids.js"
]

js_code = ''
for fname in files:
	print('Collecting {} ...'.format(fname))
	with open(fname, 'r') as infile:
		content = infile.read()
		js_code += content

#-----COMPILE JAVASCRIPT USING GOOGLE CLOSURE COMPILER--------------//

# Define the parameters for the POST request and encode them in
# a URL-safe format.
params = urllib.parse.urlencode([
    ('js_code', js_code),
    ('compilation_level', 'SIMPLE_OPTIMIZATIONS'),
    ('output_format', 'text'),
    ('output_info', 'compiled_code'),
  ])

print('Project length: {} char'.format(len(js_code)))
print('Compiling code ...')
# Always use the following value for the Content-type header.
headers = { "Content-type": "application/x-www-form-urlencoded" }
conn = httplib.HTTPConnection('closure-compiler.appspot.com')
conn.request('POST', '/compile', params, headers)
response = conn.getresponse()
data = response.read()
print('Compiled length: {} char'.format(len(data)))
with open('app.js', 'wb') as output:
	output.write(data)
conn.close()

print('Done')