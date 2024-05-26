document.getElementById('uploadBook').addEventListener('change', function(event) {
    const bookView = document.getElementById('bookView');
    bookView.innerHTML = '<p>Book uploaded and ready to be read aloud.</p>';
});

document.getElementById('createAccount').addEventListener('click', function() {
    alert('Account creation feature coming soon!');
});
