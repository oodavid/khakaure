/******************* Khakaure *******************/

KKR = {};
KKR.init = function(){
	// Create each of the layers (no worries about the height)
	layer1 = Raphael("layer1", 10, 10);
	layer2 = Raphael("layer2", 10, 10);
	layer3 = Raphael("layer3", 10, 10);
	// Attach the resize function
	$(window).resize(KKR.resize);
	$(window).resize();
	// Add a bg-circle to the focus point
	layer1.circle(0, 0, 70).attr({
		'fill': '#CCCCCC',
		'stroke': 'none'
	});
	// Add our default item and click it
	KKR.additem({ id: "i1", parent: null, data: { title: "Culture Hack" } });
	KKR.click("i1");
	// The animation loop
	setInterval(KKR.render, 30);
};
$(document).ready(KKR.init);
// When the browser resizes...
KKR.resize = function(){
	// Do some wee calcs
	KKR.w = $('nav').width();
	KKR.h = $('nav').height();
	// Resize the layers to fit and center them
	layer1.setSize(KKR.w, KKR.h).setViewBox(KKR.w/-2, KKR.h/-2, KKR.w, KKR.h, false);
	layer2.setSize(KKR.w, KKR.h).setViewBox(KKR.w/-2, KKR.h/-2, KKR.w, KKR.h, false);
	layer3.setSize(KKR.w, KKR.h).setViewBox(KKR.w/-2, KKR.h/-2, KKR.w, KKR.h, false);
};
// Items...
KKR.items = {};
KKR.current = false;
KKR.additem = function(item){
	// Ignore if we already have this
	if(KKR.items[item.id]){
		return;
	}
	// Create the node in random space for now
	var cx = Math.round( (Math.random() * 200) - 100 );
	var cy = Math.round( (Math.random() * 200) - 100 );
	item.dx = 0;
	item.dy = 0;
	// Add the visual bit, note that it is referenced in the item, and vice-versa :-)
	item.circle = layer3.circle(cx, cy, 1).attr({
		fill: '#64A0C1',
		stroke: '#FFFFFF',
		'stroke-width': 0
	}).animate({ r: 25, 'stroke-width': 5 }, 1000, "ease-in-out");
	item.circle.data('item', item);
	// Render the item data when we click a node
	item.circle.click(function(){
		KKR.click(this.data('item').id);
	});
	// Add it to the cache
	KKR.items[item.id] = item;
};
KKR.removeitem = function(item){
	// Pretty simple
	item.circle.remove();
	delete KKR.items[item.id];
	/*
	// With animations (causes problems when going backward...)
	item.circle.animate({ r: 1, 'stroke-width': 1 }, 1000, "ease-in-out", function(){
		delete KKR.items[this.data('item').id];
		this.remove();
	});
	*/
};
KKR.removeexcess = function(){
	// Move up the tree and remove anything not part of our history
	var ok = [];
	var current = KKR.current;
	while(current){
		ok.push(current.id);
		current = current.parent ? KKR.items[current.parent] : false;
	}
	$.each(KKR.items, function(k,item){
		// If it's not in the history, nor a child od the current
		if($.inArray(k, ok) == -1 && item.parent != KKR.current.id){
			KKR.removeitem(item);
		}
	});
};
// The animation loop
KKR.render = function(){
	// Apply forces to the items
	$.each(KKR.items, function(k,item){
		// Hooke attraction between this and it's parent
		if(item.parent){
			var parent = KKR.items[item.parent];
			KKR.hooke_attraction(item, parent);
		}
		// Coulomb repulsion between all items
		$.each(KKR.items, function(k2,item2){
			if(k != k2){
				KKR.coulomb_repulsion(item,item2);
			}
		});
		// Need to dampen too...
		KKR.dampen(item);
	});
	// Move the items
	$.each(KKR.items, function(k,item){
		if(item != KKR.current){
			// Apply the force
			var cx = item.circle.attr('cx') + item.dx;
			var cy = item.circle.attr('cy') + item.dy;
			// Move the circle
			item.circle.attr('cx', cx).attr('cy', cy);
		}
	});
	// Render the lines
	layer2.clear();
	$.each(KKR.items, function(k,item){
		// Does it have a parent?
		if(item.parent){
			var from	= item.circle;
			var to		= KKR.items[item.parent].circle;
			var coords	= 'M' + from.attr('cx') + ' ' + from.attr('cy') + 'L' + to.attr('cx')   + ' ' + to.attr('cy');
			item.path = layer2.path(coords).attr({
				stroke: "#FFFFFF",
				'stroke-width': 2
			});
		}
	});
};
KKR.click = function(itemid){
	// Are we already the focus?
	var item = KKR.items[itemid];
	if(KKR.current == item){
		return;
	}
	// Shrink the old focus
	if(KKR.current){
		KKR.current.circle.animate({ r: 25 }, 1000, "ease-in-out");
	}
	// Render the info
	KKR.ui.renderItemData(item);
	// Focus this item
	KKR.current = item;
	item.circle.toFront();
	item.circle.animate({ cx: 0, cy: 0, r: 50, fill: '#E7AF14' }, 1000, "ease-in-out");
	// Load it's children
	$.ajax({
		type:		'POST',
		url:		'/load.php',
		dataType:	'json',
		data:		{ id: item.id },
		success:	KKR.success,
		error:		KKR.error
	});
};
KKR.success = function(data, textStatus, jqXHR){
	// Add the items
	$.each(data, function(k,v){
		// To the main thing
		KKR.additem(v);
		// To the footer
		$('.common_foot ul').append($('<li />', { 'html': v.data.title }).click(function(e){
			KKR.click(v.id);
		}));
	});
};
KKR.error = function(jqXHR, textStatus, errorThrown){
	alert('Something went wrong talking to the server... kha-kau-re apologises!');
};
KKR.hooke_attraction = function(item1, item2){
	// Get the dist and angle
	var tmp		= KKR.dist_and_angle(item1, item2);
	// f = -k * x
	var f		= -$('#hooke').val() * ($('#sprlen').val() - tmp.dist);
	var fx		= Math.cos(tmp.angle) * f; // Just the force dived into the axis
	var fy		= Math.sin(tmp.angle) * f; // Just the force dived into the axis
	// Apply to both items
	item1.dx += fx;
	item1.dy += fy;
	item2.dx -= fx;
	item2.dy -= fy;
};
KKR.coulomb_repulsion = function(item1, item2){
	// Get the dist and angle
	var tmp		= KKR.dist_and_angle(item1, item2);
	// What's the charge on each item?
	c1 = (item1 == KKR.current) ? $('#charge2').val() : $('#charge1').val();
	c2 = (item2 == KKR.current) ? $('#charge2').val() : $('#charge1').val();
	// f = k * ( charge1 * charge2 / dist * dist )
	var f	= $('#coulomb').val() * (( c1 * c2 ) / (tmp.dist * tmp.dist));
	var fx	= Math.cos(tmp.angle) * f; // Just the force dived into the axis
	var fy	= Math.sin(tmp.angle) * f; // Just the force dived into the axis
	// Apply to one item
	item1.dx -= fx;
	item1.dy -= fy;
};
KKR.dampen = function(item){
	// Dead simple
	item.dx *= $('#friction').val();
	item.dy *= $('#friction').val();
};
KKR.dist_and_angle = function(item1, item2){
	// Pretty simple
	var dx		= item2.circle.attr('cx') - item1.circle.attr('cx');
	var dy		= item2.circle.attr('cy') - item1.circle.attr('cy');
	var dist	= Math.sqrt((dx*dx) + (dy*dy));
	var angle	= Math.atan2(dy, dx);
	return { dist: dist, angle: angle };
};

