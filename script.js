document.addEventListener("DOMContentLoaded", function () {
  // Inisialisasi markdown-it
  const md = window.markdownit();

  // Daftar artikel (contoh) dengan kategori terkait
  const articles = [
    { title: "Beranda", file: "markdown/beranda.md", category: null, slug: "beranda" }
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

  // Fungsi untuk memuat konten markdown berdasarkan slug
  function loadArticleBySlug(slug) {
    let articleFound = false;

    // Periksa di artikel tanpa kategori
    articles.forEach(article => {
      if (article.slug === slug) {
        loadMarkdown(article.file, article.category);
        articleFound = true;
      }
    });

    // Periksa di kategori
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
      // Jika tidak ditemukan, tampilkan pesan error
      mainContent.innerHTML = `<h2>Artikel tidak ditemukan</h2>`;
    }
  }

  // Memasukkan artikel 'Beranda' di luar kategori
  articles.forEach((article) => {
    const li = document.createElement("li");
    const a = document.createElement("a");
    a.textContent = article.title;
    a.href = `#${article.slug}`;
    a.dataset.file = article.file; // Lazy load file
    a.dataset.category = article.category; // Set kategori jika ada
    a.dataset.slug = article.slug; // Set slug
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
      aArticle.href = `#${article.slug}`;
      aArticle.dataset.file = article.file; // Lazy load file
      aArticle.dataset.category = category.title; // Simpan informasi kategori
      aArticle.dataset.slug = article.slug; // Set slug
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

  // Lazy load fungsi untuk memuat konten markdown hanya saat diperlukan
  function lazyLoadArticle(event) {
    event.preventDefault();
    const file = event.target.dataset.file;
    const category = event.target.dataset.category;
    const slug = event.target.dataset.slug;

    // Ubah URL hash sesuai dengan artikel yang diklik
    window.location.hash = slug;
    loadMarkdown(file, category);
  }

  // Fungsi untuk memuat dan menampilkan konten markdown dan kategori terkait
  function loadMarkdown(file, category) {
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
      })
      .catch((error) => console.error("Error loading markdown:", error));
  }

  // Fungsi untuk menampilkan artikel dalam kategori
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
          a.href = `#${article.slug}`;
          a.dataset.file = article.file; // Lazy load file
          a.dataset.slug = article.slug; // Set slug
          a.addEventListener("click", lazyLoadArticle); // Lazy load saat diklik
          li.appendChild(a);
          ulCategoryArticles.appendChild(li);
        });
      }
    });

    mainContent.appendChild(ulCategoryArticles);
  }

  // Memeriksa apakah ada hash di URL saat halaman dimuat
  const currentHash = window.location.hash.replace("#", "");
  if (currentHash) {
    loadArticleBySlug(currentHash); // Muat artikel berdasarkan slug di hash
  } else {
    // Jika tidak ada hash, muat artikel default (contoh: Beranda)
    window.location.hash = "beranda";
    loadMarkdown("markdown/beranda.md");
  }
});
