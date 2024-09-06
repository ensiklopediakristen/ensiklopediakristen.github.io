document.addEventListener('DOMContentLoaded', async function () {
    const sidebarContent = document.getElementById('sidebar-content');
    const mainContent = document.getElementById('content');
    const searchBox = document.getElementById('search-box');
    const searchResults = document.getElementById('search-results');
    const mainContainer = document.getElementById('main-container');
    let currentFile = '';

    async function loadMarkdown(file) {
    if (currentFile === file) return;
    currentFile = file;

    try {
        let markdown = await fetch(file).then(response => response.text());
        const folderName = file.split('/').slice(-2, -1)[0]; // Mengambil nama folder dari path

        // Menambahkan kategori di dalam konten markdown
        let categoryContent = '';
        if (file !== 'konten/beranda.md') {
            categoryContent += `<h2>Kategori: <a href="#" class="category-link" data-category="${folderName}" style="text-transform:capitalize">${folderName.replace(/_/g, ' ')}</a></h2>`;
        }

        // Menampilkan konten
        if (file === 'konten/beranda.md') {
            const recentPosts = await getRecentPosts();
            let recentPostsHTML = '<h2 class="recent-posts-title">Artikel Terbaru</h2><ul class="recent-posts-list">';
            recentPosts.forEach(post => {
                const postName = post.name.replace('.md', '').replace(/_/g, ' ');
                recentPostsHTML += `<li class="recent-post-item"><a href="#" class="recent-post-link" data-file="${post.dir}/${post.name}">${postName}</a></li>`;
            });
            recentPostsHTML += '</ul>';

            mainContent.innerHTML = recentPostsHTML + marked.parse(markdown) + categoryContent;
        } else {
            mainContent.innerHTML = marked.parse(markdown) + categoryContent;
        }

        // Memeriksa setiap kata dalam artikel
        await linkifyKeywords();

        scrollToTop();
        updateURL(file);
        addMarkdownLinksListener();
        updateTitleFromContent(); // Update title setelah konten di-render

        // Tambahkan event listener untuk link kategori
        document.querySelectorAll('.category-link').forEach(link => {
            link.addEventListener('click', function (event) {
                event.preventDefault();
                const category = this.getAttribute('data-category');
                showArticlesByCategory(category);
            });
        });

        // Tambahkan event listener untuk link artikel
        document.querySelectorAll('a[data-file]').forEach(link => {
            link.addEventListener('click', function (event) {
                event.preventDefault();
                const targetFile = this.getAttribute('data-file');
                loadMarkdown(targetFile);
            });
        });

    } catch (error) {
        mainContent.innerHTML = `<p>Error loading content: ${error}</p>`;
    }
}

async function getArticlesByCategory(category) {
    const articles = [];
    
    async function fetchCategoryArticles(dir) {
        const data = await fetch(`${dir}/index.json`).then(response => response.json());
        for (const item of data) {
            if (item.type === 'file' && item.name.endsWith('.md')) {
                articles.push({
                    name: item.name,
                    dir: dir
                });
            }
        }
    }

    await fetchCategoryArticles(`konten/kategori/${category}`);
    return articles;
}

async function showArticlesByCategory(category) {
    try {
        const articles = await getArticlesByCategory(category);

        // Buat daftar artikel dalam kategori
        let articlesHTML = `<h2>Artikel dalam kategori: <span style="text-transform:capitalize">${category.replace(/_/g, ' ')}</span></h2><ul>`;
        articles.forEach(article => {
            const articleName = article.name.replace('.md', '').replace(/_/g, ' ');
            articlesHTML += `<li><a href="#" data-file="${article.dir}/${article.name}" style="text-transform:capitalize">${articleName}</a></li>`;
        });
        articlesHTML += '</ul>';

        // Tampilkan daftar artikel pada konten utama
        mainContent.innerHTML = articlesHTML;

        // Tambahkan event listener untuk link artikel
        mainContent.querySelectorAll('a[data-file]').forEach(link => {
            link.addEventListener('click', function (event) {
                event.preventDefault();
                const targetFile = this.getAttribute('data-file');
                loadMarkdown(targetFile);
            });
        });

    } catch (error) {
        mainContent.innerHTML = `<p>Error loading articles in category: ${error}</p>`;
    }
}

async function getArticlesByCategory(category) {
    const articles = [];
    
    async function fetchCategoryArticles(dir) {
        const data = await fetch(`${dir}/index.json`).then(response => response.json());
        for (const item of data) {
            if (item.type === 'file' && item.name.endsWith('.md')) {
                articles.push({
                    name: item.name,
                    dir: dir
                });
            }
        }
    }

    await fetchCategoryArticles(`konten/kategori/${category}`);
    return articles;
}

async function linkifyKeywords() {
    const keywords = await getAllMarkdownFiles();
    let relatedLinks = []; // Array untuk menyimpan kata-kata yang dijadikan tautan
    
    // Ambil judul artikel yang sedang dibuka
    const currentFileName = currentFile.split('/').pop().replace('.md', '').replace(/_/g, ' '); // Ambil nama file saat ini tanpa ekstensi dan ganti underscore dengan spasi

    mainContent.querySelectorAll('p').forEach(p => {
        let htmlContent = p.innerHTML;
        let hasLink = false; // Flag untuk melacak apakah kata telah diubah menjadi tautan dalam paragraf ini

        // Mencari kata dalam paragraf
        keywords.forEach(keyword => {
            const word = keyword.name.replace('.md', '').replace(/_/g, ' '); // Ganti underscore dengan spasi
            const filePath = `${keyword.dir}/${keyword.name}`; // Path file markdown yang terkait
            
            // Jika kata adalah "YHWH", gunakan huruf besar dan cek apakah bukan judul halaman
            if (word.toUpperCase() === 'YHWH' && currentFileName.toUpperCase() !== 'YHWH') {
                const updatedContent = replaceOutsideLinksAndImages(htmlContent, 'YHWH', filePath);
                if (updatedContent !== htmlContent) {
                    hasLink = true;
                    relatedLinks.push({ word: 'YHWH', filePath }); // Tambahkan ke daftar "Lihat juga" hanya jika kata diubah menjadi tautan
                }
                htmlContent = updatedContent;
            } else if (word === "Allah") {
                // Untuk kata "Allah", ganti hanya jika huruf awal adalah A kapital
                const updatedContent = replaceOutsideLinksAndImages(htmlContent, 'Allah', filePath, true);
                if (updatedContent !== htmlContent) {
                    hasLink = true;
                    relatedLinks.push({ word: 'Allah', filePath }); // Tambahkan ke daftar "Lihat juga"
                }
                htmlContent = updatedContent;
            } else if (word.toLowerCase() !== currentFileName.toLowerCase()) { 
                // Cek apakah kata bukan judul halaman yang sedang ditampilkan
                const updatedContent = replaceOutsideLinksAndImages(htmlContent, word, filePath, false);
                if (updatedContent !== htmlContent) {
                    hasLink = true;
                    relatedLinks.push({ word, filePath }); // Tambahkan ke daftar "Lihat juga"
                }
                htmlContent = updatedContent;
            }
        });

        p.innerHTML = htmlContent;

        // Menambahkan event listener untuk link baru
        p.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', function (event) {
                event.preventDefault();
                const targetFile = this.getAttribute('data-file');
                loadMarkdown(targetFile);
            });
        });
    });

    // Setelah selesai memproses kata-kata, tampilkan daftar "Lihat juga"
    if (relatedLinks.length > 0) {
        showRelatedLinks(relatedLinks);
    }
}

