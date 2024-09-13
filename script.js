document.addEventListener("DOMContentLoaded", function () {
  // Inisialisasi markdown-it
  const md = window.markdownit();

  // Daftar artikel tanpa kategori
  const articles = [
    { title: "Beranda", file: "markdown/beranda.md", slug: "beranda" }
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
        { title: "Trinitas", file: "markdown/trinitas.md", slug: "trinitas" },
        { title: "Kekudusan", file: "markdown/kekudusan.md", slug: "kekudusan" }
      ]
    }
  ];

  const articleList = document.getElementById("article-list");
  const mainContent = document.getElementById("main-content");

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

  // Seleksi semua elemen <p> di dalam konten utama
  const paragraphs = mainContent.querySelectorAll("p");

  paragraphs.forEach(paragraph => {
    // Pastikan tidak ada elemen <img> di dalam <p> sebelum menerapkan linkify
    if (!paragraph.querySelector("img")) {
      let text = paragraph.innerHTML;

      // Hanya terapkan linkify pada teks di dalam elemen <p>
      for (const [keyword, slug] of Object.entries(keywords)) {
        const regex = new RegExp(`\\b${keyword}\\b`, "gi");
        text = text.replace(regex, `<a href="#${slug}" class="keyword-link">${keyword}</a>`);
      }

      paragraph.innerHTML = text;  // Ganti isi <p> dengan teks yang sudah di-linkify
    }
  });

  // Tambahkan event listener ke link yang dihasilkan oleh linkify
  const keywordLinks = mainContent.querySelectorAll(".keyword-link");
  keywordLinks.forEach(link => {
    link.addEventListener("click", function (event) {
      event.preventDefault();
      const slug = this.getAttribute("href").replace("#", "");

      // Scroll ke atas terlebih dahulu
      window.scrollTo(0, 0);

      // Setelah scroll, muat artikel berdasarkan slug
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

    // Tampilkan pesan jika artikel tidak ditemukan
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

    // Expand/collapse kategori
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

    // Scroll ke atas terlebih dahulu
    window.scrollTo(0, 0);

    // Muat markdown setelah scroll
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

        // Terapkan linkify hanya pada elemen <p>
        linkifyContent();

        if (category) {
          const categoryInfo = document.createElement("div");
          categoryInfo.innerHTML = `Termasuk dalam kategori: <a href="#" class="category-link">${category}</a>`;
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

  // Muat artikel berdasarkan hash di URL
  const currentHash = window.location.hash.replace("#", "");
  if (currentHash) {
    loadArticleBySlug(currentHash);
  } else {
    window.location.hash = "beranda";
    loadMarkdown("markdown/beranda.md");
  }
});
