// loadCommonElements.js
document.addEventListener("DOMContentLoaded", function() {
    fetch('components/header.html')
        .then(response => response.text())
        .then(data => {
            document.getElementById('header').innerHTML = data;
            initializeNavbar(); // Ensure this is called here to apply after the header is loaded
        })
        .catch(error => console.error('Error loading the header:', error));

    fetch('components/footer.html')
        .then(response => response.text())
        .then(data => document.getElementById('footer').innerHTML = data)
        .catch(error => console.error('Error loading the footer:', error));
});

function initializeNavbar() {
    // Apply any dynamic styles or reinitialize JavaScript components here
    // This is crucial for any JavaScript-based interactivity or styles that need to be reapplied
}