/******************* Interface ******************/

KKR.ui = {};
KKR.ui.init = function(){
	// Store the original settings
	$(':input').each(function(k,v){
		$(this).data('originalVal', $(this).val());
	});
	// Settings toggler and reset button
	$('#settings h2').click(KKR.ui.toggleSettings);
	$('#resetsettings').click(KKR.ui.resetSettings);
	$('#tidymap').click(KKR.removeexcess);
};
KKR.ui.toggleSettings = function(e){
	// Animate the settings area
	$('#sidebar').toggleClass('active');
};
KKR.ui.resetSettings = function(e){
	// Restore the original settings
	$(':input').each(function(k,v){
		$(this).val($(this).data('originalVal'));
	});
};
KKR.ui.renderItemData = function(item){
	// Empty the article
	$('article').empty();
	// Always show the common header
	$("#common_head").tmpl().appendTo("article");
	// Is it the root item?
	if(item.id == "i1"){
		// We have something special for you
		$("#intro").tmpl().appendTo("article");
	} else {
		var data = item.data;
		// Loop the data and add it to the article...
		$.each(data, function(k,v){
			switch(k.toLowerCase()){
				case "title":
					$("#title").tmpl({ key: k , val: v }).appendTo("article");
					break;
				case "desc":
				case "description":
					$("#description").tmpl({ key: k , val: v }).appendTo("article");
					break;
				case "html":
					$("#html").tmpl({ key: k , val: v }).appendTo("article");
					break;
				case "address":
					var el = $("#address").tmpl({ key: k , val: v }).appendTo("article");		
					// Activate the map
					var latlng = new google.maps.LatLng(55, -1.6);
					var myOptions = {
						zoom:			10,
						center:			latlng,
						scrollwheel:	false,
						mapTypeId:		google.maps.MapTypeId.ROADMAP
					};
					var map = new google.maps.Map(el.find('.gmap')[0], myOptions);
					var marker = new google.maps.Marker({ map: map, position: latlng });
					// Geocode the map
					var geocoder = new google.maps.Geocoder();
					geocoder.geocode({ 'address': v }, function(results, status) {
						if (status == google.maps.GeocoderStatus.OK) {
							// Move the map and the marker
							map.setCenter(results[0].geometry.location);
							marker.setPosition(results[0].geometry.location);
						} else {
							// Oh no!
							alert("Geocode was not successful for the following reason: " + status);
						}
					});
					break;
				case "img":
				case "image":
				case "pic":
				case "picture":
					$("#image").tmpl({ key: k , val: v }).appendTo("article");
					break;
				default:
					$("#default").tmpl({ key: k , val: v }).appendTo("article");
					break;
			}
		});
	}
	// Always show the common footer
	$("#common_foot").tmpl().appendTo("article");
};
$(document).ready(KKR.ui.init);
