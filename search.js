// Fungsi untuk menangani pencarian artikel
function searchArticles(query) {
  const lowerCaseQuery = query.toLowerCase();
  
  // Gabungkan semua artikel dari artikel tanpa kategori dan kategori
  const allArticles = [...articles, ...categories.flatMap(category => category.articles)];
  
  // Cari artikel yang judulnya mengandung query
  return allArticles.filter(article => article.title.toLowerCase().includes(lowerCaseQuery));
}

// Fungsi untuk menampilkan hasil pencarian
function displaySearchResults(query) {
  const searchResults = document.getElementById("search-results");
  const results = searchArticles(query);

  // Kosongkan hasil pencarian sebelumnya
  searchResults.innerHTML = "";

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
document.getElementById("search-input").addEventListener("input", function(event) {
  const query = event.target.value.trim(); // Trim untuk menghapus spasi berlebih
  if (query.length > 2) {
    displaySearchResults(query);
  } else {
    document.getElementById("search-results").classList.add("hidden"); // Sembunyikan hasil pencarian jika input kosong
  }
});