document
  .getElementById("uploadBook")
  .addEventListener("change", function (event) {
    const file = event.target.files[0];
    const formData = new FormData();
    formData.append("file", file);

    fetch("/api/upload", {
      method: "POST",
      body: formData,
    })
      .then((response) => response.text())
      .then((data) => {
        alert(data);
      })
      .catch((error) => {
        console.error("Error uploading file:", error);
        alert("Error uploading file.");
      });
  });
