// Preview image before upload
function previewImage(input) {
    const preview = document.getElementById("imagePreview");
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function (e) {
            preview.src = e.target.result;
            preview.style.display = "block";
        };
        reader.readAsDataURL(input.files[0]);
    }
}

// Fetch and display all books
async function loadBooks() {
    const response = await fetch("/api/books");
    const books = await response.json();
    const grid = document.getElementById("booksGrid");
    grid.innerHTML = "";

    books.forEach((book) => {
        const card = createBookCard(book);
        grid.appendChild(card);
    });
}

// Create a book card element
function createBookCard(book) {
    const card = document.createElement("div");
    card.className = "bg-white p-6 rounded-lg shadow-md relative";

    const imageUrl = book.cover_image || "/api/placeholder/200/300";
    const progress = 100 - book.progress; // Invert for clip-path (0 is from top)

    card.innerHTML = `
        <button 
            class="absolute top-2 right-2 text-gray-400 hover:text-red-500 transition-colors"
            onclick="removeBook(${book.id})"
            title="Remove Challenge" style="padding: 5px">
            <i class="fas fa-trash"></i>
        </button>
        <div class="space-y-4">
            <div class="book-image-container mx-auto">
                <img src="${imageUrl}" 
                     alt="Book cover greyscale" 
                     class="book-image-greyscale">
                <img src="${imageUrl}" 
                     alt="Book cover color" 
                     class="book-image-color"
                     style="clip-path: inset(${progress}% 0 0 0)">
                <div class="book-title-overlay">
                    <h3 class="font-semibold">${book.title}</h3>
                </div>
            </div>
            
            <div class="space-y-4 mt-4">
                <div class="flex justify-between text-sm text-gray-600">
                    <span>Progress: ${book.progress}%</span>
                    <span>${book.current_page} / ${book.total_pages} tokens</span>
                </div>
                <div class="flex items-center space-x-2">
                    <input type="number" 
                           class="p-2 border rounded-md w-24"
                           value="${book.current_page}"
                           min="0"
                           max="${book.total_pages}"
                           onchange="updateProgress(${book.id}, this.value)">
                    <span class="text-sm text-gray-600">tokens completed</span>
                </div>
                ${book.reward ? `
                    <div class="mt-4 p-2 bg-green-50 rounded-md">
                        <span class="text-sm text-green-600">🎉 Reward: ${book.reward}</span>
                    </div>
                ` : ""}
            </div>
        </div>
    `;
    return card;
}

// Remove book function
async function removeBook(bookId) {
    if (confirm("Are you sure you want to delete this challenge?")) {
        const response = await fetch(`/api/books/${bookId}`, {
            method: "DELETE",
        });

        if (response.ok) {
            loadBooks(); // Reload books after successful deletion
        } else {
            const errorData = await response.json();
            alert(errorData.error || "Failed to delete the challenge.");
        }
    }
}

// Update book progress
async function updateProgress(bookId, currentPage) {
    const response = await fetch(`/api/books/${bookId}`, {
        method: "PUT",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ current_page: parseInt(currentPage) }),
    });
    if (response.ok) {
        loadBooks();
    } else {
        const errorData = await response.json();
        alert(errorData.error); // Show error message if current page exceeds total pages
    }
}

// Handle new book form submission
document.getElementById("addBookForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const totalPages = parseInt(formData.get('total_pages'));
    const currentPage = 0; // Default to 0 when adding a new book

    // Validate that current_page does not exceed total_pages
    if (currentPage > totalPages) {
        alert("Current page cannot exceed total tokens.");
        return;
    }

    const response = await fetch("/api/books", {
        method: "POST",
        body: formData,
    });

    if (response.ok) {
        document.getElementById("addBookForm").reset();
        document.getElementById("imagePreview").style.display = "none";
        loadBooks();
    }
});

// Load books on page load
loadBooks();
