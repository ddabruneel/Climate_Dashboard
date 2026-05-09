document.getElementById("open-nav").addEventListener("click", () => {
  document.getElementById("mySidenav").style.width = "450px";
});

document.getElementById("close-nav").addEventListener("click", (e) => {
  e.preventDefault();
  document.getElementById("mySidenav").style.width = "0";
});

Promise.all([
  d3.json("https://unpkg.com/world-atlas@2/countries-50m.json"),
  d3.csv("./data/Country_Annex_One_GHG_Per_Year_And_Capita.csv", row => ({
    country: row.Party,
    countryCode: row.ISO_3166,
    emissions: +row.VALUE,
    emissionsPerCapita: +row.VALUE_PER_CAPITA,
    year: +row.YEAR,
    Mapping_L1: row.Mapping_L1,
    Mapping_L2: row.Mapping_L2,
    Category: row.Category,
    group: `${row.Party}#${row.YEAR}`,
    group_L1: `${row.Party}#${row.YEAR}#${row.Mapping_L1.replace(/\s/g, "")}`,
    group_L2: `${row.Party}#${row.YEAR}#${row.Mapping_L2.replace(/\s/g, "")}`,
    group_Cat: `${row.Party}#${row.YEAR}#${row.Category.replace(/\s/g, "")}`
  }))
]).then(([mapData, data]) => {
  const extremeYears = d3.extent(data, d => d.year);

  const distinctSector = [...new Set(data.map(d => d.Mapping_L1))].sort();
  distinctSector.unshift("All");

  const distinctSubSector = [...new Set(data.map(d => d.Mapping_L2))].sort();
  distinctSubSector.unshift("All");

  const distinctCategory = [...new Set(data.map(d => d.Category))].sort();
  distinctCategory.unshift("All");

  let currentYear = extremeYears[0];
  let currentDataType = d3.select('input[name="data-type"]:checked').attr("value");
  const geoData = topojson.feature(mapData, mapData.objects.countries).features;

  const width = +d3.select(".chart-container").node().offsetWidth;
  const height = 300;

  let currentSector = "All";
  let currentSubSector = "All";
  let currentCategory = "All";

  createMap(width, width * 4 / 5);
  createBar(width, height);

  let myData = dataPrep(data, currentYear, currentSector, currentSubSector, currentCategory, currentDataType);
  drawMap(geoData, data, myData, currentYear, currentDataType, currentSector, currentSubSector, currentCategory);

  d3.select("#year")
    .property("min", currentYear)
    .property("max", extremeYears[1])
    .property("value", currentYear)
    .on("input", (event) => {
      currentYear = +event.target.value;
      myData = dataPrep(data, currentYear, currentSector, currentSubSector, currentCategory, currentDataType);
      drawMap(geoData, data, myData, currentYear, currentDataType, currentSector, currentSubSector, currentCategory);
      highlightBars(currentYear);
    });

  d3.selectAll('input[name="data-type"]')
    .on("change", (event) => {
      currentDataType = event.target.value;
      myData = dataPrep(data, currentYear, currentSector, currentSubSector, currentCategory, currentDataType);
      drawMap(geoData, data, myData, currentYear, currentDataType, currentSector, currentSubSector, currentCategory);
    });

  const selectSector = d3.select("#selectSector");
  selectSector
    .selectAll("option")
    .data(distinctSector)
    .enter()
    .append("option")
    .property("value", d => d)
    .text(d => d);

  selectSector
    .property("selected", "All")
    .on("input", (event) => {
      currentSector = event.target.value;
      myData = dataPrep(data, currentYear, currentSector, currentSubSector, currentCategory, currentDataType);
      drawMap(geoData, data, myData, currentYear, currentDataType, currentSector, currentSubSector, currentCategory);
    });

  const selectSubSector = d3.select("#selectSubSector");
  selectSubSector
    .selectAll("option")
    .data(distinctSubSector)
    .enter()
    .append("option")
    .text(d => d);

  selectSubSector.on("input", (event) => {
    currentSubSector = event.target.value;
    myData = dataPrep(data, currentYear, currentSector, currentSubSector, currentCategory, currentDataType);
    drawMap(geoData, data, myData, currentYear, currentDataType, currentSector, currentSubSector, currentCategory);
  });

  const selectCatSector = d3.select("#selectCategory");
  selectCatSector
    .selectAll("option")
    .data(distinctCategory)
    .enter()
    .append("option")
    .text(d => d);

  selectCatSector.on("input", (event) => {
    currentCategory = event.target.value;
    myData = dataPrep(data, currentYear, currentSector, currentSubSector, currentCategory, currentDataType);
    drawMap(geoData, data, myData, currentYear, currentDataType, currentSector, currentSubSector, currentCategory);
  });

  d3.selectAll("svg")
    .on("mousemove touchmove", (event) => updateTooltip(event));

  function updateTooltip(event) {
    const tooltip = d3.select(".tooltip");
    const tgt = d3.select(event.target);
    const isCountry = tgt.classed("country");
    const isBar = tgt.classed("bar");
    const isArc = tgt.classed("arc");
    const dataType = d3.select("input:checked").property("value");
    const units = dataType === "emissions" ? "thousand metric tons" : "metric tons per capita";
    let tooltipData;
    let percentage = "";
    if (isCountry) tooltipData = tgt.data()[0].properties;
    if (isArc) {
      tooltipData = tgt.data()[0].data;
      percentage = `<p>Percentage of total: ${getPercentage(tgt.data()[0])}</p>`;
    }
    if (isBar) tooltipData = tgt.data()[0];
    tooltip
      .style("opacity", +(isCountry || isArc || isBar))
      .style("left", (event.pageX - tooltip.node().offsetWidth / 2) + "px")
      .style("top", (event.pageY - tooltip.node().offsetHeight - 10) + "px");
    if (tooltipData) {
      const dataValue = tooltipData[dataType]
        ? tooltipData[dataType].toLocaleString() + " " + units
        : "Data Not Available";
      tooltip.html(`
        <p>Country: ${tooltipData.country}</p>
        <p>${formatDataType(dataType)}: ${dataValue}</p>
        <p>Year: ${tooltipData.year || d3.select("#year").property("value")}</p>
        ${percentage}
      `);
    }
  }
}).catch(error => {
  console.error("Error loading data:", error);
});

