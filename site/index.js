$(function () {
	start();
});

// GLOBAL --------------------------------------------------------
var EntityL = {
	'none': 0,
	'heart': 1,
	'vein': 2,
	'zyg': 3
}

// FIELD OBJECT -----------------------------------------------

/**
 * @constructor
 */
function Field(width, height){
	// the height of the field, in squares
	this.height = height;
	
	// the width of the field, in squares
	this.width = width;
	
	// list of entities associated by their uid
	this.entities = {};
	
	// 2d array of entity UIDs associated by their position
	this.entityUIDsByPosition = createArray(width, height);
	
	for(var i = 0; i < this.entityUIDsByPosition.length; i++){
		for(var j = 0; j < this.entityUIDsByPosition[i].length; j++){
			(function(i, j, field){
				// initialize list
				 field.entityUIDsByPosition[i][j] = [];
			})(i, j, this);
		}
	}
	
	// list of entity uids that have been changed
	this.dirtyData = [];
}

Field.prototype = {
	/**
	 * @param {Entity} entity
	 */
	add: function(entity)
	{
		this.entities[entity.uid] = entity;
		this.entityUIDsByPosition[entity.x][entity.y].push(entity.uid);
		this.change(entity);
	},
	
	/**
	 * @param {Entity} entity
	 */
	change: function(entity)
	{
		if(this.dirtyData.indexOf(entity.uid) == -1){
			this.dirtyData.push(entity.uid);
		}
	},
	
	/**
	 * @param {Entity} entity
	 * @param {int} oldX
	 * @param {int} oldY
	 * @param {int} newX
	 * @param {int} newY
	 */
	reindexPosition: function(entity, oldX, oldY, newX, newY)
	{
		if(oldX == newX && oldY == newY){
			return;
		}
	
		var oldLocEntities = this.entityUIDsByPosition[oldX][oldY];
		var newLocEntities = this.entityUIDsByPosition[newX][newY];
		
		var oldNdx = oldLocEntities.indexOf(entity.uid);
		var newNdx = newLocEntities.indexOf(entity.uid);
		
		if(oldNdx != -1){
			// remove old index
			oldLocEntities.splice(oldNdx, 1);
			
			// add new index
			if(newNdx == -1){
				this.entityUIDsByPosition[newX][newY].push(entity.uid);
			}
		}
	},
	
	/**
	 * @param {int} x
	 * @param {int} y
	 @ @return {bool}
	 */
	isLocationEmpty: function(x, y)
	{
		var entityListAtPos = this.entityUIDsByPosition[x][y];
		
		if(entityListAtPos.length > 0){
			return false;
		}
		
		return true;
	},
	
	/**
	 * @param {int} x
	 * @param {int} y
	 * @param {int} entityType
	 @ @return {bool}
	 */
	doesLocationContainEntityType: function(x, y, entityType)
	{
		var entityListAtPos = this.entityUIDsByPosition[x][y];
		
		if(entityListAtPos.length == 0){
			return false;
		}
		
		for(var i=0; i < entityListAtPos.length; i++){
			if(this.entities[entityListAtPos[i]].id == entityType){
				return true;
			}
		}
		
		return false;
	}
}


// RENDERER OBJECT -----------------------------------------------

/**
 * @constructor
 */
function Renderer(){
	// list of image data associated with entity uid
	this.imageData = {}
	
	// dirty flag
	this.isDirty = true;
	
	// time of last draw and other fps calc values
	this.drawIntervalStart = Date.now();
	this.drawsSinceReset = 0;
}

