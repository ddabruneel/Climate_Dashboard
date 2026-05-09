function createBar(width, height) {
  const bar = d3.select("#bar")
    .attr("width", width)
    .attr("height", height);

  bar.append("g").classed("x-axis", true);
  bar.append("g").classed("y-axis", true);

  bar.append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -height / 2)
    .attr("dy", "1em")
    .style("text-anchor", "middle")
    .style("font-size", "1em")
    .classed("y-axis-label", true);

  bar.append("text")
    .attr("x", width / 2)
    .attr("y", "1em")
    .attr("font-size", "1.5em")
    .style("text-anchor", "middle")
    .classed("bar-title", true);
}

function highlightBars(year) {
  d3.select("#bar")
    .selectAll("rect")
    .attr("fill", d => d.year === year ? "#16a085" : "#1abc9c");
}

function drawBar(data, dataType, country) {
  const bar = d3.select("#bar");
  const padding = { top: 30, right: 30, bottom: 30, left: 110 };
  const barPadding = 1;
  const width = +bar.attr("width");
  const height = +bar.attr("height");
  const countryData = data.filter(d => d.country === country)
    .sort((a, b) => a.year - b.year);

  const xScale = d3.scaleLinear()
    .domain(d3.extent(data, d => d.year))
    .range([padding.left, width - padding.right]);

  const yScale = d3.scaleLinear()
    .domain([0, d3.max(countryData, d => d[dataType])])
    .range([height - padding.bottom, padding.top]);

  const barWidth = xScale(xScale.domain()[0] + 1) - xScale.range()[0];

  const xAxis = d3.axisBottom(xScale).tickFormat(d3.format(".0f"));

  d3.select(".x-axis")
    .attr("transform", "translate(0, " + (height - padding.bottom) + ")")
    .call(xAxis);

  d3.select(".y-axis")
    .attr("transform", "translate(" + (padding.left - barWidth / 2) + ",0)")
    .transition()
    .duration(1000)
    .call(d3.axisLeft(yScale));

  const axisLabel = dataType === "emissions"
    ? "GhG emissions, thousand metric tons"
    : "GhG emissions, metric tons per capita";

  const barTitle = country
    ? "GhG Emissions, " + country
    : "Click on a country to see annual trends.";

  d3.select(".y-axis-label").text(axisLabel);
  d3.select(".bar-title").text(barTitle);

  const t = d3.transition().duration(1000).ease(d3.easeBounceOut);

  const update = bar.selectAll(".bar").data(countryData);

  update
    .exit()
    .transition(t)
    .delay((d, i, nodes) => (nodes.length - i - 1) * 100)
    .attr("y", height - padding.bottom)
    .attr("height", 0)
    .remove();

  update
    .enter()
    .append("rect")
    .classed("bar", true)
    .attr("y", height - padding.bottom)
    .attr("height", 0)
    .merge(update)
    .attr("x", d => (xScale(d.year) + xScale(d.year - 1)) / 2)
    .attr("width", barWidth - barPadding)
    .transition(t)
    .delay((d, i) => i * 100)
    .attr("y", d => yScale(d[dataType]))
    .attr("height", d => height - padding.bottom - yScale(d[dataType]));
}
