// src/script.js
// Handles image uploads, sends them to Roboflow API for JSON detection,
// draws detections, and saves the image with the Roboflow-generated label.

import { showMessageBox, saveImageToBackend } from "./utils/saveImage.js";

document.addEventListener("DOMContentLoaded", function () {
  const chooseImageButton = document.getElementById("chooseImageButton");
  const imageInput = document.getElementById("imageUpload");

  const uploadedImage = document.getElementById("uploadedImage");
  const saveUploadButton = document.getElementById("saveUploadButton");
  // REMOVED: const imageLabelInput = document.getElementById("imageLabel"); // This element no longer exists
  const overlayCanvas = document.getElementById("overlayCanvas");
  const ctx = overlayCanvas.getContext("2d");

  let currentOriginalImageForCanvas = null; // Store the original Image object for redrawing
  let lastDetectionLabel = ""; // Stores the Roboflow-generated label

  // Roboflow API configuration
  const ROBOFLOW_PROJECT_ID = "dataset-6nff1";
  const ROBOFLOW_VERSION_ID = "4";
  const ROBOFLOW_API_KEY = "UL8nLpCiEBGbxYqRq0nY";
  const ROBOFLOW_API_URL = `https://detect.roboflow.com/${ROBOFLOW_PROJECT_ID}/${ROBOFLOW_VERSION_ID}?api_key=${ROBOFLOW_API_KEY}&format=json&labels=on&stroke=3&confidence=40`;

  // --- Helper to draw detections on canvas ---
  function drawDetections(originalImage, predictions) {
    // Ensure canvas matches original image dimensions for drawing
    overlayCanvas.width = originalImage.naturalWidth;
    overlayCanvas.height = originalImage.naturalHeight;

    // First, draw the original image onto the canvas
    ctx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
    ctx.drawImage(
      originalImage,
      0,
      0,
      overlayCanvas.width,
      originalImage.height
    );

    // Now, draw bounding boxes and labels on top
    ctx.strokeStyle = "lime";
    ctx.lineWidth = 2;
    ctx.font = "16px Arial";
    ctx.fillStyle = "lime";

    let detectedClasses = []; // To store labels for saving

    predictions.forEach((pred) => {
      // Direct access to x, y, width, height from the prediction object
      if (
        pred.x &&
        pred.y &&
        pred.width &&
        pred.height &&
        pred.class &&
        pred.confidence
      ) {
        const { x, y, width, height } = pred;
        const rectX = x - width / 2;
        const rectY = y - height / 2;

        ctx.strokeRect(rectX, rectY, width, height);
        let label = `${pred.class} (${Math.round(pred.confidence * 100)}%)`;
        ctx.fillText(label, rectX, rectY > 10 ? rectY - 5 : 10);

        detectedClasses.push(label); // Add formatted label to list
      } else {
        console.warn(
          "Prediction object missing required bounding box or class/confidence properties:",
          pred
        );
      }
    });

    // Set the Roboflow-generated label to the input field
    // Removed: imageLabelInput.value = lastDetectionLabel; // No longer setting a display field
    lastDetectionLabel =
      detectedClasses.length > 0
        ? detectedClasses.join(", ")
        : "No fish detected";
  }

  // --- Event Listener for the visible Choose Image BUTTON ---
  if (chooseImageButton && imageInput) {
    chooseImageButton.addEventListener("click", () => {
      imageInput.click();
    });
  } else {
    console.error(
      "Choose Image button or hidden file input not found. Upload functionality disabled."
    );
    showMessageBox(
      "Error: Fungsi unggah gambar tidak tersedia. Elemen HTML 'chooseImageButton' atau 'imageUpload' tidak ditemukan."
    );
  }

  // --- Event Listener for the hidden Image File INPUT (change event) ---
  if (imageInput) {
    imageInput.addEventListener("change", function (event) {
      const file = event.target.files[0];
      if (file && file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const imageDataUrl = e.target.result;

          // Display the original image immediately in the <img> tag
          uploadedImage.src = imageDataUrl;
          uploadedImage.style.display = "block";
          uploadedImage.style.width = "100%";
          uploadedImage.style.height = "auto";

          // Create a temporary Image object to get dimensions and send to Roboflow
          const tempImage = new Image();
          tempImage.onload = () => {
            currentOriginalImageForCanvas = tempImage; // Store original image for redrawing

            // Ensure overlayCanvas is visible and sized correctly
            overlayCanvas.style.display = "block"; // Make canvas visible
            overlayCanvas.width = tempImage.naturalWidth;
            overlayCanvas.height = tempImage.naturalHeight;

            // Clear previous canvas content
            ctx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
            // Draw original image on canvas (as drawDetections expects it initially)
            ctx.drawImage(
              tempImage,
              0,
              0,
              overlayCanvas.width,
              tempImage.height
            );

            // Convert original image on canvas to Blob for Roboflow API and saving
            overlayCanvas.toBlob((blob) => {
              console.log(
                "Original uploaded image processed to Blob. Sending to Roboflow."
              );
              sendToRoboflowAPI(blob, tempImage); // Pass original image for drawing context
            }, file.type);
          };
          tempImage.onerror = () => {
            console.error(
              "Failed to load image into temporary Image object for processing."
            );
            showMessageBox("Error: Gagal memuat gambar untuk diproses.");
          };
          tempImage.src = imageDataUrl; // Load image data into temporary Image object
        };
        reader.readAsDataURL(file);
      } else {
        uploadedImage.style.display = "none";
        overlayCanvas.style.display = "none"; // Hide canvas too
        currentOriginalImageForCanvas = null; // Clear original image reference
        lastDetectionLabel = ""; // Clear label
        // Removed: imageLabelInput.value = ""; // Clear label input
        showMessageBox(
          "Silakan pilih file gambar yang valid (contoh: JPG, PNG)."
        );
      }
    });
  } else {
    console.error(
      "Image upload input element with ID 'imageUpload' not found. Upload functionality disabled."
    );
    showMessageBox(
      "Error: Fungsi unggah gambar tidak tersedia. Elemen HTML 'imageUpload' tidak ditemukan."
    );
  }

  // --- Function to Send Image to Roboflow API ---
  async function sendToRoboflowAPI(imageBlob, originalImageForDrawing) {
    if (!imageBlob) {
      showMessageBox("No image data available to send to Roboflow API.");
      return;
    }

    const formData = new FormData();
    formData.append("file", imageBlob, "uploaded_image.png");

    console.log("Sending image to Roboflow (expecting JSON response)...");

    try {
      const response = await fetch(ROBOFLOW_API_URL, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorBody = await response.text();
        console.error("Roboflow API Error Response:", errorBody);
        throw new Error(
          `HTTP error ${response.status}: ${response.statusText}. Server says: ${errorBody}`
        );
      }

      const detectionData = await response.json(); // EXPECTING JSON now!
      console.log("Roboflow detection data received:", detectionData);

      if (detectionData.predictions && detectionData.predictions.length > 0) {
        // Draw detections on canvas (which already contains the original image)
        drawDetections(originalImageForDrawing, detectionData.predictions);
        // Hide the <img> tag as the canvas now has the image with detections
        uploadedImage.style.display = "none";
        showMessageBox("Deteksi berhasil!");
      } else {
        // No detections, so just display the original image on canvas
        ctx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
        ctx.drawImage(
          originalImageForDrawing,
          0,
          0,
          overlayCanvas.width,
          originalImageForDrawing.height
        );
        // Hide the <img> tag as the canvas now has the original image
        uploadedImage.style.display = "none";
        lastDetectionLabel = "No fish detected."; // Still set internal label
        // Removed: imageLabelInput.value = lastDetectionLabel; // No longer setting a display field
        showMessageBox("Tidak ada ikan terdeteksi.");
      }
    } catch (err) {
      console.error(
        "Gagal mengirim ke Roboflow API atau memproses respons JSON:",
        err
      );
      showMessageBox(
        "Gagal mendapatkan deteksi dari Roboflow. Cek konsol untuk detail."
      );
      lastDetectionLabel = "Detection failed."; // Still set internal label
      // Removed: imageLabelInput.value = lastDetectionLabel; // No longer setting a display field
      // On error, still try to show the original image on the canvas
      ctx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
      ctx.drawImage(
        originalImageForDrawing,
        0,
        0,
        overlayCanvas.width,
        originalImageForDrawing.height
      );
      uploadedImage.style.display = "none"; // Ensure <img> is hidden
    }
  }

  // --- Save Labeled Uploaded Image Functionality ---
  // MODIFIED: No longer checking for imageLabelInput element, as it's removed
  if (saveUploadButton) {
    saveUploadButton.addEventListener("click", async () => {
      // Check if the canvas has content (meaning an image was processed/detected)
      if (
        !overlayCanvas ||
        overlayCanvas.width === 0 ||
        overlayCanvas.height === 0 ||
        ctx.getImageData(0, 0, 1, 1).data[3] === 0
      ) {
        showMessageBox(
          "Tidak ada gambar terdeteksi untuk disimpan. Unggah gambar dan lakukan deteksi terlebih dahulu."
        );
        return;
      }
      // Check if Roboflow-generated label is valid
      if (
        !lastDetectionLabel ||
        lastDetectionLabel === "No fish detected" ||
        lastDetectionLabel === "Detection failed."
      ) {
        showMessageBox(
          "Tidak ada label deteksi yang valid untuk disimpan. Lakukan deteksi terlebih dahulu."
        );
        return;
      }

      // Convert the *current content of the overlayCanvas* to a Blob
      overlayCanvas.toBlob(async (blob) => {
        await saveImageToBackend(blob, lastDetectionLabel); // Pass the labeled image blob
        // Removed: imageLabelInput.value = ''; // No longer clearing a display field
        showMessageBox(
          "Gambar berhasil disimpan dengan label: " + lastDetectionLabel
        ); // Provide explicit feedback
        // Optionally, clear the canvas/image after saving if desired
        // uploadedImage.style.display = 'none';
        // overlayCanvas.style.display = 'none';
        // lastDetectionLabel = "";
      }, "image/png");
    });
  } else {
    console.warn(
      "Save button not found for picture detection. Save functionality disabled."
    );
  }
});
