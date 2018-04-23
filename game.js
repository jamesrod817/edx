// Hand it in this way: for simpler testing, always use the same seed.
Math.seedrandom(0);

// constants
const DEFAULT_BOARD_SIZE = 8;
// set size from URL or to default
const size = Math.min(10, Math.max(3, Util.getURLParam("size") || DEFAULT_BOARD_SIZE));

// Holds DOM elements that don’t change, to avoid repeatedly querying the DOM
var dom = {};

// data model at global scope for easier debugging
// initialize board model
var board = new Board(size);

// load a rule
var rules = new Rules(board);
var abc = "abcdefghij"
var pulses = [];
var xclick = 0;
var yclick = 0;
var time = 0;
var crushing = false;


function createGrid(x) {
	var divSize = (400/x);
	document.getElementById("container").style.setProperty("--size", x);	

    for (var rows = 0; rows < x; rows++) {
        for (var columns = 0; columns < x; columns++) {
        	var div = document.createElement("div");
    	    div.className = "grid-item";
    	    div.id = abc[columns] + (rows+1);
            Util.one("#container").appendChild(div);

        };
    };

};

function removeHint(){
	for(var i = 0; i < pulses.length; i++){
		var element = document.getElementById(pulses[i]);
		element.className = "image"
	}
	pulses = [];
}

function showHint(){
	var move = rules.getRandomValidMove();
	if (!move){
		return;
	}

	var candies = rules.getCandiesToCrushGivenMove(move.candy, move.direction);

	pulses = [];
	for (var i = 0; i < candies.length; i++){
		var cell = abc[candies[i].col] + (candies[i].row+1);
		var element = document.getElementById("image"+cell);
		element.className = "pulsing";
		pulses.push("image"+cell);
	}
}


async function crushCandy(){
	crushing = true;
	var candies = rules.getCandyCrushes();
	var list = [];
	for (var i =0; i < candies.length; i++){
		for (var j = 0; j < candies[i].length; j++){
			var cell = abc[candies[i][j].col] + (candies[i][j].row+1);
			var image = document.getElementById("image"+cell);
			image.className = "faded";
			list.push(image)
		}
	}
	await Util.afterAnimation(list, "fadeout");
	rules.removeCrushes(candies);
	
	rules.moveCandiesDown();
	
	setTimeout(function(){
		if (rules.getCandyCrushes().length == 0){
			clearTimeout(time);
    		time = setTimeout(showHint, 5000);
    		crushing = false;
			return
		}else{
			crushCandy();

		}	
	}, 500);

	return
}

function around(fromrow, fromcol, torow, tocol){
	if ((Math.abs(fromrow-torow) + Math.abs(fromcol-tocol)) == 1){
		return true;
	}else{
		return false
	} 

}

function moveback(candy){
	candy.className = "move-back"
	Util.afterAnimation(candy, "back").then( function() {
		candy.className = "image";
		clearTimeout(time);
		time = setTimeout(showHint, 5000);
	})
	return
}


