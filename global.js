// Step 1: Selector function for DOM manipulation
console.log('IT’S ALIVE!');

function $$(selector, context = document) {
  return Array.from(context.querySelectorAll(selector));
}

// Step 2: automatic current page link (replaced by Step 3)
// let navLinks = $$('nav a');
//
// let currentLink = navLinks.find(
//   (a) => a.host === location.host && a.pathname === location.pathname,
// );
//
// currentLink?.classList.add('current'); // ? is the chaining operator to prevent errors

// Step 3: automatic navigation menu
let pages = [
  { url: '', title: 'Home' },
  { url: 'projects/', title: 'Projects' },
  { url: 'resume/', title: 'Resume' },
  { url: 'cv/', title: 'CV' },
  { url: 'contact/', title: 'Contact' },
  { url: 'meta/', title: 'Meta' },
  { url: 'https://github.com/stvngo', title: 'GitHub' }
];

const BASE_PATH = (location.hostname === 'localhost' || location.hostname === '127.0.0.1')
  ? '/'            // Local server
  : '/portfolio/'; // GitHub Pages repo name

let nav = document.createElement('nav');
document.body.prepend(nav);

for (let p of pages) {
  let url = p.url;
  let title = p.title;

  // check if the url is relative (does not start with http)
  url = !url.startsWith('http') ? BASE_PATH + url : url; // ternary operator

  let a = document.createElement('a');
  a.href = url;
  a.textContent = title;

  // check if the link is the current page
  a.classList.toggle(
    'current',
    a.host === location.host && a.pathname === location.pathname,
  );

  // if the link is external, open in a new tab
  if (a.host !== location.host) {
    a.target = '_blank';
  }

  // append the link element to the nav
  nav.append(a);
}

// Step 4: dark mode switcher
document.body.insertAdjacentHTML( // provided by the lab
  'afterbegin',
  `
	<label class="color-scheme">
		Theme:
		<select>
			<option value="light dark">Automatic (${matchMedia('(prefers-color-scheme: dark)').matches ? 'Dark' : 'Light'})</option>
			<option value="light">Light</option>
			<option value="dark">Dark</option>
		</select>
	</label>`,
);

let select = document.querySelector('.color-scheme select');

function setColorScheme(colorScheme) {
  document.documentElement.style.setProperty('color-scheme', colorScheme);
  select.value = colorScheme;
}

// 4.5.2: set the color scheme from local storage
if ('colorScheme' in localStorage) {
  setColorScheme(localStorage.colorScheme);
}

select.addEventListener('input', function (event) {
  console.log('color scheme changed to', event.target.value);
  setColorScheme(event.target.value);
  localStorage.colorScheme = event.target.value; // 4.5.1: save user preference to local storage
});

// Step 5: better contact form
let form = document.querySelector('form');

form?.addEventListener('submit', function (event) { // runs on every page, so use ? to prevent errors
  event.preventDefault();

  let data = new FormData(form); // built-in object lets you easily construct a URL query string from the form data
  let url = form.action + '?'; // construct the URL query (mailto:email...)

  for (let [name, value] of data) {
    url += name + '=' + encodeURIComponent(value) + '&'; // safely encode values 
  }

  location.href = url.slice(0, -1);
});

// Lab 4 Step 1.2: load JSON data from a URL
export async function fetchJSON(url) {
  try {
    // Fetch the JSON file from the given URL
    const response = await fetch(url);
    console.log(response);

    if (!response.ok) {
      throw new Error(`Failed to fetch projects: ${response.statusText}`);
    }

    // parse the JSON response
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching or parsing JSON data:', error);
  }
}

// Lab 4 Step 1.4: render an array of projects into a container
export function renderProjects(project, containerElement, headingLevel = 'h2') {
  if (!containerElement) {
    return;
  }

  if (!/^h[1-6]$/.test(headingLevel)) { // check if the heading is valid (h1-h6)
    headingLevel = 'h2';
  }

  containerElement.innerHTML = ''; // clear the container

  for (let p of project) {
    const article = document.createElement('article'); // secure and modular
    article.innerHTML = `
    <${headingLevel}>${p.title}</${headingLevel}>
    <img src="${p.image}" alt="${p.title}">
    <div>
      <p>${p.description}</p>
      <p class="project-year">c. ${p.year}</p>
    </div>
`;
    containerElement.appendChild(article);
  }
}

// Lab 4 Step 3.2: fetch public profile data from the GitHub API
export async function fetchGitHubData(username) {
  return fetchJSON(`https://api.github.com/users/${username}`);
}
