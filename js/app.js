
d3.queue()
  .defer(d3.json, "//unpkg.com/world-atlas@1.1.4/world/50m.json")
  .defer(d3.csv, "./data/Country_Annex_One_GHG_Per_Year_And_Capita.csv", function(row) {
    return {
        country: row.Party,
        countryCode: row.ISO_3166,
        emissions: +row.VALUE,
        emissionsPerCapita: +row.VALUE_PER_CAPITA,
        year: +row.YEAR,
        Mapping_L1: row.Mapping_L1,
        Mapping_L2: row.Mapping_L2,
        Category: row.Category,
        group: row.Party + '#' + row.YEAR,
        group_L1: row.Party + '#' + row.YEAR + '#' + row.Mapping_L1.replace( /\s/g, '')
    }
  })
  .await(function(error, mapData, data) {
    if (error) throw error;
    
    var extremeYears = d3.extent(data, d => d.year);

    var distinctSector = [...new Set(data.map(d => d.Mapping_L1))];
    distinctSector.push("All");
    
    var distinctSubSector = [...new Set(data.map(d => d.Mapping_L2))];

    var distinctCategory = [...new Set(data.map(d => d.Category))];

    var currentYear = extremeYears[0];
    var currentDataType = d3.select('input[name="data-type"]:checked')
                            .attr("value");
    var geoData = topojson.feature(mapData, mapData.objects.countries).features;

    var width = +d3.select(".chart-container")
                   .node().offsetWidth;
    var height = 300;
    
    var currentSector = "All";

    createMap(width, width * 4 / 5);
    createBar(width, height);
    drawMap(geoData, data, currentYear, currentDataType, currentSector);

    d3.select("#year")
        .property("min", currentYear)
        .property("max", extremeYears[1])
        .property("value", currentYear)
        .on("input", () => {
          currentYear = +d3.event.target.value;
          drawMap(geoData, data, currentYear, currentDataType, currentSector);
          highlightBars(currentYear);
        });

    d3.selectAll('input[name="data-type"]')
        .on("change", () => {
          var active = d3.select(".active").data()[0];
          var country = active ? active.properties.country : "";
          currentDataType = d3.event.target.value;
          drawMap(geoData, data, currentYear, currentDataType, currentSector);

        });

// Sector Selection    
var selectSector = d3.select("#selectSector")

var selectOptions = selectSector
  .selectAll('option')
	.data(distinctSector).enter()
	.append('option')
        .property("value", function (d) { return d; })
		.text(function (d) { return d; });
    
    selectSector
            .property("selected", "All")
            .on("input", () => {
                currentSector = d3.event.target.value;
                drawMap(geoData, data, currentYear, currentDataType, currentSector);
                });   
    
var selectSubSector = d3.select("#selectSubSector")

var selectSubOptions = selectSubSector
  .selectAll('option')
	.data(distinctSubSector).enter()
	.append('option')
		.text(function (d) { return d; });

var selectCatSector = d3.select("#selectCategory")

var selectCatOptions = selectCatSector
  .selectAll('option')
	.data(distinctCategory).enter()
	.append('option')
		.text(function (d) { return d; });
    
    d3.selectAll("svg")
        .on("mousemove touchmove", updateTooltip);

    function updateTooltip() {
      var tooltip = d3.select(".tooltip");
      var tgt = d3.select(d3.event.target);
      var isCountry = tgt.classed("country");
      var isBar = tgt.classed("bar");
      var isArc = tgt.classed("arc");
      var dataType = d3.select("input:checked")
                       .property("value");
      var units = dataType === "emissions" ? "thousand metric tons" : "metric tons per capita";
      var data;
      var percentage = "";
      if (isCountry) data = tgt.data()[0].properties;
      if (isArc) {
        data = tgt.data()[0].data;
        percentage = `<p>Percentage of total: ${getPercentage(tgt.data()[0])}</p>`;
      }
      if (isBar) data = tgt.data()[0];
      tooltip
          .style("opacity", +(isCountry || isArc || isBar))
          .style("left", (d3.event.pageX - tooltip.node().offsetWidth / 2) + "px")
          .style("top", (d3.event.pageY - tooltip.node().offsetHeight - 10) + "px");
      if (data) {
        var dataValue = data[dataType] ?
          data[dataType].toLocaleString() + " " + units :
          "Data Not Available";
        tooltip 
            .html(`
              <p>Country: ${data.country}</p>
              <p>${formatDataType(dataType)}: ${dataValue}</p>
              <p>Year: ${data.year || d3.select("#year").property("value")}</p>
              ${percentage}
            `)
      }
    }
  });

function formatDataType(key) {
  return key[0].toUpperCase() + key.slice(1).replace(/[A-Z]/g, c => " " + c);
}

function getPercentage(d) {
  var angle = d.endAngle - d.startAngle;
  var fraction = 100 * angle / (Math.PI * 2);
  return fraction.toFixed(2) + "%";
}