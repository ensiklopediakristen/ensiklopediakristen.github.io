document.addEventListener("DOMContentLoaded", function () {
  // Inisialisasi markdown-it
  const md = window.markdownit();

  // Muat JSON untuk artikel dan kategori
  fetch('index.json')
    .then(response => response.json())
    .then(data => {
      const articles = data.articles;
      const categories = data.categories;

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

            return { title, img, excerpt };
          });
      }

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

      // Fungsi untuk menghitung jumlah artikel per kategori
      function getCategoryArticleCounts() {
        const counts = {};

        // Hitung artikel per kategori
        categories.forEach(category => {
          counts[category.title] = category.articles.length;
        });

        return counts;
      }

      // Fungsi untuk menghitung total artikel tanpa menghitung artikel di beranda
      function getTotalArticleCount() {
        return articles.length + categories.reduce((total, category) => total + category.articles.length, 0) - 1; // Kurangi 1 untuk menghindari artikel beranda
      }

      // Tambahkan artikel tanpa kategori ke daftar
      articles.forEach(article => {
        if (article.file !== "beranda.md") { // Jangan hitung artikel beranda
          articleList.appendChild(createArticleItem(article, article.category));
        }
      });

      // Membuat headlist kategori dan sublist-nya
      const liHeadCategory = document.createElement("li");
      const headCategoryTitle = document.createElement("span");
      headCategoryTitle.textContent = `> Kategori (${getTotalArticleCount()})`;
      liHeadCategory.appendChild(headCategoryTitle);

      const ulCategoryList = document.createElement("ul");
      ulCategoryList.classList.add("hidden");
      articleList.appendChild(liHeadCategory);
      articleList.appendChild(ulCategoryList);

      // Membuat item untuk setiap kategori dan artikel di dalamnya
      const categoryCounts = getCategoryArticleCounts();

      categories.forEach(category => {
        const liCategory = document.createElement("li");
        const categoryTitle = document.createElement("span");
        categoryTitle.textContent = `> ${category.title} (${categoryCounts[category.title]})`;
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
            ? `v ${category.title} (${categoryCounts[category.title]})`
            : `> ${category.title} (${categoryCounts[category.title]})`;
        });
      });

      // Expand/collapse daftar kategori
      headCategoryTitle.addEventListener("click", () => {
        ulCategoryList.classList.toggle("hidden");
        liHeadCategory.classList.toggle("expanded");
        headCategoryTitle.textContent = liHeadCategory.classList.contains("expanded")
          ? `v Kategori (${getTotalArticleCount()})`
          : `> Kategori (${getTotalArticleCount()})`;
      });

      // Fungsi lazy load artikel
      function lazyLoadArticle(event) {
        event.preventDefault();
        const { file, category, slug } = event.target.dataset;
        window.scrollTo(0, 0);
        window.location.hash = slug;
        loadMarkdown(file, category);
      }

  // Fungsi untuk mendapatkan artikel acak setiap hari
function getRandomArticleForToday() {
  const allArticles = [...articles];

  // Gabungkan artikel dari kategori
  categories.forEach(category => {
    allArticles.push(...category.articles);
  });

  // Filter untuk mengecualikan "beranda.md"
  const filteredArticles = allArticles.filter(article => article.file !== "beranda.md");

  // Gunakan seed random yang sama setiap hari
  const today = new Date().toISOString().slice(0, 10); // Format: YYYY-MM-DD
  const seed = today.split("-").reduce((acc, val) => acc + parseInt(val), 0);

  // Fungsi untuk menghasilkan random berdasarkan seed
  function seededRandom(seed) {
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
  }

  // Pilih artikel acak berdasarkan seed
  const randomIndex = Math.floor(seededRandom(seed) * filteredArticles.length);
  return filteredArticles[randomIndex];
}

// Fungsi untuk menampilkan artikel acak
function displayRandomArticle() {
  const randomArticle = getRandomArticleForToday();

  // Dapatkan detail artikel
  getArticleDetails(randomArticle.file).then(details => {
    const randomArticleDiv = document.createElement("div");
    randomArticleDiv.classList.add("random-article");

    const titleElement = document.createElement("h2");
    titleElement.textContent = "Artikel Pilihan Hari Ini";
    randomArticleDiv.appendChild(titleElement);

    const articleTitleElement = document.createElement("h3");
    articleTitleElement.textContent = details.title;
    randomArticleDiv.appendChild(articleTitleElement);

    if (details.img) {
      const imgElement = document.createElement("img");
      imgElement.src = details.img;
      imgElement.alt = details.title;
      imgElement.style.width = "100px"; // Sesuaikan ukuran gambar
      imgElement.style.margin = "0";
      randomArticleDiv.appendChild(imgElement);
    }

    const excerptElement = document.createElement("p");
    excerptElement.textContent = details.excerpt;
    randomArticleDiv.appendChild(excerptElement);

    const linkElement = document.createElement("a");
    linkElement.textContent = "Baca Selengkapnya";
    linkElement.href = `#${randomArticle.slug}`;
    linkElement.addEventListener("click", (event) => {
      event.preventDefault();
      loadArticleBySlug(randomArticle.slug);
      window.scrollTo(0, 0);
    });
    randomArticleDiv.appendChild(linkElement);

    // Sisipkan artikel acak sebelum daftar artikel terbaru
    mainContent.prepend(randomArticleDiv);
  });
}

