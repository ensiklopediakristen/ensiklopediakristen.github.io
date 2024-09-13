document.addEventListener("DOMContentLoaded", function () {
  // Inisialisasi markdown-it
  const md = window.markdownit();

  // Daftar artikel (contoh) dengan kategori terkait
  const articles = [
    { title: "Beranda", file: "markdown/beranda.md", category: null, path: "/" }
  ];

  // Daftar kategori dan artikel
  const categories = [
    {
      title: "Entitas",
      articles: [
        { title: "Mesias", file: "markdown/mesias.md", path: "/mesias" },
        { title: "Sidang Ilahi", file: "markdown/sidang_ilahi.md", path: "/sidang_ilahi" }
      ]
    },
    {
      title: "Istilah",
      articles: [
        { title: "Trinitas", file: "markdown/trinitas.md", path: "/trinitas" },
        { title: "Kekudusan", file: "markdown/kekudusan.md", path: "/kekudusan" }
      ]
    }
  ];

  const articleList = document.getElementById("article-list");
  const mainContent = document.getElementById("main-content");

  // Fungsi untuk memuat dan menampilkan konten markdown dan kategori terkait
  function loadMarkdown(file, category, path) {
    fetch(file)
      .then((response) => response.text())
      .then((text) => {
        mainContent.innerHTML = md.render(text);

        // Tambahkan kategori di bawah artikel yang dimuat
        if (category) {
          const categoryInfo = document.createElement("div");
          categoryInfo.innerHTML = `Termasuk dalam kategori: <a href="#" class="category-link">${category}</a>`;
          mainContent.appendChild(categoryInfo);

          // Tambahkan event listener untuk kategori yang diklik
          const categoryLink = categoryInfo.querySelector(".category-link");
          categoryLink.addEventListener("click", (e) => {
            e.preventDefault();
            showCategoryArticles(category);
          });
        }

        // Ubah URL tanpa reload halaman
        if (path) {
          history.pushState({ file, category }, null, path);
        }
      })
      .catch((error) => console.error("Error loading markdown:", error));
  }

  // Lazy load fungsi untuk memuat konten markdown hanya saat diperlukan
  function lazyLoadArticle(event) {
    event.preventDefault();
    const file = event.target.dataset.file;
    const category = event.target.dataset.category;
    const path = event.target.dataset.path;
    loadMarkdown(file, category, path);
  }

  // Fungsi untuk menampilkan artikel berdasarkan URL
  function loadArticleFromURL() {
    const currentPath = window.location.pathname;

    let articleFound = false;

    // Cek apakah path cocok dengan salah satu artikel
    articles.forEach((article) => {
      if (article.path === currentPath) {
        loadMarkdown(article.file, article.category, article.path);
        articleFound = true;
      }
    });

    // Jika belum ditemukan, cek artikel di dalam kategori
    if (!articleFound) {
      categories.forEach((category) => {
        category.articles.forEach((article) => {
          if (article.path === currentPath) {
            loadMarkdown(article.file, category.title, article.path);
            articleFound = true;
          }
        });
      });
    }

    // Jika artikel tidak ditemukan, load halaman default (Beranda)
    if (!articleFound) {
      loadMarkdown("markdown/beranda.md", null, "/");
    }
  }

  // Menampilkan daftar artikel dalam kategori
  function showCategoryArticles(categoryTitle) {
    mainContent.innerHTML = `<h2>Daftar Artikel dalam Kategori: ${categoryTitle}</h2>`;
    const ulCategoryArticles = document.createElement("ul");

    // Cari artikel dalam kategori yang sesuai
    categories.forEach((category) => {
      if (category.title === categoryTitle) {
        category.articles.forEach((article) => {
          const li = document.createElement("li");
          const a = document.createElement("a");
          a.textContent = article.title;
          a.href = article.path; // Gunakan path artikel
          a.dataset.file = article.file; // Lazy load file
          a.dataset.category = category.title; // Simpan informasi kategori
          a.dataset.path = article.path; // Simpan informasi path
          a.addEventListener("click", lazyLoadArticle); // Lazy load saat diklik
          li.appendChild(a);
          ulCategoryArticles.appendChild(li);
        });
      }
    });

    mainContent.appendChild(ulCategoryArticles);
  }

  // Memasukkan artikel 'Beranda' di luar kategori
  articles.forEach((article) => {
    const li = document.createElement("li");
    const a = document.createElement("a");
    a.textContent = article.title;
    a.href = article.path; // Gunakan path artikel
    a.dataset.file = article.file; // Lazy load file
    a.dataset.category = article.category; // Set kategori jika ada
    a.dataset.path = article.path; // Set path artikel
    a.addEventListener("click", lazyLoadArticle); // Lazy load saat diklik
    li.appendChild(a);
    articleList.appendChild(li);
  });

  // Membuat headlist untuk "Kategori" setelah 'Beranda'
  const liHeadCategory = document.createElement("li");
  const headCategoryTitle = document.createElement("span");
  headCategoryTitle.textContent = "> Kategori"; // Awalnya tanda ">" untuk headlist kategori yang belum di-expand
  liHeadCategory.appendChild(headCategoryTitle);

  // Sublist untuk menyimpan daftar kategori
  const ulCategoryList = document.createElement("ul");
  ulCategoryList.classList.add("hidden"); // Kategori disembunyikan secara default

  articleList.appendChild(liHeadCategory); // Tambahkan headlist kategori ke articleList setelah 'Beranda'
  articleList.appendChild(ulCategoryList); // Tambahkan ul sublist untuk kategori di bawah headlist

  // Membuat item untuk setiap kategori di dalam headlist "Kategori"
  categories.forEach((category) => {
    const liCategory = document.createElement("li");
    const categoryTitle = document.createElement("span");
    categoryTitle.textContent = `> ${category.title}`; // Awalnya tanda ">" untuk kategori yang belum di-expand
    liCategory.appendChild(categoryTitle);

    // Membuat sublist untuk artikel dalam kategori dan sembunyikan secara default
    const ulSublist = document.createElement("ul");
    ulSublist.classList.add("hidden"); // Tambahkan kelas 'hidden' untuk menyembunyikan sublist
    category.articles.forEach((article) => {
      const liArticle = document.createElement("li");
      const aArticle = document.createElement("a");
      aArticle.textContent = article.title;
      aArticle.href = article.path; // Gunakan path artikel
      aArticle.dataset.file = article.file; // Lazy load file
      aArticle.dataset.category = category.title; // Simpan informasi kategori
      aArticle.dataset.path = article.path; // Simpan path artikel
      aArticle.addEventListener("click", lazyLoadArticle); // Lazy load saat diklik
      liArticle.appendChild(aArticle);
      ulSublist.appendChild(liArticle);
    });

    liCategory.appendChild(ulSublist);
    ulCategoryList.appendChild(liCategory);

    // Tambahkan event listener untuk expand/collapse sublist saat kategori diklik
    categoryTitle.addEventListener("click", () => {
      ulSublist.classList.toggle("hidden");  // Toggle kelas 'hidden' untuk sublist artikel
      liCategory.classList.toggle("expanded");  // Toggle kelas 'expanded' untuk kategori
      // Ubah tanda ">" jadi "v" jika expand, atau sebaliknya
      if (liCategory.classList.contains("expanded")) {
        categoryTitle.textContent = `v ${category.title}`;
      } else {
        categoryTitle.textContent = `> ${category.title}`;
      }
    });
  });

  // Tambahkan event listener untuk expand/collapse daftar kategori saat headlist "Kategori" diklik
  headCategoryTitle.addEventListener("click", () => {
    ulCategoryList.classList.toggle("hidden"); // Toggle kelas 'hidden' untuk daftar kategori
    liHeadCategory.classList.toggle("expanded"); // Toggle kelas 'expanded' untuk headlist kategori
    // Ubah tanda ">" jadi "v" jika expand, atau sebaliknya
    if (liHeadCategory.classList.contains("expanded")) {
      headCategoryTitle.textContent = "v Kategori";
    } else {
      headCategoryTitle.textContent = "> Kategori";
    }
  });

  // Menangani event ketika tombol "Back" atau "Forward" di browser diklik
  window.addEventListener("popstate", (event) => {
    if (event.state) {
      loadMarkdown(event.state.file, event.state.category, window.location.pathname);
    } else {
      loadArticleFromURL(); // Muat ulang berdasarkan URL saat ini jika tidak ada state
    }
  });

  // Load artikel berdasarkan URL saat ini (misalnya jika halaman di-refresh)
  loadArticleFromURL();
});
