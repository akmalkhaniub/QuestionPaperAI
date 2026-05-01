import io
import os
from flask import Flask, request, jsonify
from PIL import Image
import numpy as np
import cv2
import pytesseract

app = Flask(__name__)

# --- Utility Functions ---
def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in {'png', 'jpg', 'jpeg'}

def preprocess_image(image):
    # Convert to grayscale, blur, and threshold
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    blur = cv2.GaussianBlur(gray, (5, 5), 0)
    _, thresh = cv2.threshold(blur, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
    return thresh

def extract_text(image):
    # Use pytesseract to extract text
    return pytesseract.image_to_string(image)

def detect_marks(thresh_img):
    # Find contours and filter by area/shape to detect filled circles or checks
    contours, _ = cv2.findContours(thresh_img, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    marks = []
    for cnt in contours:
        area = cv2.contourArea(cnt)
        if area > 200:  # Tune this threshold as needed
            x, y, w, h = cv2.boundingRect(cnt)
            roi = thresh_img[y:y+h, x:x+w]
            # Simple heuristic: if region is dense, likely a filled circle or check
            fill_ratio = cv2.countNonZero(roi) / (w * h)
            if fill_ratio > 0.4:  # Tune as needed
                marks.append({'x': int(x), 'y': int(y), 'w': int(w), 'h': int(h), 'fill_ratio': float(fill_ratio)})
    return marks

# --- API Endpoint ---
@app.route('/scan', methods=['POST'])
def scan_sheet():
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400
    file = request.files['file']
    if file.filename == '' or not allowed_file(file.filename):
        return jsonify({'error': 'Invalid file'}), 400
    img_bytes = file.read()
    image = Image.open(io.BytesIO(img_bytes)).convert('RGB')
    open_cv_image = np.array(image)
    open_cv_image = open_cv_image[:, :, ::-1].copy()  # RGB to BGR

    # Preprocess and OCR
    thresh = preprocess_image(open_cv_image)
    text = extract_text(open_cv_image)
    marks = detect_marks(thresh)

    # TODO: Map marks to MCQ choices based on template/layout (requires further calibration)
    # For now, just return bounding boxes and OCR text
    return jsonify({
        'ocr_text': text,
        'marks': marks
    })

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5001))
    app.run(host='0.0.0.0', port=port, debug=True)
