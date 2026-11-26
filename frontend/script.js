
// CloudPix - Frontend to AWS connection

const API_URL =
    "https://iumzs3qlmh6asouk5kmy3ot6sy0evbrb.lambda-url.us-east-1.on.aws/";

const imageInput = document.getElementById("imageInput");
const previewArea = document.getElementById("previewArea");
const uploadButton = document.getElementById("uploadButton");
const status = document.getElementById("status");

let selectedImage = null;
let previewUrl = null;

// Display the selected image
imageInput.addEventListener("change", function () {
    const file = imageInput.files[0];

    if (!file) {
        selectedImage = null;
        return;
    }

    const allowedTypes = [
        "image/jpeg",
        "image/png",
        "image/webp"
    ];

    if (!allowedTypes.includes(file.type)) {
        status.textContent = "Please select a JPG, PNG, or WEBP image.";
        selectedImage = null;
        imageInput.value = "";
        previewArea.innerHTML = "";
        return;
    }

    selectedImage = file;

    if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
    }

    previewUrl = URL.createObjectURL(file);

    previewArea.innerHTML = "";

    const image = document.createElement("img");
    image.src = previewUrl;
    image.alt = "Selected image preview";

    previewArea.appendChild(image);

    status.textContent = "Image selected successfully!";
});

// Ask Lambda whether image processing is complete
async function checkProcessingResults(key) {
    const maxAttempts = 20;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        status.textContent =
            `Processing your image in the cloud... (${attempt}/${maxAttempts})`;

        const response = await fetch(API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                action: "getResults",
                key: key
            })
        });

        const result = await response.json();

        if (response.status === 200 && result.status === "completed") {
            return result;
        }

        if (response.status !== 202) {
            throw new Error(
                result.error || "Could not retrieve processed images."
            );
        }

        // Wait 3 seconds before checking again
        await new Promise(resolve => setTimeout(resolve, 3000));
    }

    throw new Error(
        "Image processing is taking longer than expected. Please try again shortly."
    );
}

// Upload image to AWS
uploadButton.addEventListener("click", async function () {
    if (!selectedImage) {
        status.textContent = "Please select an image first.";
        return;
    }

    try {
        uploadButton.disabled = true;

        // Step 1: Request a temporary upload URL
        status.textContent = "Connecting to AWS...";

        const urlResponse = await fetch(API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                filename: selectedImage.name,
                contentType: selectedImage.type
            })
        });

        const uploadData = await urlResponse.json();

        if (!urlResponse.ok || !uploadData.uploadUrl || !uploadData.key) {
            throw new Error(
                uploadData.error || "Could not get an upload URL from AWS."
            );
        }

        // Step 2: Upload image to the input S3 bucket
        status.textContent = "Uploading image to cloud storage...";

        const s3Response = await fetch(uploadData.uploadUrl, {
            method: "PUT",
            headers: {
                "Content-Type": selectedImage.type
            },
            body: selectedImage
        });

        if (!s3Response.ok) {
            throw new Error("The image could not be uploaded to S3.");
        }

        console.log("Uploaded S3 object:", uploadData.key);

        // Step 3: Wait for the resized image and thumbnail
        const results = await checkProcessingResults(uploadData.key);

        // Step 4: Display the processed images
        previewArea.innerHTML = "";

        const resultHeading = document.createElement("h3");
        resultHeading.textContent = "Your CloudPix Results";
        previewArea.appendChild(resultHeading);

        const resizedHeading = document.createElement("p");
        resizedHeading.textContent = "Resized Image";
        previewArea.appendChild(resizedHeading);

        const resizedImage = document.createElement("img");
        resizedImage.src = results.processedUrl;
        resizedImage.alt = "Processed resized image";
        previewArea.appendChild(resizedImage);

        const thumbnailHeading = document.createElement("p");
        thumbnailHeading.textContent = "Thumbnail";
        previewArea.appendChild(thumbnailHeading);

        const thumbnailImage = document.createElement("img");
        thumbnailImage.src = results.thumbnailUrl;
        thumbnailImage.alt = "Processed thumbnail";
        previewArea.appendChild(thumbnailImage);

        // Download button for resized image
        const resizedDownload = document.createElement("a");
        resizedDownload.href = results.processedUrl;
        resizedDownload.download = "";
        resizedDownload.textContent = "Download Resized Image";
        resizedDownload.className = "download-button";
        previewArea.appendChild(resizedDownload);

        // Download button for thumbnail
        const thumbnailDownload = document.createElement("a");
        thumbnailDownload.href = results.thumbnailUrl;
        thumbnailDownload.download = "";
        thumbnailDownload.textContent = "Download Thumbnail";
        thumbnailDownload.className = "download-button";
        previewArea.appendChild(thumbnailDownload);

        status.textContent = "Success! Your images have been processed by CloudPix.";

    } catch (error) {
        console.error("CloudPix error:", error);
        status.textContent = "CloudPix error: " + error.message;
    } finally {
        uploadButton.disabled = false;
    }
});
