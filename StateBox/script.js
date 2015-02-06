/*
 * Alexander Karlsson - akl@qlikview.com - Demo & Best Practices
 *
 * QlikTech takes no responsbility for any code.
 * Use at your own risk.
 * Do not submerge in water.
 * Do not taunt Happy Fun Ball.
 */

//Constants
var EXTENSION_NAME = 'StateBox';
var PATH = Qva.Remote + (Qva.Remote.indexOf('?') >= 0 ? '&' : '?') + 'public=only&name=Extensions/' + EXTENSION_NAME + '/';

//Load scripts in the array
var scripts = [PATH + 'd3.min.js'];


function init() {
	Qva.AddExtension(EXTENSION_NAME, function() {
		Qva.LoadCSS(PATH + 'style.css');

		var margin = {
			top: 0,
			right: 40,
			bottom: 0,
			left: 0
		};

		var rect = {
			w: 30,
			h: 40
		}

		var $this = this;
		var $element = this.Element;

		var divName = this.Layout.ObjectId.replace("\\", "_");

		if (this.Element.children.length === 0) {
			var ui = document.createElement("div");
			ui.setAttribute("id", divName);
			this.Element.appendChild(ui);
			$("#" + divName).css("height", $this.GetHeight() + "px").css("width", $this.GetWidth() + "px");
		} else {
			$("#" + divName).css("height", $this.GetHeight() + "px").css("width", $this.GetWidth() + "px");
			$("#" + divName).empty();
		};

		$data = {};

		this.Data.Rows.forEach(function(d) {
			$data[d[0].text] = {
				'expression1': d[1].text,
				'expression2': d[2].text,
				'color1': d[3].text,
				'color2': d[4].text,
				'tile': d[5].text
			}
		})

		var elemWidth = this.GetWidth();
		var elemHeight = this.GetHeight();

		var w = elemWidth - margin.left - margin.right;
		var h = elemHeight - margin.top - margin.bottom;

		var svg = d3.select("#" + divName).append("svg")
			.attr("width", elemWidth)
			.attr("height", elemHeight);

		var group = svg.append('g').attr('width', w);
		var g = group.append('g');

		var projection = d3.geo.albersUsa().scale(1).translate([0, 0]);
		var path = d3.geo.path().projection(projection);

		d3.json(PATH + 'usstates.json', function(error, us) {

			var b = path.bounds(us),
				s = .95 / Math.max((b[1][0] - b[0][0]) / w, (b[1][1] - b[0][1]) / h),
				t = [(w - s * (b[1][0] + b[0][0])) / 2, (h - s * (b[1][1] + b[0][1])) / 2];

			projection.scale(s).translate(t);

			g.attr('id', 'states')
				.selectAll('path')
				.data(us.features)
				.enter()
				.append('path')
				.attr("class", "state")
				.attr('id', function(d) {
					return d.properties.id
				})
				.attr('d', path);

			us.features = us.features.filter(function(d) {
				if( $data[d.properties.id] ) {
					return d;
				}
			})

			svg.selectAll('box')
				.data(us.features)
				.enter()
				.append('g')
				.attr("transform", function(d) {

					var center = path.centroid(d);
					var x = center[0];
					var y = center[1];

					return "translate(" + (x - (rect.h / 2)) + "," + (y - (rect.w / 2)) + ")";

				})
				.attr("class", "place-label");

			var $placelabel = svg.selectAll('.place-label');

			$placelabel
				.append('rect')
				.attr("width", rect.w + "px")
				.attr("height", rect.h + "px")
				.style('fill', function(d) {
					return $data[d.properties.id].tile == '-' ? '#fff' : $data[d.properties.id].tile;
				})
				.on('click', clicked);

			arrangeLabels();

			$placelabel
				.append('svg:text')
				.attr('class', 'text-heading')
				.style("text-anchor", 'middle')
				.attr('x', rect.w / 2)
				.attr('y', rect.h / 4)
				.text(function(d) {
					return d.properties.id;
				});

			$placelabel
				.append('svg:text')
				.style("text-anchor", 'middle')
				.attr('x', rect.w / 2)
				.attr('y', (rect.h / 2) + 2)
				.style('fill', function(d) {
					return $data[d.properties.id].color1 == '-' ? '#000' : $data[d.properties.id].color1;
				})
				.text(function(d) {
					return $data[d.properties.id].expression1 == undefined ? 'N/A' : abbreviateNumber($data[d.properties.id].expression1);
				});

			$placelabel
				.append('svg:text')
				.style("text-anchor", 'middle')
				.attr('x', rect.w / 2)
				.style('fill', function(d) {
					return $data[d.properties.id].color2 == '-' ? '#000' : $data[d.properties.id].color2;
				})
				.attr('y', (rect.h / 2) + (rect.h / 3))
				.text(function(d) {
					return $data[d.properties.id].expression2 == undefined ? 'N/A' : abbreviateNumber($data[d.properties.id].expression2);
				});

		});

		function clicked(d) {
			$this.Data.SelectTextsInColumn(0,true,d.properties.id);
		};

		function arrangeLabels() {
			var $place = svg.selectAll(".place-label");
			var move = 1;
			while (move > 0) {
				move = 0;
				$place.each(function() {
					var that = this,
						a = this.getBoundingClientRect();
					$place.each(function() {
						if (this !== that) {
							var b = this.getBoundingClientRect();
							if ((Math.abs(a.left - b.left) * 2 < (a.width + b.width)) &&
								(Math.abs(a.top - b.top) * 2 < (a.height + b.height))) {

								var $this = d3.select(this);
								var $that = d3.select(that);

								// overlap, move labels
								var dx = (Math.max(0, a.right - b.left) +
										Math.min(0, a.left - b.right)) * 0.01,
									dy = (Math.max(0, a.bottom - b.top) +
										Math.min(0, a.top - b.bottom)) * 0.02,
									tt = d3.transform($this.attr("transform")),
									to = d3.transform($that.attr("transform"));
								move += Math.abs(dx) + Math.abs(dy);

								to.translate = [to.translate[0] + dx, to.translate[1] + dy];
								tt.translate = [tt.translate[0] - dx, tt.translate[1] - dy];
								$this.attr("transform", "translate(" + tt.translate + ")");
								$that.attr("transform", "translate(" + to.translate + ")");
								a = this.getBoundingClientRect();
							}
						}
					});
				});
			}
		};


	});
};


function loadScripts() {
	if (scripts.length != 0) {
		Qv.LoadExtensionScripts(scripts, init);
	} else {
		init()
	};
};
loadScripts();

function abbreviateNumber(value) {
	var newValue = value;
	if (value >= 1000) {
		var suffixes = ["", "k", "m", "b", "t"];
		var suffixNum = Math.floor(("" + value).length / 3);
		var shortValue = '';
		for (var precision = 2; precision >= 1; precision--) {
			shortValue = parseFloat((suffixNum != 0 ? (value / Math.pow(1000, suffixNum)) : value).toPrecision(precision));
			var dotLessShortValue = (shortValue + '').replace(/[^a-zA-Z 0-9]+/g, '');
			if (dotLessShortValue.length <= 2) {
				break;
			}
		}
		if (shortValue % 1 != 0) shortNum = shortValue.toFixed(1);
		newValue = shortValue + suffixes[suffixNum];
	}
	return newValue;
};