Renderer.prototype = {
	/**
	 * @param {Stage} stage
	 * @param {object} entityList
	 */
	initialize: function(stage, entityList)
	{		
		this.dirtyLayer = new Kinetic.Layer({
			clearBeforeDraw: false,
			hitGraphEnabled: false
		});
		
		this.debugLayer = new Kinetic.Layer({
			clearBeforeDraw: true,
			hitGraphEnabled: false
		});
		
		stage.add(this.dirtyLayer);
		stage.add(this.debugLayer);
		
		this.fpsCounter = new Kinetic.Text({
			text: 'FPS: ',
			fontSize: 18,
			fontFamily: 'Consolas',
			fill: 'black'
		});
		
		this.debugLayer.add(this.fpsCounter);
	},
	
	/**
	 * @param {Field} field
	 */
	update: function(field)
	{
		var uid;

		// for all data that has changed...
		while((uid = field.dirtyData.pop()) != null){ 
			(function ( uid, renderer ){
				var entity = field.entities[uid];
				
				// create image data if it does not exist yet
				if(!renderer.imageData.hasOwnProperty(uid)){
					var label = new Kinetic.Label({
						x: 15 * entity.x,
						y: 15 * entity.y,
						listening: false
					});
					
					label.add(new Kinetic.Tag({
						fill: 'white'
					}));
					
					label.add(new Kinetic.Text({
						text: '@',
						fontSize: 18,
						fontFamily: 'Consolas',
						fill: 'green',
						padding: 1
					}));
					
					renderer.imageData[uid] = label;
				}
				
				var image = renderer.imageData[uid];
				
				if(image.getText() === undefined){
					var result = "";
					
					for (var i in image) {
						if (image.hasOwnProperty(i)) {
							result += "image." + i + " = " + image[i] + "\n";
						}
					}
					
					alert(result);
				}
				
				// update render image
				if(entity.id == EntityL.none){
					image.getText().text(' ');
				} else if(entity.id == EntityL.heart){
					image.getText().text('H');
				} else if(entity.id == EntityL.vein){
					image.getText().text('v');
				} else if(entity.id == EntityL.zyg){
					image.getText().text('z');
				}
				
				// update render position
				image.position({x: 15 * entity.x, y: 15 * entity.y});
				
				renderer.dirtyLayer.add(image);
				
				renderer.isDirty = true;
			})( uid, this );
		}
	},
	
	render: function()
	{
		if(this.isDirty){
			var images = this.dirtyLayer.getChildren();
		
			console.log('drawing ' + images.length + ' objects')
			
			// draw changed images then clear layer
			this.dirtyLayer.drawScene();
			
			for(var i=0; i < images.length; i++){
				(function (image){
					image.remove();
				})(images[i]);
			}

			this.isDirty = false;
		}
		
		this.drawsSinceReset++;
		
		if(Date.now() - this.drawIntervalStart >= 500){
			//fps calculation
			var fps = Math.round(500.0 / (Date.now() - this.drawIntervalStart) * this.drawsSinceReset * 2);
			
			this.fpsCounter.setText('FPS: ' + fps);
			
			this.debugLayer.draw();
			
			this.drawIntervalStart = Date.now();
			
			this.drawsSinceReset = 0;
		}
	}
}


// ENTITY OBJECT -----------------------------------------------
var entityNextUID = 0;

/**
 * @constructor
 */
function Entity(id, field, x, y){
	// unique identifier for this entity
	this.uid = entityNextUID++;
	
	// the id for this entity
	this.id = id;
	
	// x position in game space for this entity
	this.x = x;
	
	// y position in game space for this entity
	this.y = y;
	
	// link back to the field object
	this.field = field;
	
	this.field.add(this);
}