function formatDataType(key) {
  return key[0].toUpperCase() + key.slice(1).replace(/[A-Z]/g, c => " " + c);
}

function getPercentage(d) {
  const angle = d.endAngle - d.startAngle;
  const fraction = 100 * angle / (Math.PI * 2);
  return fraction.toFixed(2) + "%";
}

function dataPrep(data, year, sector, subsector, category, globalOrPerCapita) {
  if (category !== "All") {
    const aggr_data = [];
    data.reduce((res, value) => {
      if (!res[value.group_Cat]) {
        res[value.group_Cat] = { group_Cat: value.group_Cat, country: value.country, countryCode: value.countryCode, year: value.year, Mapping_L1: value.Mapping_L1, Mapping_L2: value.Mapping_L2, Category: value.Category, emissions: 0, emissionsPerCapita: 0 };
        aggr_data.push(res[value.group_Cat]);
      }
      res[value.group_Cat].emissions += value.emissions;
      res[value.group_Cat].emissionsPerCapita += value.emissionsPerCapita;
      return res;
    }, {});
    return aggr_data.filter(row => row.Category === category);
  } else if (subsector !== "All") {
    const aggr_data = [];
    data.reduce((res, value) => {
      if (!res[value.group_L2]) {
        res[value.group_L2] = { group_L2: value.group_L2, country: value.country, countryCode: value.countryCode, year: value.year, Mapping_L1: value.Mapping_L1, Mapping_L2: value.Mapping_L2, emissions: 0, emissionsPerCapita: 0 };
        aggr_data.push(res[value.group_L2]);
      }
      res[value.group_L2].emissions += value.emissions;
      res[value.group_L2].emissionsPerCapita += value.emissionsPerCapita;
      return res;
    }, {});
    return aggr_data.filter(row => row.Mapping_L2 === subsector);
  } else if (sector !== "All") {
    const aggr_data = [];
    data.reduce((res, value) => {
      if (!res[value.group_L1]) {
        res[value.group_L1] = { group_L1: value.group_L1, country: value.country, countryCode: value.countryCode, year: value.year, Mapping_L1: value.Mapping_L1, emissions: 0, emissionsPerCapita: 0 };
        aggr_data.push(res[value.group_L1]);
      }
      res[value.group_L1].emissions += value.emissions;
      res[value.group_L1].emissionsPerCapita += value.emissionsPerCapita;
      return res;
    }, {});
    return aggr_data.filter(row => row.Mapping_L1 === sector);
  } else {
    const aggr_data = [];
    data.reduce((res, value) => {
      if (!res[value.group]) {
        res[value.group] = { group: value.group, country: value.country, countryCode: value.countryCode, year: value.year, emissions: 0, emissionsPerCapita: 0 };
        aggr_data.push(res[value.group]);
      }
      res[value.group].emissions += value.emissions;
      res[value.group].emissionsPerCapita += value.emissionsPerCapita;
      return res;
    }, {});
    return aggr_data;
  }
}
