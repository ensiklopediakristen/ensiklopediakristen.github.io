const bookSelect = document.getElementById('book-select');
const chapterSelect = document.getElementById('chapter-select');
const verseSelect = document.getElementById('verse-select');
const sectionTitle = document.getElementById('section-title');
const versesList = document.getElementById('verses-list');
const searchInput = document.getElementById('search-input');
let bibleData = null;
let highlightedVerse = null;

// Flag untuk mendeteksi scroll manual
let isScrollingManually = false;
let scrollTimeout;

async function loadBibleData() {
    try {
        const response = await fetch('kitab-henokh.json');
        bibleData = await response.json();
        populateBooks();
        searchInput.addEventListener('input', searchAcrossBible);
    } catch (error) {
        console.error('Error loading Bible data:', error);
    }
}

function populateBooks() {
    bibleData.books.forEach((book, index) => {
        const option = document.createElement('option');
        option.value = index;
        option.textContent = book.name;
        bookSelect.appendChild(option);
    });

    bookSelect.addEventListener('change', () => {
        const selectedBook = bibleData.books[bookSelect.value];
        chapterSelect.innerHTML = '';
        selectedBook.chapters.forEach((chapter, index) => {
            const option = document.createElement('option');
            option.value = index;
            option.textContent = `Pasal ${chapter.chapter}`;
            chapterSelect.appendChild(option);
        });
        chapterSelect.dispatchEvent(new Event('change'));
    });

    chapterSelect.addEventListener('change', () => {
        populateVerses();
        displayChapter();
    });

    verseSelect.addEventListener('change', displayVerse);

    bookSelect.dispatchEvent(new Event('change'));
}

function populateVerses() {
    const selectedBook = bibleData.books[bookSelect.value];
    const selectedChapter = selectedBook.chapters[chapterSelect.value];
    verseSelect.innerHTML = '';
    selectedChapter.sections[0].verses.forEach((verse, index) => {
        const option = document.createElement('option');
        option.value = index;
        option.textContent = `Ayat ${index + 1}`;
        verseSelect.appendChild(option);
    });
}

function displayChapter() {
    const selectedBook = bibleData.books[bookSelect.value];
    const selectedChapter = selectedBook.chapters[chapterSelect.value];
    const section = selectedChapter.sections[0];

    // Tambahkan nama kitab di atas judul pasal
    sectionTitle.innerHTML = `<div id="selected-book"><strong>${selectedBook.name}</strong></div><div>Pasal ${selectedChapter.chapter}</div><div>${section.title}</div>`;
    
    versesList.innerHTML = '';

    section.verses.forEach((verse, index) => {
        const li = document.createElement('li');
        li.textContent = verse;
        li.addEventListener('click', (e) => {
            e.stopPropagation();
            highlightVerse(li);
        });
        versesList.appendChild(li);
    });
}

function highlightVerse(element) {
    if (highlightedVerse === element) {
        element.classList.remove('highlight-verse');
        highlightedVerse = null;
    } else {
        if (highlightedVerse) {
            highlightedVerse.classList.remove('highlight-verse');
        }
        element.classList.add('highlight-verse');
        highlightedVerse = element;
    }
}

document.addEventListener('click', () => {
    if (highlightedVerse) {
        highlightedVerse.classList.remove('highlight-verse');
        highlightedVerse = null;
    }
});

function displayVerse() {
    const selectedBook = bibleData.books[bookSelect.value];
    const selectedChapter = selectedBook.chapters[chapterSelect.value];
    const selectedVerse = verseSelect.value;
    const section = selectedChapter.sections[0];

    versesList.innerHTML = '';

    section.verses.forEach((verse, index) => {
        const li = document.createElement('li');
        li.textContent = verse;
        li.id = `verse-${index + 1}`;
        li.addEventListener('click', (e) => {
            e.stopPropagation();
            highlightVerse(li);
        });
        versesList.appendChild(li);
    });

    const targetVerseElement = document.getElementById(`verse-${parseInt(selectedVerse) + 1}`);
    if (targetVerseElement) {
        targetVerseElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
        targetVerseElement.classList.add('highlight-verse');

        setTimeout(() => {
            targetVerseElement.classList.remove('highlight-verse');
        }, 1000); // Highlight duration is 1 second
    }
}

