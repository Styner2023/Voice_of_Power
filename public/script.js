document.getElementById('uploadButton').addEventListener('click', function() {
    const fileInput = document.getElementById('uploadBook');
    const file = fileInput.files[0];
    console.log('Selected file:', file); // Log file details

    if (!file) {
        alert('No file chosen');
        return;
    }

    const formData = new FormData();
    formData.append('file', file);

    fetch('/upload', {
        method: 'POST',
        body: formData
    })
    .then(response => {
        if (!response.ok) {
            console.error('Network response was not ok', response);
            return response.text().then(text => { throw new Error(text); });
        }
        return response.json();
    })
    .then(data => {
        console.log('Response from server:', data); // Log server response

        if (data.pdfUrl) {
            document.getElementById('pdfViewerIframe').src = data.pdfUrl;
            document.getElementById('viewPdfButton').style.display = 'block';
            document.getElementById('viewPdfButton').click();
        } else {
            console.error('Error: PDF URL not provided', data);
            alert('Error: PDF URL not provided');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        alert('Error uploading file: ' + error.message);
    });
});

document.getElementById('createAccount').addEventListener('click', function() {
    alert('Account creation feature coming soon!');
});
