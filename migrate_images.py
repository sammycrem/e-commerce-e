
import os
import sys
from PIL import Image
from app.app import app
from app.extensions import db
from app.models import ProductImage, VariantImage
from app.utils import convert_to_webp, generate_image_icon

def migrate():
    with app.app_context():
        # Update Database URLs first
        print("Updating database URLs...")

        p_images = ProductImage.query.all()
        for img in p_images:
            if img.url and not img.url.endswith('.webp'):
                base, _ = os.path.splitext(img.url)
                img.url = base + '.webp'

        v_images = VariantImage.query.all()
        for img in v_images:
            if img.url and not img.url.endswith('.webp'):
                base, _ = os.path.splitext(img.url)
                img.url = base + '.webp'

        db.session.commit()
        print("Database updated.")

        # Process Files
        static_dirs = [
            os.path.join(app.root_path, 'static', 'ec', 'products', 'img'),
            os.path.join(app.root_path, 'static', 'uploads', 'products')
        ]

        for sdir in static_dirs:
            if not os.path.exists(sdir):
                continue

            print(f"Processing directory: {sdir}")
            for root, dirs, files in os.walk(sdir):
                for f in files:
                    if f.endswith('.webp'):
                        # If it's a webp, ensure icon exists and is 300px
                        if not f.endswith('_icon.webp'):
                            base = os.path.splitext(f)[0]
                            icon_name = base + '_icon.webp'
                            icon_path = os.path.join(root, icon_name)
                            # Regenerate icon to be 300px (even if it exists, to be sure)
                            generate_image_icon(os.path.join(root, f), icon_path, height=300)
                        continue

                    if f.endswith(('.jpg', '.jpeg', '.png', '.gif')):
                        if f.endswith('_icon.jpg') or f.endswith('_icon.png') or f.endswith('_icon.jpeg'):
                            # Old icon, just remove it later
                            continue

                        input_path = os.path.join(root, f)
                        base = os.path.splitext(f)[0]
                        output_path = os.path.join(root, base + '.webp')
                        icon_path = os.path.join(root, base + '_icon.webp')

                        print(f"Converting {f} to webp and generating icon...")
                        if convert_to_webp(input_path, output_path):
                            generate_image_icon(output_path, icon_path, height=300)
                            # Remove original and old icons
                            os.remove(input_path)
                            # Try to remove old icon if it exists
                            for ext in ['.jpg', '.jpeg', '.png']:
                                old_icon = os.path.join(root, base + '_icon' + ext)
                                if os.path.exists(old_icon):
                                    os.remove(old_icon)

        print("Migration complete.")

if __name__ == "__main__":
    migrate()
