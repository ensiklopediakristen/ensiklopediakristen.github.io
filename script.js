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

        let categoryContent = '';
        if (file !== 'konten/beranda.md') {
            categoryContent += `<h2>Kategori: <a href="#" class="category-link" data-category="${folderName}" style="text-transform:capitalize">${folderName.replace(/_/g, ' ')}</a></h2>`;
        }

        if (file === 'konten/beranda.md') {

            // Mendapatkan artikel terbaru
            const recentPosts = await getRecentPosts();
            let recentPostsHTML = '<h2 class="beranda-title">Artikel Terbaru</h2><ul class="beranda-list">';
            for (const post of recentPosts) {
                const postMarkdown = await fetch(post.dir + '/' + post.name).then(response => response.text());
                const postContent = marked.parse(postMarkdown);

            // Parse konten markdown menjadi dokumen HTML
            const parser = new DOMParser();
            const doc = parser.parseFromString(postContent, 'text/html');
            const h1 = doc.querySelector('h1');

            // Temukan elemen <h2> pertama
            const firstH2 = doc.querySelector('h2');

            let firstParagraph = null;
            if (firstH2) {
                // Temukan elemen setelah <h2>
                let sibling = firstH2.nextElementSibling;

                // Loop sampai menemukan paragraf <p> yang valid
                while (sibling) {
                    if (sibling.tagName === 'P' && !sibling.closest('table')) {
                        firstParagraph = sibling;
                        break;
                    }
                    sibling = sibling.nextElementSibling;
                }
            }

            let excerpt = '';
            if (firstParagraph) {
                const text = firstParagraph.textContent;
                const words = text.split(/\s+/);
                excerpt = words.slice(0, 15).join(' ') + '...';
            } else {
                excerpt = 'No valid excerpt found';
            }

            const postName = post.name.replace('.md', '').replace(/_/g, ' ');
            recentPostsHTML += `
                <li class="beranda-item">
                    <a href="#" class="beranda-link" data-file="${post.dir}/${post.name}">
                        <div class="beranda-box">
                            ${doc.querySelector('img') ? `<img src="${doc.querySelector('img').src}" alt="Gambar Artikel">` : ''}
                            ${h1 ? h1.textContent : postName}<br>
                        </div>
                        <p>${excerpt}</p>
                    </a>
                </li>`;
            }
            recentPostsHTML += '</ul>';
            
            // Mendapatkan semua file markdown
            const allFiles = await getAllMarkdownFiles();

            // Memilih artikel acak berdasarkan tanggal
            const randomPost = getRandomPostForToday(allFiles);
            const randomPostMarkdown = await fetch(randomPost.dir + '/' + randomPost.name).then(response => response.text());
            const randomPostContent = marked.parse(randomPostMarkdown);

            // Extract content from random post
            const randomDoc = new DOMParser().parseFromString(randomPostContent, 'text/html');
            const randomH1 = randomDoc.querySelector('h1');
            const randomFirstH2 = randomDoc.querySelector('h2');

            let randomFirstParagraph = null;
            if (randomFirstH2) {
                // Temukan elemen setelah <h2>
                let sibling = randomFirstH2.nextElementSibling;

                // Loop sampai menemukan paragraf <p> yang valid
                while (sibling) {
                if (sibling.tagName === 'P' && !sibling.closest('table')) {
                        randomFirstParagraph = sibling;
                        break;
                    }
                    sibling = sibling.nextElementSibling;
                }
            }

let randomExcerpt = '';
if (randomFirstParagraph) {
    const randomText = randomFirstParagraph.textContent;
    const randomWords = randomText.split(/\s+/);
    randomExcerpt = randomWords.slice(0, 15).join(' ') + '...';
} else {
    randomExcerpt = 'No valid excerpt found';
}

const randomPostName = randomPost.name.replace('.md', '').replace(/_/g, ' ');

// Menampilkan artikel acak
let randomPostHTML = `
    <h2 class="beranda-title">Artikel Pilihan Hari Ini</h2>
    <div class="beranda-item">
        <a href="#" class="beranda-link" data-file="${randomPost.dir}/${randomPost.name}">
            <div class="beranda-box">
                ${randomDoc.querySelector('img') ? `<img src="${randomDoc.querySelector('img').src}" alt="Gambar Artikel">` : ''}
                ${randomH1 ? randomH1.textContent : randomPostName}<br>
            </div>
            <p>${randomExcerpt}</p>
        </a>
    </div>`;

            mainContent.innerHTML = marked.parse(markdown) + randomPostHTML + recentPostsHTML + categoryContent;
        } else {
            mainContent.innerHTML = marked.parse(markdown) + categoryContent;
        }

        await linkifyKeywords();
        scrollToTop();
        updateURL(file);
        addMarkdownLinksListener();
        updateTitleFromContent();

        // Event listener untuk kategori
        document.querySelectorAll('.category-link').forEach(link => {
            link.addEventListener('click', function (event) {
                event.preventDefault();
                const category = this.getAttribute('data-category');
                showArticlesByCategory(category);
            });
        });

        // Event listener untuk artikel terbaru atau random
        document.querySelectorAll('a[data-file]').forEach(link => {
            link.addEventListener('click', function (event) {
                event.preventDefault();
                const targetFile = this.getAttribute('data-file');
                loadMarkdown(targetFile);
            });
        });

        } catch (error) {
            mainContent.innerHTML = `<p>Error loading content: ${error.message}</p>`;
        }
    }

    async function getArticlesByCategory(category) {
        const articles = [];
        try {
            const data = await fetch(`konten/kategori/${category}/index.json`).then(response => response.json());
            data.forEach(item => {
                if (item.type === 'file' && item.name.endsWith('.md')) {
                    articles.push({ name: item.name, dir: `konten/kategori/${category}` });
                }
            });
        } catch (error) {
            console.error(`Error fetching articles for category ${category}: ${error.message}`);
        }
        return articles;
    }
    
    

    async function linkifyKeywords() {
    // Cek apakah halaman yang sedang dibuka adalah beranda
    if (currentFile === 'konten/beranda.md') {
        return; // Jangan jalankan fungsi linkify jika di halaman beranda
    }

    const keywords = await getAllMarkdownFiles();
    const currentFileName = currentFile.split('/').pop().replace('.md', '').replace(/_/g, ' ').toLowerCase();
    const exceptionWords = ["kudus", "kekudusan", "suci", "kesucian"];
    let internalLinks = []; // Gunakan array biasa, tapi cek duplikasi secara manual

    mainContent.querySelectorAll('p').forEach(p => {
        let htmlContent = p.innerHTML;
        keywords.forEach(keyword => {
            const word = keyword.name.replace('.md', '').replace(/_/g, ' ').toLowerCase();
            const filePath = `${keyword.dir}/${keyword.name}`;

            if (currentFileName === "kekudusan" && exceptionWords.includes(word)) return;

            if (word !== currentFileName) {
                const updatedContent = replaceOutsideLinksAndImages(htmlContent, word, filePath, false);
                if (updatedContent !== htmlContent) {
                    // Cek apakah tautan sudah ada sebelum menambahkannya ke daftar
                    if (!internalLinks.some(link => link.word === word)) {
                        internalLinks.push({ word, filePath });
                    }
                }
                htmlContent = updatedContent;
            }
        });
        p.innerHTML = htmlContent;
    });

    // Tambahkan daftar "Tautan Internal" di bagian atas artikel, tepat sebelum kategori
    if (internalLinks.length > 0) {
        let internalLinksHTML = '<h2>Tautan Internal</h2><ul class="internal-links-list">';
        internalLinks.forEach(link => {
            internalLinksHTML += `<li><a href="#" data-file="${link.filePath}" style="text-transform:capitalize">${link.word}</a></li>`;
        });
        internalLinksHTML += '</ul>';

        // Cari elemen kategori dan tambahkan tautan internal di atasnya
        const categorySection = mainContent.querySelector('h2.Kategori');
        if (categorySection) {
            categorySection.insertAdjacentHTML('beforebegin', internalLinksHTML);
        } else {
            mainContent.insertAdjacentHTML('beforeend', internalLinksHTML);
        }

        // Tambahkan event listener ke tautan internal yang baru ditambahkan
        mainContent.querySelectorAll('.internal-links-list a').forEach(link => {
            link.addEventListener('click', function (event) {
                event.preventDefault();
                const targetFile = this.getAttribute('data-file');
                loadMarkdown(targetFile);
            });
        });
    }
}

    async function showArticlesByCategory(category) {
        try {
            const articles = await getArticlesByCategory(category);
            let articlesHTML = `<h1>Artikel dalam kategori: <span style="text-transform:capitalize">${category.replace(/_/g, ' ')}</span></h1><ul>`;
            articles.forEach(article => {
                const articleName = article.name.replace('.md', '').replace(/_/g, ' ');
                articlesHTML += `<li><a href="#" data-file="${article.dir}/${article.name}" style="text-transform:capitalize">${articleName}</a></li>`;
            });
            articlesHTML += '</ul>';
            mainContent.innerHTML = articlesHTML;

            mainContent.querySelectorAll('a[data-file]').forEach(link => {
                link.addEventListener('click', function (event) {
                    event.preventDefault();
                    const targetFile = this.getAttribute('data-file');
                    loadMarkdown(targetFile);
                });
            });

        } catch (error) {
            mainContent.innerHTML = `<p>Error loading articles in category: ${error.message}</p>`;
        }
    }

    function replaceOutsideLinksAndImages(htmlContent, phrase, filePath) {
        const escapedPhrase = phrase.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');  // Escape karakter khusus di frasa
        const phraseRegex = new RegExp(`(\\b${escapedPhrase}\\b)`, 'gi');  // 'g' untuk global, 'i' untuk case-insensitive

        return htmlContent.replace(/(<a [^>]*>.*?<\/a>)|(<img [^>]*>)|([^<]+)/g, function (match, aTag, imgTag, textContent) {
            if (aTag || imgTag) return match; // Jangan ganti konten dalam tag <a> atau <img>
            if (textContent) {
                // Pengecualian manual untuk "kekudusan Allah"
                const specialPhrase = textContent.match(/kekudusan Allah/gi);
                if (specialPhrase) {
                    return textContent.replace(/kekudusan Allah/gi, `<a href="#" data-file="konten/kategori/sifat_tuhan/kekudusan_tuhan.md">Kekudusan Allah</a>`);
                }

                // Cari dan simpan frasa asli sesuai dengan huruf besar/kecil yang ada di konten
                const originalPhrase = textContent.match(phraseRegex);
                if (originalPhrase) {
                    // Gunakan frasa asli yang ditemukan dari konten saat mengganti dengan tautan
                    return textContent.replace(phraseRegex, `<a href="#" data-file="${filePath}">${originalPhrase[0]}</a>`);
                }
            }
            return match;
        });
    }

    async function getAllMarkdownFiles() {
        const allFiles = [];
        async function fetchDirectory(dir) {
            const data = await fetch(`${dir}/index.json`).then(response => response.json());
            for (const item of data) {
                if (item.type === 'file' && item.name.endsWith('.md')) {
                    allFiles.push({ name: item.name, dir: dir });
                } else if (item.type === 'directory') {
                    await fetchDirectory(`${dir}/${item.name}`);
                }
            }
        }
        await fetchDirectory('konten');
        return allFiles;
    }

    function addMarkdownLinksListener() {
        mainContent.querySelectorAll('a[href$=".md"]').forEach(link => {
            link.addEventListener('click', function (event) {
                event.preventDefault();
                loadMarkdown(link.getAttribute('href'));
            });
        });
    }

    function scrollToTop() {
        window.scrollTo({ top: 0});
    }

    function updateURL(filePath) {
        const url = new URL(window.location);
        url.searchParams.set('page', filePath);
        if (!history.state || history.state.path !== filePath) {
            history.pushState({ path: filePath }, '', url);
        }
    }

    function updateTitleFromContent() {
        const h1 = mainContent.querySelector('h1');
        document.title = h1 ? h1.textContent : "Ensiklopedia Kristen";
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
            parentElement.innerHTML = `<p>Error loading sidebar: ${error.message}</p>`;
        }
    }

    async function countSublist(dir) {
        try {
            const data = await fetch(`${dir}/index.json`).then(response => response.json());
            let count = 0;
            for (const item of data) {
                if (item.type === 'file' && item.name.endsWith('.md')) {
                    count += 1;
                } else if (item.type === 'directory') {
                    count += await countSublist(`${dir}/${item.name}`);
                }
            }
            return count;
        } catch (error) {
            console.error(`Error counting sublist in directory ${dir}: ${error.message}`);
            return 0;
        }
    }

    async function getRecentPosts() {
    const recentPosts = [];
    try {
        const allFiles = await getAllMarkdownFiles();
        const metadataMap = new Map();

        for (const file of allFiles) {
            const jsonUrl = `${file.dir}/index.json`;

            const response = await fetch(jsonUrl);

            if (!response.ok) {
                console.error(`Error fetching JSON for ${file.dir}: ${response.status} ${response.statusText}`);
                continue;
            }

            let metadata;
            try {
                metadata = await response.json();
            } catch (error) {
                console.error(`Error parsing JSON for ${file.dir}: ${error.message}`);
                continue;
            }

            metadata.forEach(item => {
                if (item.type === 'file' && item.name.endsWith('.md')) {
                    const date = new Date(item.date);
                    const filePath = `${file.dir}/${item.name}`;

                    // Simpan metadata ke dalam Map untuk menghindari duplikasi
                    if (!metadataMap.has(filePath)) {
                        metadataMap.set(filePath, {
                            name: item.name,
                            dir: file.dir,
                            date: date
                        });
                    }
                }
            });
        }

        // Mengubah Map ke array dan mengurutkan berdasarkan tanggal terbaru
        const sortedFiles = Array.from(metadataMap.values()).sort((a, b) => b.date - a.date);

        // Ambil 3 artikel terbaru
        return sortedFiles.slice(0, 3);
    } catch (error) {
        console.error('Error fetching recent posts: ', error.message);
    }
    return recentPosts;
}
    
        function getRandomPostForToday(allFiles) {
        const today = new Date();
        const dayOfYear = Math.floor((today - new Date(today.getFullYear(), 0, 0)) / 1000 / 60 / 60 / 24); // Menghitung hari ke berapa dalam setahun
        const randomIndex = dayOfYear % allFiles.length; // Menggunakan modulus agar selalu mendapatkan artikel berbeda setiap hari
        return allFiles[randomIndex];
    }

    // Load the initial page based on URL parameters
    const params = new URLSearchParams(window.location.search);
    const initialPage = params.get('page') || 'konten/beranda.md';
    loadMarkdown(initialPage);

    // Create the sidebar list
    createSidebarList('konten', sidebarContent);

    // Search functionality
    searchBox.addEventListener('input', async function () {
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
                searchBox.value = ''; // Clear the search input
                searchResults.innerHTML = ''; // Clear the search results
            });
            resultItem.appendChild(resultLink);
            searchResults.appendChild(resultItem);
        });
    });
});