// Modifikasi fungsi loadMarkdown untuk memastikan artikel acak ditampilkan di bawah beranda dan di atas artikel terbaru
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

      // Tampilkan artikel terbaru jika di halaman Beranda
      if (file === "beranda.md") {
        // Tampilkan artikel acak di bawah konten beranda tetapi di atas artikel terbaru
        displayRandomArticle()
          .then(() => {
            // Tampilkan artikel terbaru setelah artikel acak
            const recentArticles = getRecentArticles();
            const recentArticlesList = document.createElement("div");
            recentArticlesList.innerHTML = `<h2 class="terbaru">Artikel Terbaru</h2>`;

            const ul = document.createElement("ul");
            ul.classList.add("recent-articles"); // Menambahkan class pada elemen ul

            // Proses setiap artikel terbaru untuk mendapatkan detail
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
                  imgElement.style.width = "100px"; // Sesuaikan ukuran gambar
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
          });
      } else if (category) {
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

// Fungsi untuk menampilkan artikel acak
function displayRandomArticle() {
  return new Promise((resolve) => {
    const randomArticle = getRandomArticleForToday();

    // Dapatkan detail artikel
    getArticleDetails(randomArticle.file).then(details => {
      const randomArticleDiv = document.createElement("div");
      randomArticleDiv.classList.add("random-article");

      const titleElement = document.createElement("h2");
      titleElement.textContent = "Artikel Pilihan Hari Ini";
      randomArticleDiv.appendChild(titleElement);

      const articleTitleElement = document.createElement("h3");
      articleTitleElement.textContent = details.title;
      randomArticleDiv.appendChild(articleTitleElement);

      if (details.img) {
        const imgElement = document.createElement("img");
        imgElement.src = details.img;
        imgElement.alt = details.title;
        imgElement.style.width = "100px"; // Sesuaikan ukuran gambar
        imgElement.style.margin = "0";
        randomArticleDiv.appendChild(imgElement);
      }

      const excerptElement = document.createElement("p");
      excerptElement.textContent = details.excerpt;
      randomArticleDiv.appendChild(excerptElement);

      const linkElement = document.createElement("a");
      linkElement.textContent = "Baca Selengkapnya";
      linkElement.href = `#${randomArticle.slug}`;
      linkElement.addEventListener("click", (event) => {
        event.preventDefault();
        loadArticleBySlug(randomArticle.slug);
        window.scrollTo(0, 0);
      });
      randomArticleDiv.appendChild(linkElement);

      // Sisipkan artikel acak di bawah konten beranda tetapi di atas artikel terbaru
      mainContent.appendChild(randomArticleDiv);
      resolve();
    });
  });
}

// Fungsi untuk menampilkan artikel acak
function displayRandomArticle() {
  return new Promise((resolve) => {
    const randomArticle = getRandomArticleForToday();

    // Dapatkan detail artikel
    getArticleDetails(randomArticle.file).then(details => {
      const randomArticleDiv = document.createElement("div");
      randomArticleDiv.classList.add("random-article");

      const titleElement = document.createElement("h2");
      titleElement.textContent = "Artikel Pilihan Hari Ini";
      randomArticleDiv.appendChild(titleElement);

      const articleTitleElement = document.createElement("h3");
      articleTitleElement.textContent = details.title;
      randomArticleDiv.appendChild(articleTitleElement);

      if (details.img) {
        const imgElement = document.createElement("img");
        imgElement.src = details.img;
        imgElement.alt = details.title;
        imgElement.style.width = "100px"; // Sesuaikan ukuran gambar
        imgElement.style.margin = "0";
        randomArticleDiv.appendChild(imgElement);
      }

      const excerptElement = document.createElement("p");
      excerptElement.textContent = details.excerpt;
      randomArticleDiv.appendChild(excerptElement);

      const linkElement = document.createElement("a");
      linkElement.textContent = "Baca Selengkapnya";
      linkElement.href = `#${randomArticle.slug}`;
      linkElement.addEventListener("click", (event) => {
        event.preventDefault();
        loadArticleBySlug(randomArticle.slug);
        window.scrollTo(0, 0);
      });
      randomArticleDiv.appendChild(linkElement);

      // Sisipkan artikel acak di bawah konten beranda tetapi di atas artikel terbaru
      mainContent.appendChild(randomArticleDiv);
      resolve();
    });
  });
}

  function getRecentArticles() {
    const allArticles = [...articles];

    // Gabungkan artikel dari kategori
    categories.forEach(category => {
      allArticles.push(...category.articles);
    });

    // Filter untuk mengecualikan "beranda.md"
    const filteredArticles = allArticles.filter(article => article.file !== "beranda.md");

    // Urutkan artikel berdasarkan tanggal (dari yang terbaru)
    filteredArticles.sort((a, b) => new Date(b.date) - new Date(a.date));

    // Ambil 10 artikel terbaru
    return filteredArticles.slice(0, 10);
    
    
    
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
    loadMarkdown("beranda.md");
  }
})
    .catch(error => console.error("Error loading data:", error));
});
