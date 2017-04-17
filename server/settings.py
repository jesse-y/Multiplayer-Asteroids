#world settings
WORLD_X = 800
WORLD_Y = 600

#game settings
GAME_SPEED = 60
SEND_RATE = 20
MAX_PLAYERS = 1

#game object settings
PLAYER_SPEED = 250
BULLET_SPEED = 500

ENEMY_SPEED = 100

#app settings
MAX_USERS = 100

#user settings
CLIENT_RATE = 30

#object presets
obj_type_speed = {
	'player': PLAYER_SPEED,
	'bullet': BULLET_SPEED,
}

obj_type_shape = {
	'player': [[0,20],[14,-14],[-14,-14]],
	'bullet': [[2,2],[2,-2],[-2,-2],[-2,2]],
	'asteroid_1': [[0,10], [12,5], [5,-7], [-2,-9], [-6,4]],
	'asteroid_2': [[3,15], [13,5], [9,-9], [-11,-5], [-8,1]],
	'asteroid_3': [[5,9], [15,9], [2,-12], [-16,-7], [-10,5]],
	'asteroid_4': [[4,29], [30,12], [20,-25], [-5,-17], [-20,9]],
	'asteroid_5': [[2,20], [28,3], [14,-22], [-8,-20], [-18,14]],
	'asteroid_6': [[14,33], [28,2], [35,-30], [-10,-17], [-8,10]],
	'asteroid_7': [[33,-2], [25,-30], [-15,-27], [-42,-6], [-13,31], [15,40]],
	'asteroid_8': [[36,-1], [12,-43], [-21,-37], [-34,-1], [-23,29], [26,38]],
	'asteroid_9': [[38,-6], [21,-30], [-14,-35], [-33,5], [-28,36], [18,26]],
}