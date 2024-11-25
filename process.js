document.addEventListener("DOMContentLoaded", function () {
    const currentTime = new Date();
    const hours = currentTime.getHours();
    const isNightTime = hours >= 18 || hours < 7;

    if (isNightTime) {
        document.body.classList.add("dark-mode");
        applyNightModeStyles("./assets/logo2.png",'./assets/github2.png', "#84bb4c");
    }
});

function applyNightModeStyles(newLogoSrc, newGitSrc, newHeaderColor) {
    const logoElement = document.querySelector(".header img");
    const gitHubElement = document.querySelector(".header a img");
    logoElement.src = newLogoSrc;
    gitHubElement.src = newGitSrc

    const headerElements = document.querySelectorAll(".header h1, h2, h3");
    headerElements.forEach((element) => {
        element.style.color = newHeaderColor;
    });
}

async function uploadFiles(section) {
    // Select the correct file input based on the section
    const inputElement = document.getElementById(`file-input${section}`);
    const files = inputElement.files;

    if (files.length === 0) {
        alert("Please select at least one file.");
        return;
    }

    // Create a FormData object to send files
    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
        formData.append("file", files[i]);
    }

    // Add a section identifier to the FormData
    formData.append("section", section);
    
    try {
        // Send files to Flask endpoint
        const response = await fetch(`http://localhost:5000/upload`, {
            method: 'POST',
            body: formData
        });

        if (response.ok) {
            const data = await response.json();
            alert("File(s) uploaded successfully!");
            console.log(data);
            fetchUploadedFiles(); // Fetch uploaded files
        } else {
            alert("File upload failed. Please try again.");
        }
    } catch (error) {
        console.error("Error uploading files:", error);
        alert("An error occurred while uploading files.");
    }
}

async function fetchFiles() {
    try {
        // Fetch processed files
        const processedResponse = await fetch('http://localhost:5000/processed-files');
        const uploadedResponse = await fetch('http://localhost:5000/uploaded-files');

        if (processedResponse.ok && uploadedResponse.ok) {
            const processedFiles = await processedResponse.json();
            const uploadedFiles = await uploadedResponse.json();

            updateUploadedFileTable(uploadedFiles);
            updateProcessedFileTable(processedFiles);

            console.log("Files fetched and tables updated!");
        } else {
            console.error("Failed to fetch files");
        }
    } catch (error) {
        console.error("Error fetching files:", error);
    }
}

async function deleteProcessedFile(fileName) {
    try {
        const response = await fetch(`http://localhost:5000/delete-processed-file/${fileName}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            alert(`Processed file ${fileName} deleted successfully.`);
            fetchFiles(); // Refresh file list after deletion
        } else {
            const errorData = await response.json();
            console.error(`Failed to delete processed file: ${errorData.error}`);
        }
    } catch (error) {
        console.error(`Error deleting processed file: ${fileName}`, error);
    }
}

async function deleteUploadedFile(fileName) {
    try {
        const response = await fetch(`http://localhost:5000/delete-uploaded-file/${fileName}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            alert(`Uploaded file ${fileName} deleted successfully.`);
            fetchFiles(); // Refresh the uploaded files list after deletion
        } else {
            const errorData = await response.json();
            console.error(`Failed to delete uploaded file: ${errorData.error}`);
        }
    } catch (error) {
        console.error(`Error deleting uploaded file: ${fileName}`, error);
    }
}

function updateUploadedFileTable(files) {
    const tableBody = document.querySelector('#uploadedFileTable tbody');
    tableBody.innerHTML = '';

    if (files.length > 0) {
        files.forEach(file => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${file.name}</td>
                <td>${formatFileSize(file.size)}</td>
                <td><a href="http://localhost:5000/download/uploaded/${file.name}" download>Download</a></td>
                <td><button class="delete-btn" onclick="deleteUploadedFile('${file.name}')">Delete</button></td>
            `;
            tableBody.appendChild(row);
        });
        document.getElementById('uploadedFileTable').style.display = 'table';
    } else {
        document.getElementById('uploadedFileTable').style.display = 'none';
    }
}

function updateProcessedFileTable(files) {
    const tableBody = document.querySelector('#processedFileTable tbody');
    tableBody.innerHTML = '';

    if (files.length > 0) {
        files.forEach(file => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${file.name}</td>
                <td>${formatFileSize(file.size)}</td>
                <td><a href="http://localhost:5000/download/processed/${file.name}" download>Download</a></td>
                <td><button class="delete-btn" onclick="deleteProcessedFile('${file.name}')">Delete</button></td>
            `;
            tableBody.appendChild(row);
        });
        document.getElementById('processedFileTable').style.display = 'table';
    } else {
        document.getElementById('processedFileTable').style.display = 'none';
    }
}

function formatFileSize(size) {
    // Format file size in KB, MB, etc.
    if (size < 1024) return size + ' B';
    else if (size < 1024 * 1024) return (size / 1024).toFixed(2) + ' KB';
    else if (size < 1024 * 1024 * 1024) return (size / (1024 * 1024)).toFixed(2) + ' MB';
    else return (size / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
}

window.onload = fetchFiles;
