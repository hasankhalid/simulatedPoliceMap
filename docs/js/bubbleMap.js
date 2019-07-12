function getBubbleMapCreator(csvData, outerGJ,innerGJ,svgSelector, rLegendSelector, cLegendSelector){
	var geoGenerator;
	var bosNames = {"Attock":"Attock","Bahawalnagar":"Bahawalnagar","Bahawalpur":"Bahawalpur","Bhakkar":"Bhakkar","Chakwal":"Chakwal","Chiniot":"Chiniot","Dera Ghazi Khan":"DG Khan","Faisalabad":"Faisalabad","Gujranwala":"Gujranwala","Gujrat":"Gujrat","Hafizabad":"Hafizabad","Jhang":"Jhang","Jhelum":"Jhelum","Kasur":"Kasur","Khanewal":"Khanewal","Khushab":"Khushab","Lahore":"Lahore","Layyah":"Layyah","Lodhran":"Lodhran","Mandi Bahauddin":"Mandi Bahauddin","Mianwali":"Mianwali","Multan":"Multan","Muzaffargarh":"Muzaffargarh","Nankana Sahib":"Nankana Sahib","Narowal":"Narowal","Okara":"Okara","Pakpattan":"Pakpattan","Rahim Yar Khan":"RY Khan","Rajanpur":"Rajanpur","Rawalpindi":"Rawalpindi","Sahiwal":"Sahiwal","Sargodha":"Sargodha","Sheikhupura":"Sheikhupura","Sialkot":"Sialkot","Toba Tek Singh":"TT Singh","Vehari":"Vehari"};

	//createMap();

	var colorLegend;
	var circleLegend;

	var legendColors = ['#fff','#fff'];

	var svg = d3.select(svgSelector);

	svg.attr('viewBox', '0 0 800 800');

	function createMap(ind1, ind2){

		circleLegend = bubbleMap.createConcentricCircleLegend(rLegendSelector, [50,100], ['','']);
		colorLegend = bubbleMap.createColorLegend(cLegendSelector, legendColors,['','']);


		innerGJ.features.forEach((d)=>{
			d.properties.districts = bosNames[d.properties.districts];
		});

		//create punjab map
		var projection = d3.geoMercator().
			fitExtent([[0, 0], [700, 700]], innerGJ);

		geoGenerator = d3.geoPath()
			.projection(projection);

		//create outline
		var oProjection = d3.geoMercator().
			fitExtent([[0, 0], [700, 700]], outerGJ);

		var oGeoGenerator = d3.geoPath()
			.projection(oProjection);

		var gMap = svg
			.append('g')
			.attr('class', 'g-map');

		gMap.selectAll('path')
		    .data(innerGJ.features)
		    .enter()
		    .append('path')
		    	.attr('d', geoGenerator)
		    	.attr('stroke-dasharray', function(){
		    		return `${this.getTotalLength()},${this.getTotalLength()}`;
		    	})
		    	.attr('stroke-dashoffset', function(){
		    		return this.getTotalLength();
		    	});


		new Promise(function(resolve){
			svg.append('g')
					.attr('class', 'g-outline')
				.selectAll('path')
			    .data(outerGJ.features)
			    .enter()
			    .append('path')
		    		.attr('d', oGeoGenerator)
		    		.attr('stroke-dasharray', function(){
		    			return `${this.getTotalLength()},${this.getTotalLength()}`;
		    		})
		    		.attr('stroke-dashoffset', function(){
		    			return this.getTotalLength();
		    		})
		    .transition()
		    	.duration(500)
		    	.attr('stroke-dashoffset', 0)
		    	.call(allTransitionEnd, resolve);
		})
		.then(function(){

			//create circles
			var centroids = getCentroids(gMap);

			csvData.forEach((d)=>{
				d.centroid = centroids[d.District];
			});

			var gCircles = svg.append('g')
					.attr('class', 'g-circles');

			var gVor = svg.append('g')
					.attr('class', 'g-vor')
					.style('transform','translate(50px, 50px)');

			//circle Scale
			console.log(ind1, ind2);
			createCircle(ind1, ind2);
		});
	}

	function allTransitionEnd(transition, callback) {
	    if (typeof callback !== "function") throw new Error("Wrong callback in endall");
	    if (transition.size() === 0) { callback() }
	    var n = 0;
	    transition
	        .each(function() { ++n; })
	        .on("end", function() {
	         	if (!--n) callback();
	     	});
	}

	//filter code

	var filterModule = FilterModule();

	var filterSeq = new filterModule.FilterSequence();


	function addNumericFilter(min,max,ind){
		var filterFunc = (d)=>{
			var val = parseFloat(d[ind]);
			return val >= min && val <= max;
		};

		var filter = new filterModule.Filter(filterFunc, ind);
		filterSeq.add(filter);
	}

	function removeFilter(name){
		filterSeq.remove(name);
	}

	function removeAllFilters(){
		filterSeq.removeAll();

		svg.selectAll('.g-circles circle')
			.classed('c-filter-show', false)
			.transition()
			.duration(400)
			.delay((d,i)=> i * 5 * Math.random())
			.attr('r', (d)=>d.originalRadius)
			.style('opacity', 0.7);
	}

	function executeFilter(){

		//remove filter class
		/*svg.selectAll('.g-circles circle')
			.classed('c-filter-show', false);*/

		var selection = filterSeq.execute(svg.selectAll('.g-circles circle'));

		//show all that were previosly filtered
		console.log(selection);

		selection.filter(function(){
				return !this.classList.contains('c-filter-show');
			})
			.transition()
			.duration(400)
			.delay((d,i)=> i * 5 * Math.random())
			.attr('r', (d)=>d.originalRadius)
			.style('opacity', 0.7);

		//set not filtered class
		svg.selectAll('.g-circles circle')
			.classed('c-filter-show', false);

		selection.classed('c-filter-show', true);

		//remove all filtered
		svg.selectAll('.g-circles circle:not(.c-filter-show)')
			.classed('c-filter-show', false)
			.transition()
			.duration(400)
			.delay((d,i)=> i * 5 * Math.random())
			.attr('r', 0)
			.style('opacity', 0);

		return selection;
	}

	var currentIdicators = {};

	function createCircle(rIndicator, cIndicator){

		//remove filters
		filterSeq.removeAll();

		currentIdicators.cIndicator = cIndicator;
		currentIdicators.rIndicator = rIndicator;

		var g = svg.select('.g-circles');

		new Promise(function(resolve){
			g.selectAll('circle')
			.transition()
			.duration(300)
			.delay((d,i)=>i * 5 * Math.random())
			.style('opacity', 0)
			.attr('radius', 0)
			.call(allTransitionEnd, resolve)
			.remove();

		})
		.then(function(){

			var maxrIndVal = parseFloat(d3.max(csvData,(d)=>parseFloat(d[rIndicator])));

			var rScale = d3.scaleSqrt().domain([
					0,
					maxrIndVal
				]).range([0,22]);

			//update legend

			updateLegendText(circleLegend, [Math.floor(maxrIndVal/2), maxrIndVal]);

			var maxcIndVal = parseFloat(d3.max(csvData,(d)=>parseFloat(d[cIndicator])));
			var mincIndVal = parseFloat(d3.min(csvData,(d)=>parseFloat(d[cIndicator])));

			updateLegendText(colorLegend, [Math.floor(mincIndVal), maxcIndVal]);

			var colorScale = d3.scaleLinear().domain([
					mincIndVal,
					maxcIndVal
				])
        		.range(legendColors);

			forceSim(csvData, rScale, rIndicator);

			g
				.selectAll('circle')
				.data(csvData)
				.enter()
				.append('circle')
				.each((d,i) =>{d.id = i;})
				.attr('cx', (d)=>d.x)
				.attr('cy', (d)=>d.y)
				.attr('r', 0)
				//.on('mouseover', addDistrictHighlight)
				/*.on('mouseout', function(d){
					removeDistrictHighlight(d);
					removeTooltip(d);
				})
				.on('mousemove', function(d){
					createTooltip(d, d3.event);
				})*/
				.attr('fill', legendColors[0])
				.style('opacity', 0)
				.transition()
				.duration(500)
				.delay((d,i)=>i * 5 * Math.random())
				.style('opacity', 0.7)
				.attr('r', function(d){
					var r = rScale(d[rIndicator]);
					d.originalRadius = r;
					return r;
				});

				createVoronoi();
		});
	}

	function createVoronoi(selection){

		let voronoi = d3.voronoi()
                 .x(d => d.x)
                 .y(d => d.y)
                 .extent([[0, 0], [
                 	800,
                 	800
                 ]]);
        let data = [];
        svg.selectAll('.g-circles circle').each((d)=>{
        	data.push(d);
        })

        svg.selectAll('.g-vor *').remove();

		svg.select('.g-vor')
			.append("defs")
		    .selectAll(".clip")
		    .data(voronoi.polygons(data))
		    .enter().append("clipPath")
		    .attr("class", "clip")
		    .attr("id", function(d) { return "clip-" + d.data.District.replace(/ /g,''); })
		    .append("path")
		    .attr("class", "clip-path-circle")
		    .attr("d", function(d) { return "M" + d.join(",") + "Z"; });

		svg.select('.g-vor')
			.selectAll(".circle-catcher")
		    .data(data)
		    .enter().append("circle")
		    .attr("class", function(d,i) { return "circle-catcher " + d.District; })
		    //Apply the clipPath element by referencing the one with the same countryCode
		    .attr("clip-path", function(d) { return "url(#clip-" + d.District.replace(/ /g,'') + ")"; })
		    .attr("cx", function(d) {return d.x;})
		    .attr("cy", function(d) {return d.y;})
		    //Make the radius a lot bigger
		    .attr("r", 50)
		    .style("fill", "none")
		    .style("pointer-events", "all")
		    .on('mouseover', addDistrictHighlight)
			.on('mouseout', function(d){
				removeDistrictHighlight(d);
				removeTooltip(d);
			})
			.on('mousemove', function(d){
				createTooltip(d, d3.event);
			})
	}

	function addDistrictHighlight(d){

			d3.selectAll('.g-map').selectAll('path').filter((e)=>e.properties.districts === d.District).raise().transition().duration(400).attr('stroke-dashoffset',0);

			d3.selectAll('.g-circles circle')
				.filter(function(){
					return this.style.opacity !== '0';
				})
				.transition()
				.duration(300)
				.attr('r', function(e){
					return d.District === e.District ? e.originalRadius * 1.2: e.originalRadius * 0.9;
				})
				.style('opacity', function(e){
					return d.District === e.District ? 0.8: 0.4;
				});
		}

	function removeDistrictHighlight(d){
		var selectedCircle = this;

		d3.selectAll('.g-map').selectAll('path').filter((e)=>e.properties.districts === d.District).transition().duration(400).attr('stroke-dashoffset',function(){return this.getTotalLength()});

		d3.selectAll('.g-circles circle')
			.filter(function(){
				return this.style.opacity !== '0';
			})
			.transition()
			.duration(300)
			.attr('r', function(d){
				return d.originalRadius;
			})
			.style('opacity', 0.7);
	}


	function getCentroids(g){
		var centroids = {};
		g.selectAll('path')
			.each(function(d){
				centroids[d.properties.districts] = geoGenerator.centroid(d);
			});

		return centroids;
	}

	function forceSim(a,scale,sInd){
		var simulation = d3.forceSimulation(a)
		  //.force('charge', d3.forceManyBody().strength(s))
		  .force('x', d3.forceX(function(d){
			return d.centroid[0]}))
			.force('y', d3.forceY(function(d){
			return d.centroid[1]}))
		  .force('collision', d3.forceCollide().radius(function(d) {
		    return scale(d[sInd]);
		  }))
		  .stop();

		  for (var i = 0, n = Math.ceil(Math.log(simulation.alphaMin()) / Math.log(1 - simulation.alphaDecay())); i < n; ++i) {
		    	simulation.tick();
		  }
	}

	function createTooltip(d, event){
		window.ev = event;
		var tooltipElement = document.getElementById('circles-tooltip' + d.id);
		if(!tooltipElement){

			var tooltip = d3.select('body')
				.append('div')
					.attr('id', 'circles-tooltip' + d.id)
					.classed('c-tooltip', true)
					.style('opacity', 0);

			tooltip.append('div')
					.classed('c-tooltip-header', true)
					.html(`<h1 style="margin-bottom: 5px; margin-top: 5px;">District : ${d.District}</h1>`);

			tooltip.append('div')
					.classed('c-tooltip-body', true)
					.html(`<div style="font-weight: 600">${currentIdicators.rIndicator}: ${d[currentIdicators.rIndicator]}</div>`);

			var finalPos = getTooltipPosition(event, tooltip.node());

			tooltip.style('left', finalPos[0] + 'px')
					.style('top', finalPos[1] + 'px');

			tooltip.transition()
					.duration(300)
					.style('opacity', 1);
		}else{
			var finalPos = getTooltipPosition(event, tooltipElement);

			tooltipElement.style.left = finalPos[0] + 'px';
			tooltipElement.style.top = finalPos[1] + 'px';
		}
	}

	function getTooltipPosition(event,tooltip){

		if((tooltip.offsetWidth * 2) > window.innerWidth){
			return getMobileTooltipPosition(event, tooltip);
		}else{
			return getLargeTooltipPosition(event, tooltip);
		}
	}

	function getLargeTooltipPosition(event, tooltip){

		var x = event.clientX,
			y = event.clientY,
			windowWidth = window.innerWidth,
			windowHeight = window.innerHeight,
			elemWidth = tooltip.offsetWidth,
			elemHeight = tooltip.offsetHeight,
			offset = 20;

		if(!elemHeight || !elemWidth){
			var style = window.getComputedStyle(tooltip);
			elemWidth = style.width;
			elemHeight = style.height;
			console.log(elemWidth, elemWidth);
			console.log('Not defined');
		}

		var finalX, finalY;

		if(x + elemWidth  + offset < windowWidth){
			finalX = x + offset;
		}else{
			finalX = x - elemWidth - offset;
		}

		if(y + elemHeight  + offset < windowHeight){
			finalY = y + offset;
		}else{
			finalY = y - elemHeight - offset;
		}

		return [finalX, finalY];
	}

	function getMobileTooltipPosition(event, tooltip){

		var x = event.clientX,
			y = event.clientY,
			windowWidth = window.innerWidth,
			windowHeight = window.innerHeight,
			elemWidth = tooltip.offsetWidth,
			elemHeight = tooltip.offsetHeight,
			offset = 20;

			var finalX, finalY;

			finalX = (windowWidth - elemWidth)/2;

			if(y + elemHeight  + offset < windowHeight){
				finalY = y + offset;
			}else{
				finalY = y - elemHeight - offset;
			}

			return [finalX, finalY];
	}

	function removeTooltip(d){
		var tooltip = document.getElementById('circles-tooltip' + d.id);

		if(tooltip){
			d3.select(tooltip)
				.transition()
				.duration(100)
				.style('opacity', 0)
				.remove();
		}
	}

	function createConcentricCircleLegend(selector, intervalArr, valArr){
		var legendSVG = d3.select(selector)
			.append('svg')
			.attr('viewBox', '-25 -42 110 70')
			.attr("preserveAspectRatio", "xMinYMid meet")
			.style('fill', '#fff');

		var rScale = d3.scaleSqrt().domain([0,100]).range([0,22]);
		legendSVG.selectAll('circle')
			.data(intervalArr)
			.enter()
			.append('circle')
			.attr('cx', 0)
			.attr('cy', (d)=>rScale(100) - rScale(d))
			.attr('r', (d)=>rScale(d))
			.attr('fill', 'none')
			.attr('stroke', '#fff')
			.attr('stroke-width', '2');

		legendSVG.selectAll('text')
			.data(valArr)
			.enter()
			.append('text')
			.text((d)=>d)
			.attr('x', 34)
			.attr('y', (d, i)=>rScale(100) - rScale(intervalArr[i]))
			.attr('dy', (d,i)=>getCircleLegendDY(i, intervalArr.length));

		return legendSVG;
	}

	function getCircleLegendDY(i,num){
		if(i < Math.floor(num/2)){
			return 10;
		}else{
			return -10;
		}
	}

	function createColorLegend(selector, intervalArr, valArr){
		var legendSVG = d3.select(selector)
			.append('svg')
			.attr('viewBox', '0 0 100 100')
			.style('fill', '#fff');

		gradient = legendSVG.append('defs')
			.append('linearGradient')
			.attr('id', 'legendGrad')
			.attr('x1', '0%')
			.attr('x2', '0%')
			.attr('y1', '0%')
			.attr('y2', '100%');

		gradient.selectAll('stop')
			.data(intervalArr)
			.enter()
			.append('stop')
			.attr('offset', (d,i)=>Math.floor(i/(intervalArr.length - 1) * 100) + '%')
			.style('stop-color', (d)=>d)
			.style('stop-opacity', 1);

		legendSVG.append('rect')
			.attr('width',30)
			.attr('height',100)
			.attr('fill', 'url(#legendGrad)');

		legendSVG.selectAll('text')
			.data(valArr)
			.enter()
			.append('text')
			.attr('x',40)
			.attr('y', (d,i)=>Math.floor(i/(valArr.length - 1) * 100))
			.attr('dy', (d,i)=>getColorLegendDY(i, valArr.length))
			.style('dominant-baseline', 'middle')
			.text((d)=>d);

		return legendSVG;
	}

	function getColorLegendDY(i, num){
		if(i === num - 1){
			return '-1em';
		}else if(i === 0){
			return '1em';
		}else{
			return 0;
		}
	}

	function updateLegendText(legendSVG, valArr){
		legendSVG
			.selectAll('text')
			.data(valArr)
			.text((d)=>d);
	}

	function getMinIndVal(ind){
		return parseFloat(d3.min(csvData,(d)=>parseFloat(d[ind])));
	}

	function getMaxIndVal(ind){
		return parseFloat(d3.max(csvData,(d)=>parseFloat(d[ind])));
	}

	return {
		createCircle : createCircle,
		createMap : createMap,
		createConcentricCircleLegend : createConcentricCircleLegend,
		createColorLegend : createColorLegend,
		executeFilter : executeFilter,
		removeFilter : removeFilter,
		addNumericFilter : addNumericFilter,
		removeAllFilters : removeAllFilters,
		getMinIndVal :getMinIndVal,
		getMaxIndVal : getMaxIndVal
	};
}

function FilterModule(){
	class Filter {
		constructor(fn, name){
			this._fn = fn;
			this.name = name;
		}

		apply(selection){
			return selection.filter(this._fn);
		}
	}

	class FilterSequence{
		constructor(){
			this.filters = [];
		}

		add(filter){
			var index = this.filters.findIndex((d)=>d.name === filter.name);

			if(index > -1){
				this.filters[index] = filter;
			}else{
				this.filters.push(filter);
			}
		}

		remove(name){
			var index = this.filters.findIndex((d)=>d.name === name);
			this.filters.splice(index,1);
		}

		execute(selection){
			return this.filters.reduce(function(acc,d){
				return d.apply(acc);
			}, selection);
		}

		removeAll(){
			this.filters = [];
		}
	}

	return {
		Filter : Filter,
		FilterSequence : FilterSequence
	};
}
