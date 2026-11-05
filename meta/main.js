import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm";

// async function loadData() {
//     const data = await d3.csv('loc.csv');
//     console.log(data);
//     return data;
//   }

// let data = await loadData();

// Step 1.1: Reading the CSV file in D3
async function loadData() {
  const data = await d3.csv("loc.csv", (row) => ({
    // row conversion func
    ...row,
    line: Number(row.line), // or just +row.line
    depth: Number(row.depth),
    length: Number(row.length),
    date: new Date(row.date + "T00:00" + row.timezone),
    datetime: new Date(row.datetime),
  }));

  return data;
}

// Step 1.2: Computing commit data
// let commits = d3.groups(data, (d) => d.commit);
// array of arrays where [0] is the commit hash and
// [1] is the array of objects for modified lines\
// console.log(commits);

function processCommits(data) {
  return d3
    .groups(data, (d) => d.commit)
    .map(([commit, lines]) => {
      let first = lines[0]; // first line has all the data we need
      let { author, date, time, timezone, datetime } = first;
      let ret = {
        id: commit,
        url: "https://github.com/stvngo/portfolio/commit/" + commit,
        author,
        date,
        time,
        timezone,
        datetime,
        // hour fraction for time analysis
        hourFrac: datetime.getHours() + datetime.getMinutes() / 60,
        totalLines: lines.length,
      };

      Object.defineProperty(ret, "lines", {
        // nest lines under ret to avoid clutter
        value: lines,
        configurable: true, // can be deleted or changed
        writable: true, // changable under assignment
        enumerable: true, // enumerable in loops or extracts
      });

      return ret;
    });
}

let data = await loadData();
let commits = processCommits(data);
// console.log(data);
// console.log(commits);

// Step 1.3: Displaying the stats

const fileLengths = d3.rollups(
  data,
  (v) => d3.max(v, (v) => v.line),
  (d) => d.file,
);

const averageFileLength = d3.format(".0f")(d3.mean(fileLengths, (d) => d[1]));

const workByPeriod = d3.rollups(
  data,
  (v) => v.length,
  (d) => new Date(d.datetime).toLocaleString("en", { dayPeriod: "short" }),
);

// use greatest to get the entire element, access with [0]
const maxPeriod = d3.greatest(workByPeriod, (d) => d[1])?.[0];

function renderCommitInfo(data, commits) {
  // Create the dl element
  const dl = d3.select("#stats").append("dl").attr("class", "stats");

  // Add total LOC
  dl.append("dt").html('Total <abbr title="Lines of code">LOC</abbr>');
  dl.append("dd").text(data.length);

  // Add total commits
  dl.append("dt").text("Commits");
  dl.append("dd").text(commits.length);

  // Add total files
  dl.append("dt").text("Files");
  dl.append("dd").text(d3.groups(data, (d) => d.file).length); // group by distinct files and get length

  // Add max depth
  dl.append("dt").text("Max depth");
  dl.append("dd").text(d3.max(data, (d) => d.depth));

  // Add average file length
  dl.append("dt").html('<abbr title="Average">AVG</abbr> file len');
  dl.append("dd").text(averageFileLength);

  // Add Greatest period of work
  dl.append("dt").text("Most active");
  dl.append("dd").text(maxPeriod);
}

renderCommitInfo(data, commits);

// Step 3: Adding a tooltip

function renderTooltipContent(commit) {
  const link = document.getElementById("commit-link");
  const date = document.getElementById("commit-date");

  if (Object.keys(commit).length === 0) return;

  link.href = commit.url;
  link.textContent = commit.id;
  date.textContent = commit.datetime?.toLocaleString("en", {
    dateStyle: "full",
  });
}

// Step 3.3: Only appear when hovering dot
function updateTooltipVisibility(isVisible) {
  const tooltip = document.getElementById("commit-tooltip");
  tooltip.hidden = !isVisible; // control visibility
}

