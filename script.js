document.addEventListener("DOMContentLoaded", function () {
  // Inisialisasi markdown-it
  const md = window.markdownit();

  // Daftar artikel tanpa kategori
  const articles = [
    { title: "Beranda", file: "markdown/beranda.md", category: "Beranda", slug: "beranda" }
  ];

  // Daftar kategori dan artikel
  const categories = [
    {
      title: "Entitas",
      articles: [
        { title: "Mesias", file: "markdown/mesias.md", slug: "mesias" },
        { title: "Sidang Ilahi", file: "markdown/sidang_ilahi.md", slug: "sidang_ilahi" }
      ]
    },
    {
      title: "Istilah",
      articles: [
        { title: "Ziz", file: "markdown/ziz.md", slug: "ziz" },
        { title: "Kekudusan", file: "markdown/kekudusan.md", slug: "kekudusan" },
        { title: "Kekudusan Tuhan", file: "markdown/kekudusan_tuhan.md", slug: "kekudusan_tuhan" }
      ]
    }
  ];

  const articleList = document.getElementById("article-list");
  const mainContent = document.getElementById("main-content");

  // Fungsi untuk memperbarui atau menambahkan meta tag SEO
  function updateMetaTags(title, description, keywords) {
    document.title = title;

    let metaDescription = document.querySelector("meta[name='description']");
    if (!metaDescription) {
      metaDescription = document.createElement("meta");
      metaDescription.name = "description";
      document.head.appendChild(metaDescription);
    }
    metaDescription.content = description;

    let metaKeywords = document.querySelector("meta[name='keywords']");
    if (!metaKeywords) {
      metaKeywords = document.createElement("meta");
      metaKeywords.name = "keywords";
      document.head.appendChild(metaKeywords);
    }
    metaKeywords.content = keywords;
  }

  // Fungsi untuk mendapatkan semua kata kunci dari artikel
  function getKeywords() {
    const keywords = {};

    // Tambahkan kata kunci dari artikel tanpa kategori
    articles.forEach(article => {
      keywords[article.title] = article.slug;
    });

    // Tambahkan kata kunci dari kategori
    categories.forEach(category => {
      category.articles.forEach(article => {
        keywords[article.title] = article.slug;
      });
    });

    return keywords;
  }

  // Fungsi untuk mengganti kata kunci dengan link secara otomatis (case-insensitive)
  function linkifyContent() {
    const keywords = getKeywords();
    const paragraphs = mainContent.querySelectorAll("p");

    // Urutkan kata kunci berdasarkan panjang (dari yang terpanjang ke terpendek)
    const sortedKeywords = Object.entries(keywords).sort((a, b) => b[0].length - a[0].length);

    paragraphs.forEach(paragraph => {
      if (!paragraph.querySelector("img")) {
        let text = paragraph.innerHTML;

        // Lakukan replacement berdasarkan urutan yang sudah di-sort
        sortedKeywords.forEach(([keyword, slug]) => {
          const regex = new RegExp(`(?<!>)\\b${keyword}\\b(?!<)`, "gi");
          text = text.replace(regex, `<a href="#${slug}" class="keyword-link">${keyword}</a>`);
        });

        paragraph.innerHTML = text;
      }
    });

    const keywordLinks = mainContent.querySelectorAll(".keyword-link");
    keywordLinks.forEach(link => {
      link.addEventListener("click", function (event) {
        event.preventDefault();
        const slug = this.getAttribute("href").replace("#", "");
        window.scrollTo(0, 0);
        loadArticleBySlug(slug);
      });
    });
  }


  // Fungsi memuat artikel berdasarkan slug
  function loadArticleBySlug(slug) {
    let articleFound = false;

    // Cari di artikel tanpa kategori
    articles.forEach(article => {
      if (article.slug === slug) {
        loadMarkdown(article.file, article.category);
        articleFound = true;
      }
    });

    // Cari di kategori
    if (!articleFound) {
      categories.forEach(category => {
        category.articles.forEach(article => {
          if (article.slug === slug) {
            loadMarkdown(article.file, category.title);
            articleFound = true;
          }
        });
      });
    }

    if (!articleFound) {
      mainContent.innerHTML = `<h2>Artikel tidak ditemukan</h2>`;
    }
  }

  // Fungsi untuk membuat item daftar artikel
  function createArticleItem(article, category) {
    const li = document.createElement("li");
    const a = document.createElement("a");
    a.textContent = article.title;
    a.href = `#${article.slug}`;
    a.dataset.file = article.file;
    a.dataset.category = category;
    a.dataset.slug = article.slug;
    a.addEventListener("click", lazyLoadArticle);
    li.appendChild(a);
    return li;
  }

  // Tambahkan artikel tanpa kategori ke daftar
  articles.forEach(article => {
    articleList.appendChild(createArticleItem(article, article.category));
  });

  // Membuat headlist kategori dan sublist-nya
  const liHeadCategory = document.createElement("li");
  const headCategoryTitle = document.createElement("span");
  headCategoryTitle.textContent = "> Kategori";
  liHeadCategory.appendChild(headCategoryTitle);

  const ulCategoryList = document.createElement("ul");
  ulCategoryList.classList.add("hidden");
  articleList.appendChild(liHeadCategory);
  articleList.appendChild(ulCategoryList);

  // Membuat item untuk setiap kategori dan artikel di dalamnya
  categories.forEach(category => {
    const liCategory = document.createElement("li");
    const categoryTitle = document.createElement("span");
    categoryTitle.textContent = `> ${category.title}`;
    liCategory.appendChild(categoryTitle);

    const ulSublist = document.createElement("ul");
    ulSublist.classList.add("hidden");

    category.articles.forEach(article => {
      ulSublist.appendChild(createArticleItem(article, category.title));
    });

    liCategory.appendChild(ulSublist);
    ulCategoryList.appendChild(liCategory);

    categoryTitle.addEventListener("click", () => {
      ulSublist.classList.toggle("hidden");
      liCategory.classList.toggle("expanded");
      categoryTitle.textContent = liCategory.classList.contains("expanded")
        ? `v ${category.title}`
        : `> ${category.title}`;
    });
  });

  // Expand/collapse daftar kategori
  headCategoryTitle.addEventListener("click", () => {
    ulCategoryList.classList.toggle("hidden");
    liHeadCategory.classList.toggle("expanded");
    headCategoryTitle.textContent = liHeadCategory.classList.contains("expanded")
      ? "v Kategori"
      : "> Kategori";
  });

  // Fungsi lazy load artikel
  function lazyLoadArticle(event) {
    event.preventDefault();
    const { file, category, slug } = event.target.dataset;
    window.scrollTo(0, 0);
    window.location.hash = slug;
    loadMarkdown(file, category);
  }

  // Fungsi untuk memuat dan menampilkan markdown
  function loadMarkdown(file, category) {
    fetch(file)
      .then(response => response.text())
      .then(text => {
        const renderedContent = md.render(text);
        mainContent.innerHTML = renderedContent;
        linkifyContent();

        const articleTitle = mainContent.querySelector("h1") ? mainContent.querySelector("h1").textContent : file;

        let articleDescription = "";
        const firstH2 = mainContent.querySelector("h2");
        if (firstH2) {
          const nextParagraph = firstH2.nextElementSibling;
          if (nextParagraph && nextParagraph.tagName.toLowerCase() === "p") {
            articleDescription = nextParagraph.textContent.substring(0, 150);
          }
        }

        const articleKeywords = category ? category : "artikel, ensiklopedia, istilah";
        updateMetaTags(articleTitle, articleDescription, articleKeywords);

        if (category) {
          const categoryInfo = document.createElement("div");
          categoryInfo.innerHTML = `kategori: <a href="#" class="category-link">${category}</a>`;
          mainContent.appendChild(categoryInfo);

          const categoryLink = categoryInfo.querySelector(".category-link");
          categoryLink.addEventListener("click", (e) => {
            e.preventDefault();
            showCategoryArticles(category);
          });
        }
      })
      .catch(error => console.error("Error loading markdown:", error));
  }

  // Tampilkan daftar artikel berdasarkan kategori
  function showCategoryArticles(categoryTitle) {
    mainContent.innerHTML = `<h2>Daftar Artikel dalam Kategori: ${categoryTitle}</h2>`;
    const ulCategoryArticles = document.createElement("ul");

    categories.forEach(category => {
      if (category.title === categoryTitle) {
        category.articles.forEach(article => {
          ulCategoryArticles.appendChild(createArticleItem(article, category.title));
        });
      }
    });

    mainContent.appendChild(ulCategoryArticles);
  }

//======================================

  // Tambahkan elemen pencarian di atas main-content
  const searchContainer = document.createElement("div");
  searchContainer.innerHTML = `
    <input type="text" id="search-input" placeholder="Cari artikel...">
    <div id="search-results" class="hidden"></div>
  `;
  mainContent.parentNode.insertBefore(searchContainer, mainContent);

  // Fungsi untuk menangani pencarian artikel
  function searchArticles(query) {
    const results = [];

    // Cari di artikel tanpa kategori
    articles.forEach(article => {
      if (article.title.toLowerCase().includes(query.toLowerCase())) {
        results.push(article);
      }
    });

    // Cari di kategori
    categories.forEach(category => {
      category.articles.forEach(article => {
        if (article.title.toLowerCase().includes(query.toLowerCase())) {
          results.push(article);
        }
      });
    });

    return results;
  }

  // Fungsi untuk menampilkan hasil pencarian
  function displaySearchResults(query) {
    const searchResults = document.getElementById("search-results");
    const results = searchArticles(query);
    searchResults.innerHTML = ""; // Kosongkan hasil pencarian sebelumnya

    if (results.length === 0) {
      searchResults.innerHTML = `<p>Tidak ada artikel yang ditemukan.</p>`;
    } else {
      const ul = document.createElement("ul");
      results.forEach(article => {
        const li = document.createElement("li");
        const a = document.createElement("a");
        a.textContent = article.title;
        a.href = `#${article.slug}`;
        a.addEventListener("click", (event) => {
          event.preventDefault();
          loadArticleBySlug(article.slug);
          searchResults.classList.add("hidden"); // Sembunyikan hasil setelah artikel dibuka
        });
        li.appendChild(a);
        ul.appendChild(li);
      });
      searchResults.appendChild(ul);
    }

    searchResults.classList.remove("hidden");
  }

  // Event listener untuk pencarian saat pengguna mengetik
  document.getElementById("search-input").addEventListener("input", () => {
    const query = document.getElementById("search-input").value;
    if (query.length > 2) {
      displaySearchResults(query);
    } else {
      document.getElementById("search-results").classList.add("hidden");
    }
  });


  // Muat artikel berdasarkan hash di URL
  const currentHash = window.location.hash.replace("#", "");
  if (currentHash) {
    loadArticleBySlug(currentHash);
  } else {
    window.location.hash = "beranda";
    loadMarkdown("markdown/beranda.md");
  }
});
