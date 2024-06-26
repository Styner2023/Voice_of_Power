document.getElementById('createAccount').addEventListener('click', function () {
  alert('Account creation feature coming soon!');
});

document.getElementById('playButton').addEventListener('click', function () {
  // Play functionality here
});

document.getElementById('pauseButton').addEventListener('click', function () {
  // Pause functionality here
});

document.getElementById('loginButton').addEventListener('click', function () {
  const username = document.getElementById('loginUsername').value;
  const password = document.getElementById('loginPassword').value;

  fetch('/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `username=${username}&password=${password}`
  }).then(response => response.json()).then(data => {
    if (data.token) {
      alert('Login successful');
      localStorage.setItem('token', data.token);
      // Redirect to dashboard or update UI accordingly
    } else {
      alert('Login failed');
    }
  });
});

document.getElementById('uploadBook').addEventListener('change', function () {
  const fileInput = this;
  const file = fileInput.files[0];

  if (file) {
    const formData = new FormData();
    formData.append('file', file);

    fetch('/api/upload', {
      method: 'POST',
      body: formData
    }).then(response => {
      if (response.ok) {
        return response.json();
      } else {
        throw new Error('File upload failed.');
      }
    }).then(data => {
      alert('File uploaded successfully.');
      const pdfViewer = document.getElementById('pdfViewer');
      pdfViewer.src = data.fileUrl;
      pdfViewer.hidden = false;
    }).catch(error => {
      console.error(error);
      alert('File upload failed. Please check your server and CORS configuration.');
    });
  }
});
