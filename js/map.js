function createMap(width, height) {
  d3.select("#map")
      .attr("width", width)
      .attr("height", height)
    .append("text")
      .attr("x", width / 2)
      .attr("y", "1em")
      .attr("font-size", "1.5em")
      .style("text-anchor", "middle")
      .classed("map-title", true);
}

function drawMap(geoData, data, year, dataType, IsSector) {

// fetch data
if (IsSector === "All") { 
    // Aggregate data by Country, year
    var climateData = [];
    data.reduce(function(res, value) {
      if (!res[value.group]) {
        res[value.group] = { group: value.group, country: value.country, countryCode: value.countryCode, year: value.year, emissions: 0, emissionsPerCapita: 0 };
        climateData.push(res[value.group]);
      }
      res[value.group].emissions += value.emissions;
      res[value.group].emissionsPerCapita += value.emissionsPerCapita;    
      return res;
    }, {});  
} else {
    // Aggregate data by Country, year and Sector Level 1
    var climateData_L1 = [];
    data.reduce(function(res, value) {
      if (!res[value.group_L1]) {
        res[value.group_L1] = { group_L1: value.group_L1, country: value.country, countryCode: value.countryCode, year: value.year, Mapping_L1: value.Mapping_L1, emissions: 0, emissionsPerCapita: 0};
        climateData_L1.push(res[value.group_L1]);
        //result.push(res[value.ISO3])
      }
      res[value.group_L1].emissions += value.emissions;
      res[value.group_L1].emissionsPerCapita += value.emissionsPerCapita;    
      return res;
    }, {});    
    var climateData = climateData_L1.filter(row => row.Mapping_L1 === IsSector);
};
// end fetch data
    
  var map = d3.select("#map");

  var projection = d3.geoMercator()
                     .scale(110)
                     .translate([
                       +map.attr("width") / 2,
                       +map.attr("height") / 1.4
                     ]);

  var path = d3.geoPath()
               .projection(projection);

  d3.select("#year-val").text(year);

  geoData.forEach(d => {
    var countries = climateData.filter(row => row.countryCode === d.id);
    var name = '';
    if (countries.length > 0) name = countries[0].country;
    d.properties = countries.find(c => c.year === year) || { country: name };
  });

  var colors = ["#f1c40f", "#e67e22", "#e74c3c", "#c0392b"];

  var domains = {
    emissions: [0, 2.5e5, 1e6, 5e6],
    emissionsPerCapita: [0, 0.5, 2, 10]
  };

  var mapColorScale = d3.scaleLinear()
                        .domain(domains[dataType])
                        .range(colors);

  var update = map.selectAll(".country")
                  .data(geoData);

  update
    .enter()
    .append("path")
      .classed("country", true)
      .attr("d", path)
      .on("click", function() {
        var currentDataType = d3.select("input:checked")
                                .property("value");

//                                .property("value");
        var country = d3.select(this);
        var isActive = country.classed("active");
        var countryName = isActive ? "" : country.data()[0].properties.country;
        drawBar(data, currentDataType, countryName);
        highlightBars(+d3.select("#year").property("value"));
        d3.selectAll(".country").classed("active", false);
        country.classed("active", !isActive);
      })
    .merge(update)
      .transition()
      .duration(750)
      .attr("fill", d => {
        var val = d.properties[dataType];
        return val ? mapColorScale(val) : "#ccc";
      });

  d3.select(".map-title")
      .text("Carbon dioxide " + graphTitle(dataType) + ", " + year);
}

function graphTitle(str) {
  return str.replace(/[A-Z]/g, c => " " + c.toLowerCase());
}
