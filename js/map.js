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

function drawMap(geoData, fulldata, data, currentYear, currentDataType, currentSector, currentSubSector, currentCategory) {
  const climateData = data;
  const year = currentYear;
  const dataType = currentDataType;

  const map = d3.select("#map");

  const projection = d3.geoMercator()
    .scale(110)
    .translate([
      +map.attr("width") / 2,
      +map.attr("height") / 1.4
    ]);

  const path = d3.geoPath().projection(projection);

  d3.select("#year-val").text(year);

  geoData.forEach(d => {
    const countries = climateData.filter(row => row.countryCode === d.id);
    let name = "";
    if (countries.length > 0) name = countries[0].country;
    d.properties = countries.find(c => c.year === year) || { country: name };
  });

  const colors = ["#f1c40f", "#e67e22", "#e74c3c", "#c0392b"];

  const domains = {
    emissions: [0, 2.5e5, 1e6, 5e6],
    emissionsPerCapita: [0, 0.5, 2, 10]
  };

  const mapColorScale = d3.scaleLinear()
    .domain(domains[dataType])
    .range(colors);

  const update = map.selectAll(".country").data(geoData);

  update
    .enter()
    .append("path")
    .classed("country", true)
    .attr("d", path)
    .on("click", function(event, d) {
      const clickedDataType = d3.select("input:checked").property("value");
      const clickedYear = +d3.select("#year").property("value");
      const mapSector = d3.select("#selectSector").property("value");
      const mapSubSector = d3.select("#selectSubSector").property("value");
      const mapCategory = d3.select("#selectCategory").property("value");
      const country = d3.select(this);
      const isActive = country.classed("active");
      const countryName = isActive ? "" : country.data()[0].properties.country;
      const myData = dataPrep(fulldata, clickedYear, mapSector, mapSubSector, mapCategory, clickedDataType);
      drawBar(myData, clickedDataType, countryName);
      highlightBars(clickedYear);
      d3.selectAll(".country").classed("active", false);
      country.classed("active", !isActive);
    })
    .merge(update)
    .transition()
    .duration(750)
    .attr("fill", d => {
      const val = d.properties[dataType];
      return val ? mapColorScale(val) : "#ccc";
    });

  d3.select(".map-title")
    .text("Carbon dioxide " + graphTitle(dataType) + ", " + year);
}

function graphTitle(str) {
  return str.replace(/[A-Z]/g, c => " " + c.toLowerCase());
}
