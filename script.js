var region="us-east-2";
var accessKeyId = "";
var secretAccessKey = "";

AWS.config.update({
    region:region,
    credentials: new AWS.Credentials(accessKeyId,secretAccessKey)
});

var s3 = new AWS.S3();

document.addEventListener("DOMContentLoaded", function () {
    const currentTime = new Date();
    const hours = currentTime.getHours();
    const isNightTime = hours >= 18;

    if (isNightTime) {
        document.body.classList.add("dark-mode");
        applyNightModeStyles("./assets/logo2.png", "#84bb4c");
    }
});
function applyNightModeStyles(newLogoSrc, newHeaderColor) {
    const logoElement = document.querySelector(".header img");
    logoElement.src = newLogoSrc;

    const headerElements = document.querySelectorAll(".header h1, h2, h3");
    headerElements.forEach((element) => {
        element.style.color = newHeaderColor;
    });
}

function refreshFileList(s3bucket){
    var tableBody = document.querySelector('#fileTable tbody');
    tableBody.innerHTML="";

    s3.listObjectsV2({ Bucket: "wp-resultbucket" },(err,data)=>{
        if(err){
            console.log("Error fetching file from AWS",err);
        }
        else{
            data.Contents.forEach((object) => {
                var fileRow = document.createElement("tr");

                var fileNameCell = document.createElement("td");
                fileNameCell.textContent = object.Key;
                fileRow.appendChild(fileNameCell);

                var fileSizeCell = document.createElement("td");
                fileSizeCell.textContent = object.Size;
                fileRow.appendChild(fileSizeCell);

                var downloadCell = document.createElement("td");
                var downloadLink = document.createElement('a');
                downloadLink.href = s3.getSignedUrl("getObject",
                {
                    Bucket: "wp-resultbucket",
                    Key: object.Key
                })

                downloadLink.textContent = "Download";
                downloadCell.appendChild(downloadLink);
                fileRow.appendChild(downloadCell);

                var deleteCell = document.createElement("td");
                var deleteButton = document.createElement("button");
                deleteButton.textContent = "Delete";
                deleteButton.addEventListener("click",()=>{
                    deleteFile("wp-resultbucket",object.Key);
                })
                deleteCell.appendChild(deleteButton);
                fileRow.appendChild(deleteCell);

                tableBody.appendChild(fileRow);

                document.getElementById("fileTable").style.display = "table";
            });
        }
    })
}

function deleteFile(s3bucket,key){
    var params = {
        Bucket: "wp-resultbucket",
        Key: key 
    }

    s3.deleteObject(params,function(err,data){
        if(err){
            console.log("Error deleting file",err);
        }
        else{
            console.log("File deleted successfully");
            refreshFileList("wp-resultbucket");
        }
    })
}

function uploadFiles(s3bucket) {
    var files = document.getElementById("file-input").files;
    var fileCount = files.length;

    document.getElementById("fileTable").style.display = "none";

    for (var i = 0; i < fileCount; i++) {
        var file = files[i];
        var params = {
            Bucket: s3bucket,
            Key: file.name,
            Body: file
        };

        s3.upload(params, (err, data) => {
            if (err) {
                console.log("Error in uploading files", err);
            } else {
                console.log("File uploaded successfully");
            }
            refreshFileList(s3bucket);

            document.getElementById("fileTable").style.display = "table";
        });
    }
}


refreshFileList("wp-resultbucket")