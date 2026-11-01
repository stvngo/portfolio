import { fetchJSON, renderProjects } from '../global.js';
import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

const projects = await fetchJSON('../lib/projects.json');

const projectsContainer = document.querySelector('.projects');

renderProjects(projects, projectsContainer, 'h2');

// Step 1.6: count projects
const projectsTitle = document.querySelector('.projects-title');

if (projectsTitle) {
  projectsTitle.textContent = `${projects.length} Projects`;
}

/*
 * Lab 5 Step 5.4: combining the search and pie filters
 *
 * The bug: each filter started over from the full `projects` array, so it
 * threw away whatever the other filter had done.
 *   - The wedge click handler filtered `projects` by year only, so clicking a
 *     wedge after searching ignored the search query.
 *   - setQuery() filtered `projects` by query only, so searching after clicking
 *     a wedge ignored the selected year (and re-rendering the pie dropped the
 *     wedge's highlight while selectedIndex still pointed at the old index,
 *     which may now be a different year).
 *
 * The fix: keep both filters as shared state (`query` and `selectedYear`) and
 * always render the projects through getVisibleProjects(), which applies both.
 * The selection is stored by year label rather than only by index, because a
 * search re-renders the pie and the same index can then mean a different year.
 */
let query = '';
let selectedYear = null;

// Lab 5 Step 5.2: index of the selected wedge (-1 means none)
let selectedIndex = -1;

function matchesQuery(project) {
  let values = Object.values(project).join('\n').toLowerCase();
  return values.includes(query.toLowerCase());
}

function getVisibleProjects() {
  return projects.filter(
    (project) => matchesQuery(project) && (selectedYear === null || project.year === selectedYear),
  );
}

// Lab 5 Step 4.4: plotting refactored into one function
function renderPieChart(projectsGiven) {
  // re-calculate rolled data
  let newRolledData = d3.rollups(
    projectsGiven,
    (v) => v.length,
    (d) => d.year,
  );
  // re-calculate data
  let newData = newRolledData.map(([year, count]) => {
    return { value: count, label: year };
  });
  // re-calculate slice generator, arc data, arc, etc.
  let arcGenerator = d3.arc().innerRadius(0).outerRadius(50);
  let newSliceGenerator = d3.pie().value((d) => d.value);
  let newArcData = newSliceGenerator(newData);
  let newArcs = newArcData.map((d) => arcGenerator(d));
  let colors = d3.scaleOrdinal(d3.schemePaired);

  // keep the selected year highlighted after a re-render; clear it if the
  // search removed that year from the chart
  selectedIndex = newData.findIndex((d) => d.label === selectedYear);
  if (selectedIndex === -1) {
    selectedYear = null;
  }

  // clear up paths and legends
  let svg = d3.select('svg');
  svg.selectAll('path').remove();
  let legend = d3.select('.legend');
  legend.selectAll('li').remove();

  // update paths and legends
  newArcs.forEach((arc, i) => {
    svg
      .append('path')
      .attr('d', arc)
      .attr('fill', colors(i))
      .attr('class', i === selectedIndex ? 'selected' : '')
      .on('click', () => {
        selectedIndex = selectedIndex === i ? -1 : i;
        selectedYear = selectedIndex === -1 ? null : newData[selectedIndex].label;

        svg
          .selectAll('path')
          .attr('class', (_, idx) => (idx === selectedIndex ? 'selected' : ''));

        legend
          .selectAll('li')
          .attr('class', (_, idx) => (idx === selectedIndex ? 'legend-item selected' : 'legend-item'));

        // filter by the selected year AND the current search query
        renderProjects(getVisibleProjects(), projectsContainer, 'h2');
      });
  });

  newData.forEach((d, idx) => {
    legend
      .append('li')
      .attr('style', `--color:${colors(idx)}`)
      .attr('class', idx === selectedIndex ? 'legend-item selected' : 'legend-item')
      .html(`<span class="swatch"></span> ${d.label} <em>(${d.value})</em>`);
  });
}

// Call this function on page load
renderPieChart(projects);

// Lab 5 Step 4: search
function setQuery(newQuery) {
  query = newQuery;
  return projects.filter(matchesQuery);
}

let searchInput = document.querySelector('.searchBar');

searchInput.addEventListener('change', (event) => {
  let filteredProjects = setQuery(event.target.value);
  // re-render legends and pie chart when event triggers; the pie shows every
  // year matching the search so other years can still be selected
  renderPieChart(filteredProjects);
  // filter by the search query AND the selected year
  renderProjects(getVisibleProjects(), projectsContainer, 'h2');
});
