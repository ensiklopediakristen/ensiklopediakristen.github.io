document.addEventListener('DOMContentLoaded', function() {
    // Menampilkan Buku dari JSON
    fetch('perpustakaan.json')
        .then(response => response.json())
        .then(books => {
            displayBooks(books);

            // Fungsionalitas pencarian buku
            const searchBar = document.getElementById('search-box');
            if (searchBar) {
                searchBar.addEventListener('input', function(event) {
                    const searchTerm = event.target.value.toLowerCase();
                    const filteredBooks = books.filter(book => 
                        book.title.toLowerCase().includes(searchTerm) || 
                        book.author.toLowerCase().includes(searchTerm)
                    );
                    displayBooks(filteredBooks);
                });
            } else {
                console.error('Search bar element not found.');
            }
        })
        .catch(error => console.error('Error fetching the books data:', error));

    function displayBooks(bookArray) {
        const bookGrid = document.getElementById('bookGrid');
        if (bookGrid) {
            bookGrid.innerHTML = '';
            bookArray.forEach(book => {
                const bookElement = document.createElement('div');
                bookElement.classList.add('book');
                bookElement.innerHTML = `
                    <img src="${book.cover}" alt="${book.title}">
                    <h3>${book.title}</h3>
                    <p><strong>Author:</strong> ${book.author}</p>
                    <p>${book.description}</p>
                    <a href="${book.readLink}" target="_blank"><button>Baca Buku</button></a>
                `;
                bookGrid.appendChild(bookElement);
            });
        } else {
            console.error('Book grid element not found.');
        }
    }        
});

// Tema mode gelap dan terang
document.getElementById('toggle-theme').addEventListener('click', function () {
    document.body.classList.toggle('dark-mode');

    // Ubah teks tombol berdasarkan mode saat ini
    if (document.body.classList.contains('dark-mode')) {
        this.classList = 'icon_dark';
    } else {
        this.classList = 'icon_light';
    }
});