function searchAcrossBible() {
    const query = searchInput.value.toLowerCase();
    versesList.innerHTML = '';
    sectionTitle.style.display = 'none';
    
    topNavButtons.style.display = 'none';
    bottomNavButtons.style.display = 'none';

    let found = false;

    if (query.length > 0) {
        versesList.classList.add('search-results');
        bibleData.books.forEach((book, bookIndex) => {
            book.chapters.forEach((chapter, chapterIndex) => {
                chapter.sections.forEach((section) => {
                    section.verses.forEach((verse, verseIndex) => {
                        if (verse.toLowerCase().includes(query)) {
                            found = true;
                            const li = document.createElement('li');
                            li.innerHTML = `
                                <strong>${book.name} ${chapter.chapter}:${verseIndex + 1}</strong> - 
                                ${verse.replace(new RegExp(query, 'gi'), (match) => `<span class="highlight-search">${match}</span>`)}
                            `;
                            li.addEventListener('click', () => {
                                bookSelect.value = bookIndex;
                                chapterSelect.value = chapterIndex;
                                chapterSelect.dispatchEvent(new Event('change'));

                                verseSelect.value = verseIndex;
                                displayVerse();

                                setTimeout(() => {
                                    document.querySelectorAll('.highlight-search').forEach((highlight) => {
                                        highlight.classList.remove('highlight-search');
                                    });
                                }, 1000);

                                searchInput.value = '';

                                versesList.classList.remove('search-results');

                                topNavButtons.style.display = 'flex';
                                bottomNavButtons.style.display = 'flex';
                            });
                            versesList.appendChild(li);
                        }
                    });
                });
            });
        });

        if (!found) {
            const li = document.createElement('li');
            li.textContent = 'Tidak ada hasil ditemukan';
            versesList.appendChild(li);
        }
    } else {
        versesList.classList.remove('search-results');
        sectionTitle.style.display = 'block';
        topNavButtons.style.display = 'flex';
        bottomNavButtons.style.display = 'flex';
        displayChapter();
    }
}

// Fungsi untuk scroll ke bagian atas halaman
function scrollToSectionTitle() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Tambahkan event listener pada tombol navigasi
document.getElementById('prev-chapter').addEventListener('click', (event) => {
    navigateChapter(event);
    scrollToSectionTitle();
});

document.getElementById('next-chapter').addEventListener('click', (event) => {
    navigateChapter(event);
    scrollToSectionTitle();
});

document.getElementById('prev-chapter-bottom').addEventListener('click', (event) => {
    navigateChapter(event);
    scrollToSectionTitle();
});

document.getElementById('next-chapter-bottom').addEventListener('click', (event) => {
    navigateChapter(event);
    scrollToSectionTitle();
});

function navigateChapter(event) {
    const isNext = event.target.id.includes('next');
    let currentChapterIndex = parseInt(chapterSelect.value);
    let currentBookIndex = parseInt(bookSelect.value);
    const chapterCount = bibleData.books[currentBookIndex].chapters.length;
    const bookCount = bibleData.books.length;

    if (isNext) {
        if (currentChapterIndex < chapterCount - 1) {
            // Masih ada pasal berikutnya dalam kitab saat ini
            chapterSelect.value = currentChapterIndex + 1;
        } else if (currentBookIndex < bookCount - 1) {
            // Pasal sudah habis, pindah ke kitab berikutnya
            currentBookIndex += 1;
            bookSelect.value = currentBookIndex;
            bookSelect.dispatchEvent(new Event('change'));
            chapterSelect.value = 0; // Reset ke pasal pertama kitab berikutnya
        }
    } else {
        if (currentChapterIndex > 0) {
            // Masih ada pasal sebelumnya dalam kitab saat ini
            chapterSelect.value = currentChapterIndex - 1;
        } else if (currentBookIndex > 0) {
            // Pasal sudah habis, pindah ke kitab sebelumnya
            currentBookIndex -= 1;
            bookSelect.value = currentBookIndex;
            bookSelect.dispatchEvent(new Event('change'));
            chapterSelect.value = bibleData.books[currentBookIndex].chapters.length - 1; // Pindah ke pasal terakhir kitab sebelumnya
        }
    }

    chapterSelect.dispatchEvent(new Event('change'));
}


// Seleksi elemen tombol navigasi
const topNavButtons = document.querySelector('.top-navigation');
const bottomNavButtons = document.querySelector('.bottom-navigation');

// Tambahkan swipe gesture untuk pindah pasal
let touchStartX = 0;
let touchEndX = 0;

function handleTouchStart(event) {
    touchStartX = event.changedTouches[0].screenX;
}

function handleTouchEnd(event) {
    touchEndX = event.changedTouches[0].screenX;
    handleSwipeGesture();
}

function handleSwipeGesture() {
    const sensitivity = 90; // Sesuaikan sensitivitas swipe

    if (touchEndX < touchStartX - sensitivity) {
        navigateChapter({ target: { id: 'next-chapter' } });
        scrollToSectionTitle();
    }

    if (touchEndX > touchStartX + sensitivity) {
        navigateChapter({ target: { id: 'prev-chapter' } });
        scrollToSectionTitle();
    }
}

document.addEventListener('touchstart', handleTouchStart, false);
document.addEventListener('touchend', handleTouchEnd, false);

// Tema mode gelap dan terang
document.getElementById('toggle-theme').addEventListener('click', function () {
    document.body.classList.toggle('dark-mode');

    // Ubah teks tombol berdasarkan mode saat ini
    if (document.body.classList.contains('dark-mode')) {
        this.classList = 'icon_light';
    } else {
        this.classList = 'icon_dark';
    }
});

loadBibleData();
