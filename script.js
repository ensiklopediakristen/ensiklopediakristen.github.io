document.addEventListener('DOMContentLoaded', async function () {
    const sidebarContent = document.getElementById('sidebar-content');
    const mainContent = document.getElementById('content');
    const searchBox = document.getElementById('search-box');
    const searchResults = document.getElementById('search-results');
    const mainContainer = document.getElementById('main-container');
    let currentFile = '';
    const cache = new Map(); // Cache for storing fetch requests

    // Debounce function to delay search execution
    function debounce(func, delay) {
        let timeout;
        return function(...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), delay);
        };
    }

    // Fetch text content with caching
    async function fetchWithCache(url) {
        if (cache.has(url)) {
            return cache.get(url); // Return from cache if available
        } else {
            const response = await fetch(url);
            const data = await response.text(); // or .json() if it's a JSON
            cache.set(url, data); // Save response to cache
            return data;
        }
    }

    // Fetch text content of a file
    async function fetchText(file) {
        return fetchWithCache(file);
    }

    // Load Markdown content and render it
    async function loadMarkdown(file) {
        if (currentFile === file) return;
        currentFile = file;

        try {
            const markdown = await fetchText(file);
            const folderName = file.split('/').slice(-2, -1)[0];

            let categoryContent = '';
            if (file !== 'konten/beranda.md') {
                categoryContent = `<h2>Kategori: <a href="#" class="category-link" data-category="${folderName}" style="text-transform:capitalize">${folderName.replace(/_/g, ' ')}</a></h2>`;
            }

            if (file === 'konten/beranda.md') {
                const [recentPosts, allFiles] = await Promise.all([getRecentPosts(), getAllMarkdownFiles()]);
                const recentPostsHTML = await generateRecentPostsHTML(recentPosts);
                const randomPost = getRandomPostForToday(allFiles);
                const randomPostHTML = await generateRandomPostHTML(randomPost);

                mainContent.innerHTML = marked.parse(markdown) + randomPostHTML + recentPostsHTML + categoryContent;
            } else {
                mainContent.innerHTML = marked.parse(markdown) + categoryContent;
            }

            await linkifyKeywords();
            scrollToTop();
            updateURL(file);
            addMarkdownLinksListener();
            updateTitleFromContent();

            document.querySelectorAll('.category-link').forEach(link => {
                link.addEventListener('click', function (event) {
                    event.preventDefault();
                    showArticlesByCategory(this.getAttribute('data-category'));
                });
            });

            document.querySelectorAll('a[data-file]').forEach(link => {
                link.addEventListener('click', function (event) {
                    event.preventDefault();
                    loadMarkdown(this.getAttribute('data-file'));
                });
            });

        } catch (error) {
            mainContent.innerHTML = `<p>Error loading content: ${error.message}</p>`;
        }
    }

    // Generate recent posts HTML
    async function generateRecentPostsHTML(posts) {
        let recentPostsHTML = '<h2 class="beranda-title">Artikel Terbaru</h2><ul class="beranda-list">';
        for (const post of posts) {
            const postMarkdown = await fetchText(`${post.dir}/${post.name}`);
            const postContent = marked.parse(postMarkdown);
            const { h1, firstParagraph, img } = extractContent(postContent);

            let excerpt = '';
            if (firstParagraph) {
                const text = firstParagraph.textContent;
                const words = text.split(/\s+/);
                excerpt = words.slice(0, 15).join(' ') + '...';
            }

            const postName = post.name.replace('.md', '').replace(/_/g, ' ');
            recentPostsHTML += `
                <li class="beranda-item">
                    <a href="#" class="beranda-link" data-file="${post.dir}/${post.name}">
                        <div class="beranda-box">
                            ${img ? `<img src="${img.src}" alt="Gambar Artikel" loading="lazy">` : ''}
                            ${h1 ? h1.textContent : postName}<br>
                        </div>
                        <p>${excerpt}</p>
                    </a>
                </li>`;
        }
        recentPostsHTML += '</ul>';
        return recentPostsHTML;
    }

    // Generate random post HTML
    async function generateRandomPostHTML(post) {
        const randomPostMarkdown = await fetchText(`${post.dir}/${post.name}`);
        const randomPostContent = marked.parse(randomPostMarkdown);
        const { h1, firstParagraph, img } = extractContent(randomPostContent);

        let randomExcerpt = '';
        if (firstParagraph) {
            const text = firstParagraph.textContent;
            const words = text.split(/\s+/);
            randomExcerpt = words.slice(0, 15).join(' ') + '...';
        }

        const randomPostName = post.name.replace('.md', '').replace(/_/g, ' ');
        return `
            <h2 class="beranda-title">Artikel Pilihan Hari Ini</h2>
            <div class="beranda-item">
                <a href="#" class="beranda-link" data-file="${post.dir}/${post.name}">
                    <div class="beranda-box">
                        ${img ? `<img src="${img.src}" alt="Gambar Artikel" loading="lazy">` : ''}
                        ${h1 ? h1.textContent : randomPostName}<br>
                    </div>
                    <p>${randomExcerpt}</p>
                </a>
            </div>`;
    }

    // Extract h1, first paragraph, and image from content
    function extractContent(htmlContent) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlContent, 'text/html');
        return {
            h1: doc.querySelector('h1'),
            firstParagraph: doc.querySelector('p'),
            img: doc.querySelector('img')
        };
    }

    // Linkify keywords in content
    async function linkifyKeywords() {
        if (currentFile === 'konten/beranda.md') return;

        const keywords = await getAllMarkdownFiles();
        const currentFileName = currentFile.split('/').pop().replace('.md', '').replace(/_/g, ' ').toLowerCase();
        const exceptionWords = ["kudus", "kekudusan", "suci", "kesucian"];
        let internalLinks = [];

        mainContent.querySelectorAll('p').forEach(p => {
            let htmlContent = p.innerHTML;
            keywords.forEach(keyword => {
                const word = keyword.name.replace('.md', '').replace(/_/g, ' ').toLowerCase();
                const filePath = `${keyword.dir}/${keyword.name}`;

                if (currentFileName === "kekudusan" && exceptionWords.includes(word)) return;

                if (word !== currentFileName) {
                    const updatedContent = replaceOutsideLinksAndImages(htmlContent, word, filePath);
                    if (updatedContent !== htmlContent) {
                        if (!internalLinks.some(link => link.word === word)) {
                            internalLinks.push({ word, filePath });
                        }
                        htmlContent = updatedContent;
                    }
                }
            });
            p.innerHTML = htmlContent;
        });

        if (internalLinks.length > 0) {
            const internalLinksHTML = `
                <h2>Tautan Internal</h2>
                <ul class="internal-links-list">
                    ${internalLinks.map(link => `<li><a href="#" data-file="${link.filePath}" style="text-transform:capitalize">${link.word}</a></li>`).join('')}
                </ul>`;
            const categorySection = mainContent.querySelector('h2.Kategori');
            if (categorySection) {
                categorySection.insertAdjacentHTML('beforebegin', internalLinksHTML);
            } else {
                mainContent.insertAdjacentHTML('beforeend', internalLinksHTML);
            }

            mainContent.querySelectorAll('.internal-links-list a').forEach(link => {
                link.addEventListener('click', function (event) {
                    event.preventDefault();
                    loadMarkdown(this.getAttribute('data-file'));
                });
            });
        }
    }

    // Replace links outside of aTags and images
    function replaceOutsideLinksAndImages(htmlContent, phrase, filePath) {
        const escapedPhrase = phrase.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
        const phraseRegex = new RegExp(`(\\b${escapedPhrase}\\b)`, 'gi');

        return htmlContent.replace(/(<a [^>]*>.*?<\/a>)|(<img [^>]*>)|([^<]+)/g, (match, aTag, imgTag, textContent) => {
            if (aTag || imgTag) return match;
            if (textContent) {
                const originalPhrase = textContent.match(phraseRegex);
                if (originalPhrase) {
                    return textContent.replace(phraseRegex, `<a href="#" data-file="${filePath}">${originalPhrase[0]}</a>`);
                }
            }
            return match;
        });
    }

    // Fetch all markdown files
    async function getAllMarkdownFiles() {
        const allFiles = [];
        async function fetchDirectory(dir) {
            const data = await fetchWithCache(`${dir}/index.json`);
            const json = JSON.parse(data);
            for (const item of json) {
                if (item.type === 'file' && item.name.endsWith('.md')) {
                    allFiles.push({ name: item.name, dir });
                } else if (item.type === 'directory') {
                    await fetchDirectory(`${dir}/${item.name}`);
                }
            }
        }
        await fetchDirectory('konten');
        return allFiles;
    }

    // Fetch recent posts (last 5 markdown files)
    async function getRecentPosts() {
        const allFiles = await getAllMarkdownFiles();
        return allFiles.slice(-5).reverse();
    }

    // Get a random post for today
    function getRandomPostForToday(allFiles) {
        const index = Math.floor(Math.random() * allFiles.length);
        return allFiles[index];
    }

    // Debounced search function
    searchBox.addEventListener('input', debounce(async function () {
        const query = searchBox.value.toLowerCase();
        const allFiles = await getAllMarkdownFiles();
        const filteredResults = allFiles.filter(file => file.name.toLowerCase().includes(query));
        searchResults.innerHTML = '';
        filteredResults.forEach(result => {
            const resultName = result.name.replace('.md', '').replace(/_/g, ' ');
            const resultItem = document.createElement('li');
            const resultLink = document.createElement('a');
            resultLink.href = '#';
            resultLink.textContent = resultName;
            resultLink.addEventListener('click', function (event) {
                event.preventDefault();
                loadMarkdown(`${result.dir}/${result.name}`);
                searchBox.value = '';
                searchResults.innerHTML = '';
            });
            resultItem.appendChild(resultLink);
            searchResults.appendChild(resultItem);
        });
    }, 300)); // Run search only after the user has stopped typing for 300ms

    // Other utility functions
    function scrollToTop() {
        window.scrollTo({ top: 0});
    }

    function updateURL(file) {
        const url = `${window.location.origin}${window.location.pathname}?file=${file}`;
        window.history.pushState({ path: url }, '', url);
    }

    function updateTitleFromContent() {
        const titleElement = mainContent.querySelector('h1');
        document.title = titleElement ? titleElement.textContent : 'Website';
    }

    function addMarkdownLinksListener() {
        mainContent.querySelectorAll('a[data-file]').forEach(link => {
            link.addEventListener('click', function (event) {
                event.preventDefault();
                loadMarkdown(this.getAttribute('data-file'));
            });
        });
    }

    // Initial content load
    loadMarkdown('konten/beranda.md');
});
