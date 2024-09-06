document.addEventListener('DOMContentLoaded', async function () {
    const sidebarContent = document.getElementById('sidebar-content');
    const mainContent = document.getElementById('content');
    const searchBox = document.getElementById('search-box');
    const searchResults = document.getElementById('search-results');
    const mainContainer = document.getElementById('main-container');
    let currentFile = '';

    // Fungsi untuk memperbarui meta tag
    function updateMetaTags(title, description, imageUrl) {
        // Update title
        document.title = title;

        // Update meta description
        const metaDescription = document.querySelector('meta[name="description"]');
        if (metaDescription) {
            metaDescription.setAttribute('content', description);
        }

        // Update Open Graph tags
        const ogTitle = document.querySelector('meta[property="og:title"]');
        if (ogTitle) {
            ogTitle.setAttribute('content', title);
        }

        const ogDescription = document.querySelector('meta[property="og:description"]');
        if (ogDescription) {
            ogDescription.setAttribute('content', description);
        }

        const ogImage = document.querySelector('meta[property="og:image"]');
        if (ogImage && imageUrl) {
            ogImage.setAttribute('content', imageUrl);
        }

        // Update Schema.org data
        const schemaScript = document.querySelector('script[type="application/ld+json"]');
        if (schemaScript) {
            const schemaData = JSON.parse(schemaScript.innerHTML);
            schemaData.name = title;
            schemaData.description = description;
            if (imageUrl) {
                schemaData.image = imageUrl;
            }
            schemaScript.innerHTML = JSON.stringify(schemaData, null, 2);
        }
    }

    async function loadMarkdown(file) {
        if (currentFile === file) return;
        currentFile = file;

        try {
            let markdown = await fetch(file).then(response => response.text());

            // Tentukan judul dan deskripsi berdasarkan file yang di-load
            const title = file.replace('.md', '').replace(/_/g, ' ');
            const description = `Baca artikel ${title} di Ensiklopedia Kristen.`;
            const imageUrl = 'https://ensiklopedikristen.github.io/logo.jpg'; // Sesuaikan jika ada gambar spesifik

            // Update meta tags
            updateMetaTags(title, description, imageUrl);

            if (file === 'konten/beranda.md') {
                const recentPosts = await getRecentPosts();
                let recentPostsHTML = '<h2 class="recent-posts-title">Artikel Terbaru</h2><ul class="recent-posts-list">';
                recentPosts.forEach(post => {
                    const postName = post.name.replace('.md', '').replace(/_/g, ' ');
                    recentPostsHTML += `<li class="recent-post-item"><a href="#" class="recent-post-link" data-file="${post.dir}/${post.name}">${postName}</a></li>`;
                });
                recentPostsHTML += '</ul>';

                mainContent.innerHTML = recentPostsHTML + marked.parse(markdown);

                document.querySelectorAll('.recent-post-link').forEach(link => {
                    link.addEventListener('click', function (event) {
                        event.preventDefault();
                        const targetFile = this.getAttribute('data-file');
                        loadMarkdown(targetFile);
                    });
                });

            } else {
                mainContent.innerHTML = marked.parse(markdown);
            }

            scrollToTop();
            updateURL(file);
            addMarkdownLinksListener();
        } catch (error) {
            mainContent.innerHTML = `<p>Error loading content: ${error}</p>`;
        }
    }

    function addMarkdownLinksListener() {
        mainContent.querySelectorAll('a').forEach(link => {
            const href = link.getAttribute('href');
            if (href && href.endsWith('.md')) {
                link.addEventListener('click', function (event) {
                    event.preventDefault();
                    loadMarkdown(href);
                });
            }
        });
    }

    function scrollToTop() {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    }

    function updateURL(filePath) {
        const url = new URL(window.location);
        url.searchParams.set('page', filePath);

        if (history.state && history.state.path === filePath) return;
        history.pushState({ path: filePath }, '', url);
    }

    async function createSidebarList(dir, parentElement) {
        try {
            const data = await fetch(`${dir}/index.json`).then(response => response.json());
            const fragment = document.createDocumentFragment();

            for (const item of data) {
                const li = document.createElement('li');

                if (item.type === 'directory') {
                    const span = document.createElement('span');
                    const sublistCount = await countSublist(`${dir}/${item.name}`);
                    span.textContent = `${item.name.replace(/_/g, ' ')} (${sublistCount})`;
                    span.style.cursor = 'pointer';

                    span.addEventListener('click', function (event) {
                        event.stopPropagation();
                        const sublist = li.querySelector('ul');
                        if (sublist) {
                            sublist.classList.toggle('hidden');
                            span.classList.toggle('expanded');
                        } else {
                            const ul = document.createElement('ul');
                            createSidebarList(`${dir}/${item.name}`, ul);
                            li.appendChild(ul);
                            span.classList.add('expanded');
                        }
                    });

                    li.appendChild(span);
                } else if (item.type === 'file') {
                    const a = document.createElement('a');
                    a.href = "#";
                    a.textContent = item.name.replace('.md', '').replace(/_/g, ' ');
                    a.addEventListener('click', function (event) {
                        event.preventDefault();
                        loadMarkdown(`${dir}/${item.name}`);
                    });

                    li.appendChild(a);
                }

                fragment.appendChild(li);
            }

            parentElement.appendChild(fragment);
        } catch (error) {
            parentElement.innerHTML = `<p>Error loading sidebar: ${error}</p>`;
        }
    }

    async function countSublist(dir) {
        try {
            const data = await fetch(`${dir}/index.json`).then(response => response.json());
            let count = 0;

            for (const item of data) {
                if (item.type === 'file') {
                    count += 1;
                } else if (item.type === 'directory') {
                    count += await countSublist(`${dir}/${item.name}`);
                }
            }

            return count;
        } catch (error) {
            console.error('Error counting sublist:', error);
            return 0;
        }
    }

    async function searchWiki(keyword) {
        searchResults.innerHTML = '';
        const lowerKeyword = keyword.toLowerCase();

        async function searchInDir(dir) {
            const data = await fetch(`${dir}/index.json`).then(response => response.json());
            for (const item of data) {
                if (item.type === 'file') {
                    const fileNameWithoutExt = item.name.replace('.md', '').toLowerCase();
                    if (fileNameWithoutExt.includes(lowerKeyword)) {
                        const li = document.createElement('li');
                        const a = document.createElement('a');
                        a.href = "#";
                        a.textContent = fileNameWithoutExt.replace(/_/g, ' ');
                        a.addEventListener('click', function (event) {
                            event.preventDefault();
                            loadMarkdown(`${dir}/${item.name}`);
                            searchResults.innerHTML = '';
                            searchBox.value = '';
                            mainContainer.classList.remove('hidden');
                            searchResults.classList.add('hidden');
                        });
                        li.appendChild(a);
                        searchResults.appendChild(li);
                    }
                } else if (item.type === 'directory') {
                    await searchInDir(`${dir}/${item.name}`);
                }
            }
        }

        await searchInDir('konten');
    }

    async function getRecentPosts() {
        const allPosts = [];

        async function fetchDirectory(dir) {
            const data = await fetch(`${dir}/index.json`).then(response => response.json());
            for (const item of data) {
                if (item.type === 'file' && item.name.endsWith('.md')) {
                    allPosts.push({
                        name: item.name,
                        dir: dir,
                        date: new Date(item.date)
                    });
                } else if (item.type === 'directory') {
                    await fetchDirectory(`${dir}/${item.name}`);
                }
            }
        }

        await fetchDirectory('konten/kategori');
        allPosts.sort((a, b) => b.date - a.date);
        return allPosts.slice(0, 10);
    }

    searchBox.addEventListener('input', function () {
        const keyword = searchBox.value.trim();
        if (keyword.length > 2) {
            mainContainer.classList.add('hidden');
            searchResults.classList.remove('hidden');
            searchWiki(keyword);
        } else {
            searchResults.innerHTML = '';
            searchResults.classList.add('hidden');
            mainContainer.classList.remove('hidden');
        }
    });

    const berandaLink = document.createElement('li');
    const berandaAnchor = document.createElement('a');
    berandaAnchor.href = "#";
    berandaAnchor.textContent = 'beranda';
    berandaAnchor.addEventListener('click', function (event) {
        event.preventDefault();
        loadMarkdown('konten/beranda.md');
    });

    berandaLink.appendChild(berandaAnchor);
    sidebarContent.appendChild(berandaLink);

    // Inisialisasi sidebar dan load beranda pada saat pertama kali
    createSidebarList('konten/kategori', sidebarContent);

    // Load halaman beranda ketika pertama kali halaman diakses
    const urlParams = new URLSearchParams(window.location.search);
    const initialPage = urlParams.get('page') || 'konten/beranda.md';
    loadMarkdown(initialPage);

    // Handle navigasi browser (back/forward)
    window.addEventListener('popstate', function (event) {
        if (event.state && event.state.path) {
            loadMarkdown(event.state.path);
        }
    });
});