Entity.prototype = {
	/**
	 * @param {int} x
	 * @param {int} y
	 */
	setPos: function(x, y)
	{
		this.field.reindexPosition(this, this.x, this.y, x, y);
		this.x = x;
		this.y = y;
		this.field.change(this);
	},

	/**
	 * @param {int} x
	 */
	setX: function(x)
	{
		this.field.reindexPosition(this, this.x, this.y, x, this.y);
		this.x = x;
		this.field.change(this);
	},
	
	/**
	 * @param {int} y
	 */
	setY: function(y)
	{
		this.field.reindexPosition(this, this.x, this.y, this.x, y);
		this.y = y;
		this.field.change(this);
	},
	
	/**
	 * @param {int} id
	 */
	setId: function(id)
	{
		this.id = id;
		this.field.change(this);
	},
	
	/**
	 * @param {bool} mustBeEmpty
	 * @return {object}
	 */
	getAdjacentCoord: function(mustBeEmpty)
	{
		var potentialCoords = [];
		
		if(this.x > 0 && (!mustBeEmpty || (mustBeEmpty && this.field.isLocationEmpty(this.x - 1, this.y)))){
			// west slot is possible
			potentialCoords.push({'x': this.x - 1, 'y': this.y});
		} 
		
		if(this.x < this.field.width - 1 && (!mustBeEmpty || (mustBeEmpty && this.field.isLocationEmpty(this.x + 1, this.y)))){
			// east slot is possible
			potentialCoords.push({'x': this.x + 1, 'y': this.y});
		} 
		
		if(this.y > 0 && (!mustBeEmpty || (mustBeEmpty && this.field.isLocationEmpty(this.x, this.y - 1)))){
			// north slot is possible
			potentialCoords.push({'x': this.x, 'y': this.y - 1});
		}
		
		if(this.y < this.field.height - 1 && (!mustBeEmpty || (mustBeEmpty && this.field.isLocationEmpty(this.x, this.y + 1)))){
			// south slot is possible
			potentialCoords.push({'x': this.x, 'y': this.y + 1});
		}
		
		if(potentialCoords.length == 0){
			return null;
		}
		
		return potentialCoords[Math.floor(Math.random() * potentialCoords.length)];
	},
	
	getNeighborCount: function(entityType)
	{
		var neighborCount = 0;
		
		if( this.x > 0 && this.field.doesLocationContainEntityType(this.x - 1, this.y, entityType) ){
			neighborCount++;
		}
		
		if( this.x < this.field.height - 1 && this.field.doesLocationContainEntityType(this.x + 1, this.y, entityType) ){
			neighborCount++;
		}
		
		if( this.y > 0 && this.field.doesLocationContainEntityType(this.x, this.y - 1, entityType) ){
			neighborCount++;
		}
		
		if( this.y < this.field.height - 1 && this.field.doesLocationContainEntityType(this.x, this.y + 1, entityType) ){
			neighborCount++;
		}
		
		return neighborCount;
	},
	
	tick: function()
	{
		if(this.id == EntityL.heart){
			//randomly generate a vein nearby
			if(Math.random() <= 0.05){
				var adjCoord = this.getAdjacentCoord(true);
				
				if(adjCoord != null){
					var vein = new Entity(EntityL.vein, this.field, 0, 0);
					vein.setPos(adjCoord.x, adjCoord.y);
					
					console.log('Vein created at ' + adjCoord.x + ',' + adjCoord.y + ' from ' + this.x + ',' + this.y);
				}
			}
		} else if (this.id == EntityL.zyg){
			//randomly split
			if(Math.random() <= 0.05){
				var adjCoord = this.getAdjacentCoord(true);
				
				if(adjCoord != null){
					var zyg = new Entity(EntityL.zyg, this.field, 0, 0);
					zyg .setPos(adjCoord.x, adjCoord.y);
					
					console.log('Zyg created at ' + adjCoord.x + ',' + adjCoord.y + ' from ' + this.x + ',' + this.y);
				}
			}
		}
	}
}


//functions
function start(canvas){
	var stage = new Kinetic.Stage({
		container: 'content',
		width: window.innerWidth,
		height: window.innerHeight
	});
	
	//resize stage as needed
	$(window).on('resize', function(){
		if(this.resizeTimeout){
			clearTimeout(this.resizeTimeout);
		}
		
		this.resizeTimeout = setTimeout(function(){
			$(this).trigger('resizeEnd');
		}, 500);
	});
	
	$(window).on('resizeEnd orientationchange', function() {
		var scaleX = window.innerWidth / stage.getWidth();
	
		stage.setWidth(window.innerWidth);
		stage.setHeight(window.innerHeight);
		
		//reposition elements
		//var images = layer.getChildren();
		
		//for(var i=0; i < images.length; i++){
		//	if (typeof images[i] !== 'undefined'){
		//		images[i].setX(images[i].getX() * scaleX);
		//	}
		//}
		
		//layer.draw();
	});
	
	//game field data
	var field = new Field(80, 40);
	
	//renderer data
	var renderer = new Renderer();
	renderer.initialize(stage, field.entities);
	
	var newEntity1 = new Entity(EntityL.zyg, field, 0, 0);
	newEntity1.setPos(6,6);
	
	// time of last tick and other tps calc values
	var tickIntervalStart = Date.now();
	var ticksSinceReset = 0;
	var ticksPerSecondTarget = 15;
	
	//main loop
	var loop = setInterval(function(){
		//we must perform a set amount of ticks per second
		//so that the logic does not depend on the render speed
		if(Date.now() - tickIntervalStart >= 1000){
			if(ticksSinceReset < ticksPerSecondTarget){
				for(var t = 0; t < ticksPerSecondTarget - ticksSinceReset; t++){
					tick(field);
				}
			}
			
			ticksSinceReset = 0;
			tickIntervalStart = Date.now();
		} else {
			tick(field);
			ticksSinceReset++;
		}
		
		//render as fast as possible
		renderer.update(field);
		renderer.render();
	}, 15);
}

function tick(field){
	for (var uid in field.entities){
		if (field.entities.hasOwnProperty(uid)) {
			var entity = field.entities[uid];
	
			entity.tick();
		}
	}
}

