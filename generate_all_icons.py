
import os
import sys
from PIL import Image

# Adjust path to allow importing from app package
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '.')))

from app.utils import generate_image_icon

def scan_and_generate(directory):
    print(f"Scanning directory: {directory}")
    for root, dirs, files in os.walk(directory):
        for file in files:
            if file.lower().endswith(('.png', '.jpg', '.jpeg', '.webp', '.gif')):
                if "_icon" in file:
                    continue

                input_path = os.path.join(root, file)

                dot_idx = input_path.rfind('.')
                output_path = input_path[:dot_idx] + "_icon" + input_path[dot_idx:]

                if not os.path.exists(output_path):
                    print(f"Generating icon for {input_path}...")
                    success = generate_image_icon(input_path, output_path, height=100)
                    if success:
                        print(f"  Success: {output_path}")
                    else:
                        print(f"  Failed: {input_path}")
                else:
                    # Optional: check if icon is correct height
                    pass

if __name__ == "__main__":
    static_dirs = [
        os.path.join('app', 'static', 'ec', 'products', 'img'),
        os.path.join('app', 'static', 'uploads', 'products')
    ]

    for d in static_dirs:
        if os.path.exists(d):
            scan_and_generate(d)
        else:
            print(f"Directory not found: {d}")
