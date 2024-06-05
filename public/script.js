document.getElementById('uploadBook').addEventListener('change', function(event) {
    const file = event.target.files[0];
    if (file && file.type === 'application/pdf') {
        const fileReader = new FileReader();
        fileReader.onload = function(e) {
            const pdfData = e.target.result;
            const pdfViewer = document.getElementById('pdfViewer');
            pdfViewer.src = pdfData;
        };
        fileReader.readAsDataURL(file);
    } else {
        alert('Please upload a valid PDF file.');
    }
});

document.getElementById('createAccount').addEventListener('click', function() {
    alert('Account creation feature coming soon!');
});
