#world settings
WORLD_X = 640
WORLD_Y = 480

#game settings
GAME_SPEED = 60
SEND_RATE = 20
MAX_PLAYERS = 1

#game object settings
PLAYER_SPEED = 250
BULLET_SPEED = 500

ENEMY_SPEED = 100

#client settings
CLIENT_SPEED = 1./30

#app settings
MAX_USERS = 100

#user settings
CLIENT_RATE = 30

#object presets
obj_type_speed = {
	'player': PLAYER_SPEED,
	'bullet': BULLET_SPEED,
	'block': 0
}

obj_type_shape = {
	'player': [[0,20],[14,-14],[-14,-14]],
	'bullet': [[2,2],[2,-2],[-2,-2],[-2,2]],
	'block': [[40,40],[40,-40],[-40,-40],[-40,40]]
}