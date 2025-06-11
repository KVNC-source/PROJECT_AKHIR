// src/utils/saveImage.js
// This module provides functions for displaying custom messages and
// sending image data with a label to the backend server.

/**
 * Displays a custom message box to the user.
 * Instead of using window.alert(), this provides a more controlled UI.
 * @param {string} message - The message to display.
 */
export function showMessageBox(message) {
  const messageBox = document.getElementById("messageBox");
  const messageBoxContent = document.getElementById("messageBoxContent");
  const messageBoxClose = document.getElementById("messageBoxClose");

  if (messageBox && messageBoxContent && messageBoxClose) {
    messageBoxContent.textContent = message;
    messageBox.classList.remove("hidden"); // Show the message box

    messageBoxClose.onclick = () => {
      messageBox.classList.add("hidden"); // Hide the message box on close button click
    };
  } else {
    // Fallback for cases where message box elements are not found
    console.warn("Message box elements not found. Using alert() as fallback.");
    alert(message);
  }
}

/**
 * Sends image data (Blob) and an associated label to the backend server.
 * @param {Blob} imageDataBlob - The Blob object of the image to save.
 * @param {string} label - The label for the image.
 * @returns {Promise<void>}
 */
export async function saveImageToBackend(imageDataBlob, label) {
  if (!imageDataBlob) {
    showMessageBox(
      "No image data to save. Please capture or upload an image first."
    );
    return;
  }

  // Trim whitespace from the label and check if it's empty
  if (!label || label.trim() === "") {
    showMessageBox("Please provide a label for the image before saving.");
    return;
  }

  // Create a FormData object to send both the image file and the label.
  // FormData is essential for sending files via POST requests.
  const formData = new FormData();
  // Append the image Blob. The third argument is the filename for the server.
  formData.append("image", imageDataBlob, `labeled_image-${Date.now()}.png`);
  // Append the text label.
  formData.append("label", label);

  try {
    // Send a POST request to the '/upload-image' endpoint on your backend.
    // Vite's proxy will redirect this to http://localhost:3001/upload-image.
    const response = await fetch("/upload-image", {
      method: "POST",
      body: formData, // The FormData object handles setting the correct 'Content-Type' header
    });

    const result = await response.json(); // Parse the JSON response from the server

    if (response.ok) {
      // If the server responded with a success status (2xx)
      showMessageBox(
        `Image saved: ${result.filename} with label: '${result.label}'`
      );
      // You might want to clear the label input field here in the calling component
    } else {
      // If the server responded with an error status
      showMessageBox(
        `Error saving image: ${result.message || "Unknown error"}`
      );
    }
  } catch (error) {
    // Handle network errors (e.g., server not running, no internet)
    console.error("Network Error during image save:", error);
    showMessageBox(
      `Failed to connect to the server. Please ensure the backend server is running on http://localhost:3001.`
    );
  }
}