function showRelatedLinks(relatedLinks) {
    // Cari elemen H2 dengan teks "Lihat Juga"
    const seeAlsoHeader = Array.from(mainContent.querySelectorAll('h2')).find(h2 => h2.textContent.trim().toLowerCase() === 'lihat juga');

    if (seeAlsoHeader) {
        // Gunakan Set untuk menghindari duplikasi tautan
        const uniqueLinks = new Set();

        // Tambahkan hanya tautan yang unik ke dalam Set
        relatedLinks.forEach(link => {
            uniqueLinks.add(JSON.stringify({ word: link.word, filePath: link.filePath }));
        });

        // Ubah Set kembali menjadi Array dan urutkan berdasarkan kata secara alfabet
        const sortedLinks = Array.from(uniqueLinks).map(linkStr => JSON.parse(linkStr)).sort((a, b) => a.word.localeCompare(b.word));

        // Jika ada tautan unik, tampilkan di bawah H2 "Lihat Juga"
        if (sortedLinks.length > 0) {
            let relatedLinksHTML = '<ul>';

            sortedLinks.forEach(link => {
                const titleCasedWord = link.word.split(' ')
                    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
                    .join(' '); // Membuat huruf awal tiap kata besar
                relatedLinksHTML += `<li><a href="#" data-file="${link.filePath}">${titleCasedWord}</a></li>`;
            });

            relatedLinksHTML += '</ul>';

            const seeAlsoContainer = document.createElement('div');
            seeAlsoContainer.innerHTML = relatedLinksHTML;

            // Tambahkan daftar di bawah elemen H2 "Lihat Juga"
            seeAlsoHeader.insertAdjacentElement('afterend', seeAlsoContainer);

            // Tambahkan event listener ke link di daftar "Lihat juga"
            seeAlsoContainer.querySelectorAll('a').forEach(link => {
                link.addEventListener('click', function (event) {
                    event.preventDefault();
                    const targetFile = this.getAttribute('data-file');
                    loadMarkdown(targetFile);
                });
            });
        }
    }
}

