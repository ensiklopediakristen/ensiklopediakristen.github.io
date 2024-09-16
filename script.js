document.addEventListener("DOMContentLoaded", async function() {
  const md = window.markdownit();
  let articles = [],
    categories = [];
  const articleList = document.getElementById("article-list");
  const mainContent = document.getElementById("main-content");
  async function loadData() {
    try {
      const response = await fetch('index.json');
      const data = await response.json();
      articles = data.articles;
      categories = data.categories;
      populateArticleList();
      // Cek apakah ada hash di URL (misalnya #slug)
      const currentHash = window.location.hash.replace("#", "") || "beranda";
      // Muat artikel berdasarkan hash, atau default ke beranda
      loadArticleBySlug(currentHash);
      window.addEventListener("hashchange", () => {
        const slug = window.location.hash.replace("#", "");
        loadArticleBySlug(slug);
      });
    } catch (error) {
      console.error("Error loading data:", error);
    }
  }

  function getArticleDetails(file) {
    return fetch(file)
      .then(response => response.text())
      .then(text => {
        const renderedContent = md.render(text);
        const tempDiv = document.createElement("div");
        tempDiv.innerHTML = renderedContent;
        // Ambil judul (h1)
        const title = tempDiv.querySelector("h1") ? tempDiv.querySelector("h1").textContent : "Judul tidak tersedia";
        // Ambil gambar pertama (img)
        const img = tempDiv.querySelector("img") ? tempDiv.querySelector("img").src : null;
        // Ambil excerpt (15 kata dari paragraf pertama di bawah h2)
        let excerpt = "";
        const firstH2 = tempDiv.querySelector("h2");
        if (firstH2) {
          const nextParagraph = firstH2.nextElementSibling;
          if (nextParagraph && nextParagraph.tagName.toLowerCase() === "p") {
            const words = nextParagraph.textContent.split(" ").slice(0, 15).join(" ");
            excerpt = words + "...";
          }
        }
        return {
          title,
          img,
          excerpt
        };
      });
  }
  // Fungsi untuk memperbarui atau menambahkan meta tag SEO
  function updateMetaTags(title, description, keywords) {
    document.title = title;
    ['description', 'keywords'].forEach(name => {
      updateMeta(name, name === 'description' ? description : keywords);
    });
  }

  function updateMeta(name, content) {
    let metaTag = document.querySelector(`meta[name='${name}']`);
    if (!metaTag) {
      metaTag = document.createElement("meta");
      metaTag.name = name;
      document.head.appendChild(metaTag);
    }
    metaTag.content = content;
  }
  // Fungsi untuk mengganti kata kunci dengan link secara otomatis
  function linkifyContent() {
    const keywords = getKeywords();
    const sortedKeywords = Object.entries(keywords).sort((a, b) => b[0].length - a[0].length);
    const paragraphs = mainContent.querySelectorAll("p:not(:has(img))");
    const linksSet = new Set();
    paragraphs.forEach(paragraph => {
      let text = paragraph.innerHTML;
      sortedKeywords.forEach(([keyword, slug]) => {
        const regex = new RegExp(`(?<!>)\\b${keyword}\\b(?!<)`, "gi");
        if (regex.test(text)) linksSet.add(`${keyword}#${slug}`);
        text = text.replace(regex, `<a href="#${slug}" class="keyword-link">${keyword}</a>`);
        window.scrollTo(0, 0);
      });
      paragraph.innerHTML = text;
    });
    displayInternalLinks(linksSet);
    document.querySelectorAll(".keyword-link").forEach(link => {
      link.addEventListener("click", event => {
        event.preventDefault();
        loadArticleBySlug(link.getAttribute("href").replace("#", ""));
      });
    });
  }
  // Fungsi untuk menampilkan tautan internal di bawah artikel
  function displayInternalLinks(linksSet) {
    if (linksSet.size > 0) {
      const linksContainer = document.createElement("div");
      linksContainer.innerHTML = "<h3>Tautan Internal</h3>";
      const ulLinks = document.createElement("ul");
      linksSet.forEach(link => {
        const [keyword, slug] = link.split('#');
        const li = document.createElement("li");
        const a = document.createElement("a");
        a.textContent = keyword;
        a.href = `#${slug}`;
        a.addEventListener("click", function(event) {
          event.preventDefault();
          window.scrollTo(0, 0);
          loadArticleBySlug(slug);
        });
        li.appendChild(a);
        ulLinks.appendChild(li);
      });
      linksContainer.appendChild(ulLinks);
      mainContent.appendChild(linksContainer);
    }
  }
  // Fungsi untuk mendapatkan semua kata kunci dari artikel
  function getKeywords() {
    const keywords = {};
    [...articles, ...categories.flatMap(category => category.articles)]
    .forEach(article => keywords[article.title] = article.slug);
    return keywords;
  }
  async function loadArticleBySlug(slug) {
    const article = articles.find(article => article.slug === slug) ||
      categories.flatMap(category => category.articles).find(article => article.slug === slug);
    if (article) {
      await loadMarkdown(article.file, article.title, article.category, slug);
      // Set hash in the URL to the article slug
      window.location.hash = slug;
    } else {
      mainContent.innerHTML = `<h2>Artikel tidak ditemukan</h2>`;
      updateMetaTags("Artikel tidak ditemukan", "Artikel tidak ditemukan", "404, tidak ditemukan");
    }
  }
  // Fungsi untuk memuat dan menampilkan markdown
  async function loadMarkdown(file, title, category, slug) {
    try {
      const response = await fetch(file);
      const text = await response.text();
      mainContent.innerHTML = md.render(text);
      linkifyContent();
      if (slug !== "beranda" && category) {
        const categoryInfo = document.createElement("div");
        categoryInfo.innerHTML = `Artikel ini dalam kategori: <a href="#" class="category-link">${category}</a>`;
        mainContent.appendChild(categoryInfo);
        categoryInfo.querySelector(".category-link").addEventListener("click", (e) => {
          e.preventDefault();
          showCategoryArticles(category);
        });
      }
      const description = text.split('\n')[0].substring(0, 50);
      updateMetaTags(title, description, `${title}, ${category}`);
      // Jika halaman beranda, tampilkan artikel terbaru dengan pagination
      if (file === "beranda.md") {
        displayArticlesByPage(1); // Tampilkan artikel terbaru di halaman 1
      }
    } catch (error) {
      console.error("Error loading markdown:", error);
    }
  }
  // Fungsi untuk menampilkan artikel terbaru dengan pagination
  function getRecentArticles(page = 1, articlesPerPage = 15) {
    const allArticles = getAllArticlesExcludingHome();
    const filteredArticles = allArticles.filter(article => article.file !== "beranda.md");
    filteredArticles.sort((a, b) => new Date(b.date) - new Date(a.date));
    const startIndex = (page - 1) * articlesPerPage;
    const endIndex = startIndex + articlesPerPage;
    return {
      articles: filteredArticles.slice(startIndex, endIndex),
      totalPages: Math.ceil(filteredArticles.length / articlesPerPage),
    };
  }
  async function displayArticlesByPage(page) {
    const {
      articles: recentArticles,
      totalPages
    } = getRecentArticles(page);
    // Clear main content area
    mainContent.innerHTML = "";
    // Tampilkan konten beranda hanya pada halaman 1
    if (page === 1) {
      const homeArticle = articles.find(article => article.slug === "beranda");
      if (homeArticle) {
        try {
          const response = await fetch(homeArticle.file);
          const homeMarkdown = await response.text();
          const homeContent = md.render(homeMarkdown);
          // Buat kontainer untuk konten beranda
          const homeDiv = document.createElement("div");
          homeDiv.innerHTML = homeContent;
          mainContent.appendChild(homeDiv); // Tambahkan konten beranda ke main content
        } catch (error) {
          console.error("Error loading beranda:", error);
        }
      }
    }
    // Create the recent articles section
    const recentArticlesList = document.createElement("div");
    recentArticlesList.innerHTML = `<h2>Artikel Terbaru</h2>`;
    const ul = document.createElement("ul");
    ul.classList.add("recent-articles");
    // Display paginated articles
    recentArticles.forEach(article => {
      getArticleDetails(article.file).then(details => {
        const li = document.createElement("li");
        const titleElement = document.createElement("h3");
        titleElement.textContent = details.title;
        li.appendChild(titleElement);
        if (details.img) {
          const imgElement = document.createElement("img");
          imgElement.src = details.img;
          imgElement.alt = details.title;
          imgElement.style.width = "100px";
          imgElement.style.margin = "0";
          li.appendChild(imgElement);
        }
        const excerptElement = document.createElement("p");
        excerptElement.textContent = details.excerpt;
        li.appendChild(excerptElement);
        const linkElement = document.createElement("a");
        linkElement.textContent = "Baca Selengkapnya";
        linkElement.href = `#${article.slug}`;
        linkElement.addEventListener("click", (event) => {
          event.preventDefault();
          loadArticleBySlug(article.slug);
          window.scrollTo(0, 0);
        });
        li.appendChild(linkElement);
        ul.appendChild(li);
      });
    });
    recentArticlesList.appendChild(ul);
    mainContent.appendChild(recentArticlesList);
    displayPagination(page, totalPages);
  }
  
  //menampilkan pagination
  function displayPagination(currentPage, totalPages) {
    const paginationDiv = document.createElement("div");
    paginationDiv.classList.add("pagination");

    const maxPageLinks = 10; // Maksimal 10 nomor halaman di tengah

    // Tombol "Sebelumnya"
    if (currentPage > 1) {
        const prevLink = document.createElement("a");
        prevLink.textContent = "sebelumnya";
        prevLink.href = `#page-${currentPage - 1}`;
        prevLink.addEventListener("click", (event) => {
            event.preventDefault();
            displayArticlesByPage(currentPage - 1);
            window.scrollTo(0, 0);
        });
        paginationDiv.appendChild(prevLink);
    }

    // Tautan halaman pertama
    const firstPageLink = document.createElement("a");
    firstPageLink.textContent = 1;
    firstPageLink.href = `#page-1`;
    if (currentPage === 1) {
        firstPageLink.classList.add("active");
        firstPageLink.style.fontWeight = "bold";
    }
    firstPageLink.addEventListener("click", (event) => {
        event.preventDefault();
        displayArticlesByPage(1);
        window.scrollTo(0, 0);
    });
    paginationDiv.appendChild(firstPageLink);

    // Tampilkan "..." jika ada gap antara halaman 1 dan halaman pertama dalam rentang
    if (currentPage > Math.floor(maxPageLinks / 2) + 1) {
        const dotsLink = document.createElement("span");
        dotsLink.textContent = "...";
        paginationDiv.appendChild(dotsLink);
    }

    // Hitung rentang halaman yang akan ditampilkan di tengah
    let startPage = Math.max(2, currentPage - Math.floor(maxPageLinks / 2));
    let endPage = Math.min(totalPages - 1, currentPage + Math.floor(maxPageLinks / 2));

    // Pastikan jumlah halaman yang ditampilkan tidak melebihi maxPageLinks
    if (currentPage <= Math.floor(maxPageLinks / 2)) {
        endPage = Math.min(totalPages - 1, maxPageLinks);
    } else if (currentPage + Math.floor(maxPageLinks / 2) >= totalPages) {
        startPage = Math.max(2, totalPages - maxPageLinks);
    }

    // Tautan halaman di tengah
    for (let i = startPage; i <= endPage; i++) {
        const pageLink = document.createElement("a");
        pageLink.textContent = i;
        pageLink.href = `#page-${i}`;
        if (i === currentPage) {
            pageLink.classList.add("active");
            pageLink.style.fontWeight = "bold";
        }
        pageLink.addEventListener("click", (event) => {
            event.preventDefault();
            displayArticlesByPage(i);
            window.scrollTo(0, 0);
        });
        paginationDiv.appendChild(pageLink);
    }
    // Tampilkan "..." jika ada gap antara halaman terakhir dalam rentang dan halaman terakhir secara keseluruhan
    if (endPage < totalPages - 1) {
        const dotsLink = document.createElement("span");
        dotsLink.textContent = "...";
        paginationDiv.appendChild(dotsLink);
    }
    // Tautan halaman terakhir
    const lastPageLink = document.createElement("a");
    lastPageLink.textContent = totalPages;
    lastPageLink.href = `#page-${totalPages}`;
    if (currentPage === totalPages) {
        lastPageLink.classList.add("active");
        lastPageLink.style.fontWeight = "bold";
    }
    lastPageLink.addEventListener("click", (event) => {
        event.preventDefault();
        displayArticlesByPage(totalPages);
        window.scrollTo(0, 0);
    });
    paginationDiv.appendChild(lastPageLink);

    // Tombol "Berikutnya"
    if (currentPage < totalPages) {
        const nextLink = document.createElement("a");
        nextLink.textContent = "berikutnya";
        nextLink.href = `#page-${currentPage + 1}`;
        nextLink.addEventListener("click", (event) => {
            event.preventDefault();
            displayArticlesByPage(currentPage + 1);
            window.scrollTo(0, 0);
        });
        paginationDiv.appendChild(nextLink);
    }

    mainContent.appendChild(paginationDiv);
}
  // Fungsi untuk mendapatkan semua artikel kecuali beranda
  function getAllArticlesExcludingHome() {
    const allArticles = [...articles];
    categories.forEach(category => {
      allArticles.push(...category.articles);
    });
    return allArticles.filter(article => article.file !== "beranda.md");
  }
  // Fungsi untuk menampilkan daftar artikel berdasarkan kategori
  function showCategoryArticles(categoryTitle) {
    mainContent.innerHTML = `<h2>Daftar Artikel dalam Kategori: ${categoryTitle}</h2>`;
    const ulCategoryArticles = document.createElement("ul");
    categories.find(category => category.title === categoryTitle)
      .articles.forEach(article => ulCategoryArticles.appendChild(createArticleItem(article, categoryTitle)));
    mainContent.appendChild(ulCategoryArticles);
  }
  // Fungsi untuk membuat item daftar artikel 
  function createArticleItem(article, category) {
    const li = document.createElement("li");
    li.innerHTML = `<a href="#${article.slug}" data-file="${article.file}" data-category="${category}" data-slug="${article.slug}">${article.title}</a>`;
    li.querySelector("a").addEventListener("click", lazyLoadArticle);
    return li;
  }
  // Fungsi untuk mengisi daftar artikel
  function populateArticleList() {
    // Kosongkan terlebih dahulu daftar artikel sebelum diisi
    articleList.innerHTML = "";
    // Muat artikel beranda di bagian atas
    const homeArticle = articles.find(article => article.slug === "beranda");
    if (homeArticle) {
      const liHomeArticle = createArticleItem(homeArticle, homeArticle.category);
      articleList.appendChild(liHomeArticle);
    }
    // Hitung jumlah total artikel
    const totalArticles = articles.length + categories.reduce((sum, category) => sum + category.articles.length, 0) - 1;
    // Tambahkan artikel lain di bawah artikel beranda
    articles
      .filter(article => article.slug !== "beranda") // Artikel selain beranda
      .forEach(article => articleList.appendChild(createArticleItem(article, article.category)));
    setupCategoryList(totalArticles);
  }
  // Fungsi untuk lazy load artikel
  function lazyLoadArticle(event) {
    event.preventDefault();
    const {
      file,
      category,
      slug
    } = event.target.dataset;
    window.scrollTo(0, 0);
    window.location.hash = slug;
    loadMarkdown(file, event.target.textContent, category, slug);
  }
  // Fungsi untuk mengisi daftar artikel
  function populateArticleList() {
    const totalArticles = articles.length + categories.reduce((sum, category) => sum + category.articles.length, 0) - 1;
    articles.forEach(article => articleList.appendChild(createArticleItem(article, article.category)));
    setupCategoryList(totalArticles);
  }
  // Fungsi untuk mengatur daftar kategori
  function setupCategoryList(totalArticles) {
    const liHeadCategory = document.createElement("li");
    liHeadCategory.innerHTML = `<span>> Kategori (${totalArticles})</span>`;
    const ulCategoryList = document.createElement("ul");
    ulCategoryList.classList.add("hidden");
    articleList.appendChild(liHeadCategory);
    articleList.appendChild(ulCategoryList);
    categories.forEach(category => {
      const liCategory = document.createElement("li");
      liCategory.innerHTML = `<span>> ${category.title} (${category.articles.length})</span>`;
      const ulSublist = document.createElement("ul");
      ulSublist.classList.add("hidden");
      category.articles.forEach(article => ulSublist.appendChild(createArticleItem(article, category.title)));
      liCategory.appendChild(ulSublist);
      ulCategoryList.appendChild(liCategory);
      liCategory.querySelector("span").addEventListener("click", () => {
        ulSublist.classList.toggle("hidden");
        liCategory.classList.toggle("expanded");
        liCategory.querySelector("span").textContent = liCategory.classList.contains("expanded") ?
          `v ${category.title} (${category.articles.length})` :
          `> ${category.title} (${category.articles.length})`;
      });
    });
    liHeadCategory.querySelector("span").addEventListener("click", () => {
      ulCategoryList.classList.toggle("hidden");
      liHeadCategory.classList.toggle("expanded");
      liHeadCategory.querySelector("span").textContent = liHeadCategory.classList.contains("expanded") ?
        `v Kategori (${totalArticles})` :
        `> Kategori (${totalArticles})`;
    });
  }
  // Mulai memuat data setelah halaman siap
  await loadData();
});
