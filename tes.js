function displayPagination(currentPage, totalPages) {
    const paginationDiv = document.createElement("div");
    paginationDiv.classList.add("pagination");

    const maxPageLinks = 5; // Maksimal 5 nomor halaman yang ditampilkan sekaligus

    // Tombol "Sebelumnya"
    if (currentPage > 1) {
        const prevLink = document.createElement("a");
        prevLink.textContent = "<<";
        prevLink.href = `#page-${currentPage - 1}`;
        prevLink.addEventListener("click", (event) => {
            event.preventDefault();
            displayArticlesByPage(currentPage - 1);
            window.scrollTo(0, 0);
        });
        paginationDiv.appendChild(prevLink);
    }

    // Tautan ke halaman pertama
    if (currentPage > 1) {
        const firstPageLink = document.createElement("a");
        firstPageLink.textContent = "1";
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

        // Tambahkan "..." jika halaman pertama bukan bagian dari rentang halaman yang tampil
        if (currentPage > maxPageLinks) {
            const dotsLink = document.createElement("span");
            dotsLink.textContent = "...";
            paginationDiv.appendChild(dotsLink);
        }
    }

    // Hitung rentang halaman yang akan ditampilkan
    let startPage = Math.max(2, currentPage - Math.floor(maxPageLinks / 2));
    let endPage = Math.min(totalPages - 1, currentPage + Math.floor(maxPageLinks / 2));

    // Pastikan selalu menampilkan jumlah maksimal halaman kecuali sudah di awal/akhir
    if (currentPage <= Math.floor(maxPageLinks / 2)) {
        endPage = Math.min(totalPages - 1, maxPageLinks);
    } else if (currentPage + Math.floor(maxPageLinks / 2) >= totalPages) {
        startPage = Math.max(2, totalPages - maxPageLinks);
    }

    // Tautan halaman bertahap (tanpa halaman pertama dan terakhir)
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

    // Tampilkan tombol "..." jika masih ada halaman setelah halaman terakhir yang ditampilkan
    if (endPage < totalPages - 1) {
        const dotsLink = document.createElement("span");
        dotsLink.textContent = "...";
        paginationDiv.appendChild(dotsLink);
    }

    // Tautan ke halaman terakhir
    if (currentPage < totalPages) {
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
    }

    // Tombol "Berikutnya"
    if (currentPage < totalPages) {
        const nextLink = document.createElement("a");
        nextLink.textContent = ">>";
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