// Fungsi untuk mengganti kata-kata hanya jika berada di luar elemen link atau alt gambar
function replaceOutsideLinksAndImages(htmlContent, word, filePath, isCaseSensitive = true) {
    const regex = new RegExp(`(<a [^>]*>.*?<\\/a>)|(<img [^>]*>)|\\b(${word})\\b`, isCaseSensitive ? 'g' : 'gi');

    return htmlContent.replace(regex, function (match, linkTag, imgTag, keywordMatch) {
        if (linkTag || imgTag) {
            // Jika sudah merupakan link atau gambar, biarkan saja
            return match;
        }
        // Jika kata cocok, gantikan dengan tautan tetapi gunakan kata aslinya (keywordMatch)
        if (keywordMatch) {
            return `<a href="#" data-file="${filePath}">${keywordMatch}</a>`;
        }
        return match;
    });
}

// Fungsi untuk mendapatkan daftar file Markdown yang tersedia
async function getAllMarkdownFiles() {
    const allFiles = [];

    async function fetchDirectory(dir) {
        const data = await fetch(`${dir}/index.json`).then(response => response.json());
        for (const item of data) {
            if (item.type === 'file' && item.name.endsWith('.md')) {
                allFiles.push({
                    name: item.name,
                    dir: dir
                });
            } else if (item.type === 'directory') {
                await fetchDirectory(`${dir}/${item.name}`);
            }
        }
    }

    await fetchDirectory('konten');
    return allFiles;
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

    function updateTitleFromContent() {
        const h1 = mainContent.querySelector('h1');
        if (h1) {
            document.title = h1.textContent; // Ambil judul dari H1
        } else {
            document.title = "Ensiklopedia Kristen"; // Default title jika H1 tidak ada
        }
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

    const kategoriLink = document.createElement('li');
    const kategoriSpan = document.createElement('span');
    const kategoriSublistCount = await countSublist('konten/kategori');
    kategoriSpan.textContent = `kategori (${kategoriSublistCount} artikel)`;
    kategoriSpan.style.cursor = 'pointer';

    kategoriSpan.addEventListener('click', function (event) {
        event.stopPropagation();
        const sublist = kategoriLink.querySelector('ul');
        if (sublist) {
            sublist.classList.toggle('hidden');
            kategoriSpan.classList.toggle('expanded');
        } else {
            const ul = document.createElement('ul');
            createSidebarList('konten/kategori', ul);
            kategoriLink.appendChild(ul);
            kategoriSpan.classList.add('expanded');
        }
    });

    kategoriLink.appendChild(kategoriSpan);
    sidebarContent.appendChild(kategoriLink);

    window.addEventListener('popstate', function (event) {
        if (event.state && event.state.path) {
            loadMarkdown(event.state.path);
        }
    });

    const urlParams = new URLSearchParams(window.location.search);
    const initialPage = urlParams.get('page') || 'konten/beranda.md';
    loadMarkdown(initialPage);
});