// Attaching events on document because then we can do it without waiting for
// the DOM to be ready (i.e. before DOMContentLoaded fires)
Util.events(document, {
	// Final initalization entry point: the Javascript code inside this block
	// runs at the end of start-up when the DOM is ready
	"DOMContentLoaded": function() {
		// Your code here

		// Element refs
		//Util.one("#score").disabled = true; 
		dom.controlColumn = Util.one("#controls"); // example
		createGrid(size);
		// Util.one("#text").focus();
		rules.prepareNewGame();
		clearTimeout(time);
    	time = setTimeout(showHint, 5000);


		// Add events
		
		Util.one("#new-game").addEventListener("click", function(){
			rules.prepareNewGame()
			Util.one("#points").innerHTML = "0";		
			Util.one("#score").style.background = '#D3D3D3';
			document.getElementsByClassName('buttonscore')[0].style.color = "#FFFFFF";
			clearTimeout(time);
    		time = setTimeout(showHint, 5000);

			}); // example

	},
	"mousedown": function(evt) {
    	if (crushing == true){
    		return;
    	}
    	var element = document.elementFromPoint(evt.clientX, evt.clientY);
    
    	if (element.tagName == "IMG"){
    		removeHint();
    		clearTimeout(time);
	    	element.className = "dragged-image"
	    	xclick = evt.clientX;
	    	yclick = evt.clientY;
	    	console.log(xclick)
	    	console.log(yclick)
	    	document.documentElement.style.setProperty('--top', 0 + 'px');
	    	document.documentElement.style.setProperty('--left', 0 + 'px');
			element.ondragstart = function() {return;}
    	}
    },

    "mousemove": function(evt) {
    	var element = Util.one(".dragged-image");

    	if (element != null) {
	    	document.documentElement.style.setProperty('--left', (evt.clientX - xclick) + 'px')	
	    	document.documentElement.style.setProperty('--top', (evt.clientY - yclick) + 'px')
			console.log("moving right ", evt.clientX - xclick)
			console.log("moving down ",evt.clientY - yclick)
		}
    },

     "mouseup": function(evt) {
    	clearTimeout(time)
    	var candy = Util.one(".dragged-image");
    	if (candy != null) {
	    	var toCandy = document.elementFromPoint(evt.clientX, evt.clientY);    	
	    	if(toCandy == null){
	    		moveback(candy);
	    		return
	    	}

	    	if (toCandy.tagName == "IMG") {
	    		toCandy = toCandy.parentElement;
	    	}else{
	    		moveback(candy);
	    		return;
	    	}
	    
	    	if (toCandy.tagName == "DIV") {
		    	var candyParent = candy.parentElement;
		    	var fromcol = abc.indexOf(candyParent.id[0]);
				var fromrow = (parseInt(candyParent.id.substring(1))-1);
				var tocol = abc.indexOf(toCandy.id[0]);
				var torow = (parseInt(toCandy.id.substring(1)-1)) 
		    	var fromCandy = board.getCandyAt(fromrow, fromcol)
		    	toCandy = board.getCandyAt(torow, tocol);

		    	if (!around(fromrow, fromcol, torow, tocol)){
		    		moveback(candy);
		    	}

		    	var directions = ["left", "right", "up", "down"];
	            for (i = 0; i < directions.length; i++) {
	                direction = directions[i];
	                if (board.getCandyInDirection(fromCandy, direction) == toCandy) {
	                	if (rules.isMoveTypeValid(fromCandy, direction)) {
	                		board.flipCandies(fromCandy, toCandy)
	                		crushCandy()
	                		return;
	                	}
	                	else {
	                		moveback(candy);
	                	}
	                }
				}

			}
    		
    	
    }
    },


	
	// Click events arrive here
	"click": function(evt) {
		// Your code here
	}
});

// Attaching events to the board
Util.events(board, {
	// add a candy to the board
	"add": function(e) {
		color = e.detail.candy.color;
		var candy = "graphics/"+color+"-candy.png";	
		var cell = abc[e.detail.toCol] + (e.detail.toRow+1); 
		var contain = document.getElementById(cell);
		contain.innerHTML = "<img src='" + candy +"'class='image' id='image"+cell+"'>";
		var element = contain.firstChild;
		var y = e.detail.toRow - e.detail.fromRow;
        document.documentElement.style.setProperty('--translate', y);
        element.className = "move-down"
        Util.afterAnimation(element, "slide").then(function() {
            element.className = "image";
            document.documentElement.style.setProperty('--translate', 1);
		})
	},

	// move a candy from location 1 to location 2
	"move": function(e) {
		color = e.detail.candy.color;
		var candy = "graphics/"+color+"-candy.png";	
		var cell = abc[e.detail.toCol] + (e.detail.toRow+1); 
		var element = document.getElementById("image"+cell);

		var y = e.detail.toRow - e.detail.fromRow;
		var x = e.detail.toCol - e.detail.fromCol;

		element.className = "image"
        element.src = "graphics/" + e.detail.candy.color + "-candy.png";
        if (y == 1) {
            element.className = "move-down";
        }
        else if (y == -1) {
            element.className = "move-up";
        }
        else if (x == 1) {
            element.className = "move-right";
        }
        else if (x == -1) {
            element.className = "move-left"
        }
        else if (y > 1) {
            document.documentElement.style.setProperty('--translate', y);
            element.className = "move-down"
        }
        
        Util.afterAnimation(element, "slide").then(function() {
            element.className = "image";
            document.documentElement.style.setProperty('--translate', 1);
        })

    },
	
	// remove a candy from the board
	"remove": function(e) {
		// try{

		var cell = abc[e.detail.fromCol] + (e.detail.fromRow+1); 
		var contain = document.getElementById("image"+cell);
		if (!contain){
			return
		}
		if (contain.className == "move-down") {
    		Util.afterAnimation(contain, "slide").then(function() {
        		contain.className = "faded";
        	})
    	}
        contain.className = "faded";

	},

	// update the score
	"scoreUpdate": function(e) {
		var current_score = parseInt(Util.one("#points").innerHTML);
		Util.one("#points").innerHTML = current_score+1;
		var color = Util.one("#score").style.background = e.detail.candy.color;
		if (color == "yellow"){
			document.getElementsByClassName('buttonscore')[0].style.color = "#000000";
		}else{
			document.getElementsByClassName('buttonscore')[0].style.color = "#FFFFFF";
		}
	},
});
