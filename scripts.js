// Variabel global untuk menyimpan data artikel lengkap
let globalData = {};
let articleData = {};
let filteredArticles = [];
let articleContentCache = {}; // Cache untuk menyimpan konten markdown
let currentPage = 1;
const articlesPerPage = 15;
// Fungsi untuk menangani perubahan hash URL
window.addEventListener('DOMContentLoaded', async () => {
  await loadData();
  handleHashChange(); // Tambahkan fungsi untuk menangani perubahan hash
});
window.addEventListener('hashchange', handleHashChange);
function handleHashChange() {
  const hash = window.location.hash.substring(1);
  if (hash) {
    const articleFile = Object.keys(articleData).find(file => file.includes(hash));
    if (articleFile) {
      if (!articleContentCache[articleFile]) {
        loadArticleData(articleData[articleFile]).then(() => {
          renderArticleContent(articleFile);
        });
      } else {
        renderArticleContent(articleFile);
      }
    }
  } else {
    backToList();
  }
}
let isArticleOpen = false; // Tambahkan variabel global
function renderHero() {
  const heroSection = document.getElementById('heroSection');
  const selectedCategory = document.getElementById('categorySelect').value;
  // Hero hanya ditampilkan di halaman pertama, saat kategori 'All', dan saat artikel tidak dibuka
  if (currentPage === 1 && selectedCategory === 'all' && !isArticleOpen) {
    heroSection.style.display = 'block';
    heroSection.innerHTML = `
      <div class="hero-content">
        <h2>Selamat Datang di</h2>
        <h1>Ensiklopedia Kristen</h1>
        <h3>Pengetahuan Seputar Iman dan Sejarah Kristen</h3>
        <p><strong>Ensiklopedia Kristen</strong> adalah platform pengetahuan yang terbuka untuk memperdalam wawasan Anda tentang iman dan sejarah Kristen. Jelajahi artikel-artikel untuk memperkaya pemahaman bersama tentang ajaran dan tradisi Kristen.</p>
      </div>
    `;
  } else {
    heroSection.style.display = 'none'; // Sembunyikan hero jika artikel dibuka, kategori dipilih, atau bukan di page 1
  }
}
// Inisialisasi Markdown-It
const md = window.markdownit({
  linkify: true,
  typographer: true
});
// Fungsi untuk mengambil data dari file JSON
async function loadData() {
  try {
    const response = await fetch('data/data.json');
    globalData = await response.json();
    const filePaths = Object.entries(globalData).flatMap(([category, articles]) => articles.map(artikel => ({
      ...artikel,
      category,
      title: artikel.title // Tambahkan title dari file JSON
    })));
    await loadAllArticles(filePaths);
    filteredArticles = Object.values(articleData); // Inisialisasi filteredArticles
    loadCategories(); // Memuat kategori ke dropdown
    renderArticles(); // Tampilkan artikel
    renderPagination(); // Tampilkan pagination
  } catch (error) {
    console.error("Gagal mengambil data:", error);
  }
}
// Fungsi untuk mengambil semua artikel secara paralel
async function loadAllArticles(filePaths) {
  try {
    const fetchPromises = filePaths.map(article => loadArticleData(article));
    await Promise.all(fetchPromises);
  } catch (error) {
    console.error("Gagal memuat artikel:", error);
  }
}
// Fungsi untuk mengambil artikel dari file markdown
async function loadArticleData(article) {
  try {
    const response = await fetch(article.file);
    const content = await response.text();
    const htmlContent = md.render(content);
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlContent, "text/html");
    const title = doc.querySelector("h1")?.textContent || "Tidak ada judul";
    const image = doc.querySelector("img")?.getAttribute("src") || "Tidak ada gambar";
    const h2NextParagraph = doc.querySelector("h2 + p")?.textContent || "Tidak ada konten";
    const excerpt = h2NextParagraph.split(" ").slice(0, 10).join(" ") + "...";
    // Simpan konten markdown dalam cache
    articleContentCache[article.file] = content;
    articleData[article.file] = {
      title,
      image,
      excerpt,
      category: article.category,
      date: article.date,
      file: article.file // Pastikan file disimpan untuk pengecekan saat rendering
    };
  } catch (error) {
    console.error(`Gagal memuat artikel ${article.file}:`, error);
  }
}
// Load categories into the category select
function loadCategories() {
  const categories = Object.keys(globalData);
  const categorySelect = document.getElementById('categorySelect');
  categorySelect.innerHTML = '<option value="all">Semua Kategori</option>';
  categories.forEach(category => {
    const option = document.createElement('option');
    option.value = category;
    option.textContent = category;
    categorySelect.appendChild(option);
  });
}
// Filter articles by search term and category
function filterArticles() {
  const searchTerm = document.getElementById('searchInput').value.toLowerCase();
  const selectedCategory = document.getElementById('categorySelect').value;
  filteredArticles = applyFilter(searchTerm, selectedCategory);
  currentPage = 1;
  // Jika artikel sedang dibuka, tutup artikel dan kembali ke daftar
  if (isArticleOpen) {
    backToList();
  }
  // Sembunyikan hero section saat pencarian
  const heroSection = document.getElementById('heroSection');
  if (searchTerm) {
    heroSection.style.display = 'none';
  } else if (currentPage === 1 && selectedCategory === 'all' && !isArticleOpen) {
    heroSection.style.display = 'block';
  }
  renderArticles();
  renderPagination();
}
// Render articles on the current page
async function renderArticles() {
  const articleList = document.getElementById('articleList');
  if (!articleList) return;
  articleList.innerHTML = '';
  const sortedArticles = filteredArticles.sort((a, b) => new Date(b.date) - new Date(a.date));
  const start = (currentPage - 1) * articlesPerPage;
  const end = start + articlesPerPage;
  const currentArticles = sortedArticles.slice(start, end);
  renderHero();
  // Lazy load articles
  const lazyLoadPromises = currentArticles.map(article => {
    if (!articleContentCache[article.file]) {
      return loadArticleData(article); // Muat data artikel jika belum ada di cache
    }
    return Promise.resolve();
  });
  await Promise.all(lazyLoadPromises);
  currentArticles.forEach(article => {
    const articleItem = document.createElement('div');
    articleItem.classList.add('article-item');
    articleItem.innerHTML = `
         <a href="#" class="article-link" data-file="${article.file}">
            <div class="article-content">
               <img class="list-img" src="${article.image}" alt="${article.title}">
               <div class="article-info">
                  <h3>${article.title}</h3>
                  <p>${article.excerpt}</p>
               </div>
            </div>
         </a>
      `;
    articleItem.querySelector('a.article-link').addEventListener('click', (event) => {
      event.preventDefault();
      renderArticleContent(article.file);
    });
    articleList.appendChild(articleItem);
  });
}
// Fungsi untuk kembali ke daftar artikel
function backToList() {
  // Sembunyikan artikel dan tampilkan daftar artikel kembali
  document.getElementById('articleDisplay').style.display = 'none';
  document.getElementById('backToList').style.display = 'none';
  document.getElementById('articleList').style.display = 'block';
  document.getElementById('pagination').style.display = 'block';
  // Tampilkan hero lagi jika pada halaman pertama dan kategori "All"
  isArticleOpen = false; // Tandai bahwa artikel sudah tidak dibuka
  renderHero(); // Tampilkan hero jika syarat terpenuhi
  // Hapus hash URL ketika kembali ke daftar
  window.location.hash = '';
  // Scroll ke bagian atas halaman
  window.scrollTo(0, 0);
}
// Render pagination buttons
function renderPagination() {
  const pagination = document.getElementById('pagination');
  if (!pagination) return;
  pagination.innerHTML = ''; // Kosongkan pagination
  const totalPages = Math.ceil(filteredArticles.length / articlesPerPage);
  if (totalPages <= 1) return; // Tidak perlu pagination jika hanya ada 1 halaman
  // Fungsi pembantu untuk membuat tombol
  const createButton = (text, disabled, onclick) => {
    const button = document.createElement('button');
    button.textContent = text;
    button.disabled = disabled;
    button.onclick = onclick;
    return button;
  };
  // Tambahkan tombol 'Sebelumnya'
  pagination.appendChild(createButton('Sebelumnya', currentPage === 1, () => {
    currentPage--;
    renderArticles();
    renderPagination();
    window.scrollTo(0, 0); // Scroll ke atas halaman setelah berpindah halaman
  }));
  // Tambahkan tombol halaman pertama jika tidak di halaman pertama
  if (currentPage > 4) {
    pagination.appendChild(createButton('1', false, () => {
      currentPage = 1;
      renderArticles();
      renderPagination();
      window.scrollTo(0, 0);
    }));
    if (currentPage > 5) {
      const dots = document.createElement('span');
      dots.textContent = '...';
      pagination.appendChild(dots); // Tambahkan '...' jika ada lebih dari 5 halaman sebelum halaman saat ini
    }
  }
  // Tambahkan tombol halaman di sekitar halaman saat ini
  for (let i = Math.max(1, currentPage - 3); i <= Math.min(totalPages, currentPage + 3); i++) {
    pagination.appendChild(createButton(i, i === currentPage, () => {
      currentPage = i;
      renderArticles();
      renderPagination();
      window.scrollTo(0, 0); // Scroll ke atas halaman
    }));
  }
  // Tambahkan '...' sebelum halaman terakhir jika ada banyak halaman setelah halaman saat ini
  if (currentPage < totalPages - 4) {
    const dots = document.createElement('span');
    dots.textContent = '...';
    pagination.appendChild(dots);
  }
  // Tambahkan tombol halaman terakhir jika tidak di halaman terakhir
  if (currentPage < totalPages - 3) {
    pagination.appendChild(createButton(totalPages, false, () => {
      currentPage = totalPages;
      renderArticles();
      renderPagination();
      window.scrollTo(0, 0); // Scroll ke atas halaman
    }));
  }
  // Tambahkan tombol 'Berikutnya'
  pagination.appendChild(createButton('Berikutnya', currentPage === totalPages, () => {
    currentPage++;
    renderArticles();
    renderPagination();
    window.scrollTo(0, 0); // Scroll ke atas halaman
  }));
}
// Fungsi untuk filter berdasarkan kategori
function filterByCategory(category) {
  const categorySelect = document.getElementById('categorySelect');
  categorySelect.value = category;
  filterArticles();
  // Tutup artikel saat kategori baru dipilih
  backToList();
}
// Fungsi untuk menerapkan filter pada artikel berdasarkan pencarian dan kategori
function applyFilter(searchTerm, selectedCategory) {
  return Object.values(articleData).filter(article => {
    const matchSearch = article.title.toLowerCase().includes(searchTerm); // Hanya cocokkan dengan judul
    const matchCategory = selectedCategory === 'all' || article.category === selectedCategory;
    return matchSearch && matchCategory;
  });
}
// Event listener untuk tombol "Back to List"
document.getElementById('backToList').addEventListener('click', backToList);
// Event listener untuk pencarian dan pemilihan kategori
document.getElementById('searchInput').addEventListener('input', filterArticles);
document.getElementById('categorySelect').addEventListener('change', () => {
  filterArticles();
  backToList(); // Tutup artikel jika kategori dipilih
});
// Fungsi untuk menangani perubahan hash URL
window.addEventListener('hashchange', async () => {
  const hash = window.location.hash.substring(1);
  if (hash) {
    const articleFile = Object.keys(articleData).find(file => file.includes(hash));
    if (articleFile) {
      if (!articleContentCache[articleFile]) {
        await loadArticleData(articleData[articleFile]); // Muat artikel jika belum di-cache
      }
      renderArticleContent(articleFile);
    }
  } else {
    backToList(); // Jika hash kosong, kembali ke daftar artikel
  }
});
// Fungsi untuk mengubah kata-kata terkait menjadi link (linkify)
function linkifyContent(htmlContent) {
  const slugsAndTitles = Object.values(articleData).flatMap(article => {
    const slug = article.file.split('/').pop().replace('.md', '');
    return [slug, article.title];
  });
  // Urutkan berdasarkan panjang string (agar slug yang lebih panjang diprioritaskan)
  const sortedSlugsAndTitles = slugsAndTitles.sort((a, b) => b.length - a.length);
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlContent, 'text/html');
  const uniqueLinks = new Set();
  function escapeRegexCharacters(str) {
    // Escape semua karakter khusus yang bisa mempengaruhi regex
    return str.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
  }
  function linkifyTextNode(node) {
    const parentElement = node.parentElement;
    const text = node.textContent;
    const escapedSlugsAndTitles = sortedSlugsAndTitles.map(item => escapeRegexCharacters(item));
    const regex = new RegExp(`(${escapedSlugsAndTitles.join('|')})`, 'gi');
    if (regex.test(text)) {
      const replacedText = text.replace(regex, (match) => {
        const matchedArticle = Object.values(articleData).find(article => {
          const articleSlug = article.file.split('/').pop().replace('.md', '');
          return articleSlug.toLowerCase() === match.toLowerCase() || article.title.toLowerCase() === match.toLowerCase();
        });
        if (matchedArticle) {
          const encodedSlug = encodeURIComponent(matchedArticle.file.split('/').pop().replace('.md', ''));
          uniqueLinks.add(match.toLowerCase());
          return `<a href="#${encodedSlug}" class="linkify">${match}</a>`;
        }
        return match;
      });
      const span = document.createElement('span');
      span.innerHTML = replacedText;
      parentElement.replaceChild(span, node);
    }
  }
  function processElement(element) {
    if (element.tagName !== 'H1' && element.tagName !== 'H2' && element.tagName !== 'TH' && element.tagName !== 'IMG' && element.tagName !== 'BLOCKQUOTE') {
      Array.from(element.childNodes).forEach(child => {
        if (child.nodeType === Node.TEXT_NODE) {
          linkifyTextNode(child);
        } else if (child.nodeType === Node.ELEMENT_NODE) {
          processElement(child);
        }
      });
    }
  }
  processElement(doc.body);
  return {
    html: doc.body.innerHTML,
    links: [...uniqueLinks]
  };
}
// Fungsi untuk linkify list tautan internal
function linkifyInternalLinks(links) {
  const linksHtml = links.map(link => `<li>${link}</li>`).join('');
  const {
    html
  } = linkifyContent(`<ul>${linksHtml}</ul>`);
  return html;
}
// Fungsi untuk menampilkan konten artikel yang dirender berdasarkan file markdown
async function renderArticleContent(file) {
  try {
    let markdownContent;
    if (articleContentCache[file]) {
      markdownContent = articleContentCache[file];
    } else {
      const response = await fetch(file);
      markdownContent = await response.text();
      articleContentCache[file] = markdownContent; // Simpan ke cache
    }
    const {
      html,
      links
    } = linkifyContent(md.render(markdownContent));
    const article = articleData[file];
    document.title = article.title;
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute("content", article.excerpt);
    }
    const metaKeywords = document.querySelector('meta[name="keywords"]');
    if (metaKeywords) {
      metaKeywords.setAttribute("content", article.category);
    }
    const internalLinksHtml = linkifyInternalLinks(links);
    const articleDisplay = document.getElementById('articleDisplay');
    articleDisplay.innerHTML = `
      ${html}
      <div class="article-category">
        <p><strong>Kategori: </strong>
        <a href="#" id="categoryLink">${article.category}</a></p>
      </div>
      <div id="internalLinks">
        <h3>Tautan Internal</h3>
        ${internalLinksHtml}
      </div>
    `;
    articleDisplay.style.display = 'block';
    document.getElementById('articleList').style.display = 'none';
    document.getElementById('pagination').style.display = 'none';
    document.getElementById('heroSection').style.display = 'none';
    document.getElementById('backToList').style.display = 'block';
    const slug = encodeURIComponent(file.split('/').pop().replace('.md', ''));
    history.pushState(null, null, `#${slug}`);
    window.scrollTo(0, 0);
    isArticleOpen = true;
    const categoryLink = document.getElementById('categoryLink');
    if (categoryLink) {
      categoryLink.addEventListener('click', (event) => {
        event.preventDefault();
        filterByCategory(article.category);
      });
    }
  } catch (error) {
    console.error(`Gagal memuat konten artikel dari file ${file}:`, error);
  }
}
let debounceTimeout;
document.getElementById('searchInput').addEventListener('input', () => {
  clearTimeout(debounceTimeout);
  debounceTimeout = setTimeout(() => {
    filterArticles();
    backToList();
    const heroSection = document.getElementById('heroSection');
    if (document.getElementById('searchInput').value) {
      heroSection.style.display = 'none';
    } else if (!isArticleOpen && currentPage === 1 && document.getElementById('categorySelect').value === 'all') {
      heroSection.style.display = 'block';
    }
  }, 500); // Interval debounce lebih lama untuk optimasi
});
const worker = new Worker('worker.js');
worker.onmessage = function(event) {
  const {
    article,
    content
  } = event.data;
  if (content) {
    // Process and cache content
    articleContentCache[article.file] = content;
    renderArticles();
  }
};
function loadArticleDataWithWorker(article) {
  worker.postMessage(article);
}
async function preloadNextArticles() {
  const nextPage = currentPage + 1;
  const start = nextPage * articlesPerPage;
  const end = start + articlesPerPage;
  const nextArticles = filteredArticles.slice(start, end);
  const preloadPromises = nextArticles.map(article => {
    if (!articleContentCache[article.file]) {
      return loadArticleData(article);
    }
    return Promise.resolve();
  });
  await Promise.all(preloadPromises);
}