// Step 3.4: Position tooltip near mouse cursor
function updateTooltipPosition(event) {
  const tooltip = document.getElementById("commit-tooltip");
  tooltip.style.left = `${event.clientX}px`;
  tooltip.style.top = `${event.clientY}px`;
}

// Step 4: Communicating lines edited via dot size

// Step 4.1: Creating a radius scale
const [minLines, maxLines] = d3.extent(commits, (d) => d.totalLines);

const rScale = d3
  .scaleSqrt() // area grows with square of radius, use sqrt for proportionality
  .domain([minLines, maxLines])
  .range([2, 30]); // adjust these values based on experimentation


// Step 2: Visualizing time and day of commits in a scatter plot

// Step 2.1: Drawing the dots
function renderScatterPlot(data, commits) {
    // Define dimensions
    const width = 1000;
    const height = 600;

    // sort commits by total lines in descending order
    const sortedCommits = d3.sort(commits, (d) => -d.totalLines);
  
    const svg = d3
      .select("#scatter-plot")
      .append("svg")
      .attr("viewBox", `0 0 ${width} ${height}`)
      .style("overflow", "visible");
  
    // create scales
    const xScale = d3
      .scaleTime() // handles dates and times
      .domain(d3.extent(commits, (d) => d.datetime)) // find min/max datetimes
      .range([0, width]) // width of svg
      .nice(); // extend domain to nice values
  
    const yScale = d3.scaleLinear().domain([0, 24]).range([height, 0]);
    // linear hour of day (0-24), using whole height of svg
  
    const dots = svg.append("g").attr("class", "dots");
  
    dots
      .selectAll("circle")
      .data(sortedCommits) // smaller dots on top of larger dots if overlapping
      .join("circle")
      .attr("cx", (d) => xScale(d.datetime))
      .attr("cy", (d) => yScale(d.hourFrac))
      // .attr("r", 5)
      .attr("fill", "steelblue")
      .attr("r", (d) => rScale(d.totalLines))
      .style("fill-opacity", 0.7) // Add transparency for overlapping dots
      .on("mouseenter", (event, commit) => {
        d3.select(event.currentTarget).style("fill-opacity", 1);
        renderTooltipContent(commit);
        updateTooltipVisibility(true);
        updateTooltipPosition(event);
      })
      .on("mouseleave", (event) => {
        d3.select(event.currentTarget).style("fill-opacity", 0.7);
        updateTooltipVisibility(false);
      });
  
    // Step 2.2: Drawing the axes
    const margin = { top: 10, right: 10, bottom: 30, left: 20 };
    const usableArea = {
      top: margin.top,
      right: width - margin.right,
      bottom: height - margin.bottom,
      left: margin.left,
      width: width - margin.left - margin.right,
      height: height - margin.top - margin.bottom,
    };
  
    // Update scales with new ranges
    xScale.range([usableArea.left, usableArea.right]); // x-axis is left to right
    yScale.range([usableArea.bottom, usableArea.top]);
  
    // Create the axes
    const xAxis = d3.axisBottom(xScale);
    const yAxis = d3
      .axisLeft(yScale)
      .tickFormat((d) => String(d % 24).padStart(2, "0") + ":00");
    // d%24 to get 0 for midnight
    // string.padStart() as two digit number to format as HH:MM
  
    // Add gridlines BEFORE the axes
    const gridlines = svg
      .append("g")
      .attr("class", "gridlines")
      .attr("transform", `translate(${usableArea.left}, 0)`);
  
    // Step 2.3: Drawing the gridlines
    // Create gridlines as an axis with no labels and full-width ticks
    gridlines.call(
      d3.axisLeft(yScale).tickFormat("").tickSize(-usableArea.width),
    );
  
    // Add X axis
    svg
      .append("g")
      .attr("transform", `translate(0, ${usableArea.bottom})`)
      .call(xAxis);
  
    // Add Y axis
    svg
      .append("g")
      .attr("transform", `translate(${usableArea.left}, 0)`)
      .call(yAxis);
  }
  
  renderScatterPlot(data, commits);