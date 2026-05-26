import os
from PIL import Image

def resize_and_optimize():
    static_dir = r"c:\Users\Kino\Github\Rebalanceador-90-5-5\static"
    
    # 1. Load the huge favicon.png which we'll use as the source (1024x1024 master)
    source_path = os.path.join(static_dir, "favicon.png")
    if not os.path.exists(source_path):
        print(f"Error: Source favicon.png not found at {source_path}")
        return
        
    print(f"Loaded master image from {source_path}")
    
    with Image.open(source_path) as img:
        # Ensure it's RGBA
        if img.mode != 'RGBA':
            img = img.convert('RGBA')
            
        # Target sizes to generate/overwrite:
        
        # a) logo.webp: 128x128 highly compressed WebP for web displays
        logo_webp_path = os.path.join(static_dir, "logo.webp")
        img_logo = img.resize((128, 128), Image.Resampling.LANCZOS)
        img_logo.save(logo_webp_path, "WEBP", quality=85)
        print(f"Generated optimized logo.webp (128x128) at {logo_webp_path}, Size: {os.path.getsize(logo_webp_path)} bytes")

        # b) logo.png: 128x128 optimized PNG fallback
        logo_png_path = os.path.join(static_dir, "logo.png")
        img_logo.save(logo_png_path, "PNG", optimize=True)
        print(f"Generated optimized logo.png (128x128) at {logo_png_path}, Size: {os.path.getsize(logo_png_path)} bytes")

        # c) pwa-192x192.png: exactly 192x192 PNG
        pwa192_path = os.path.join(static_dir, "pwa-192x192.png")
        img_192 = img.resize((192, 192), Image.Resampling.LANCZOS)
        img_192.save(pwa192_path, "PNG", optimize=True)
        print(f"Generated optimized pwa-192x192.png at {pwa192_path}, Size: {os.path.getsize(pwa192_path)} bytes")

        # d) pwa-512x512.png: exactly 512x512 PNG
        pwa512_path = os.path.join(static_dir, "pwa-512x512.png")
        img_512 = img.resize((512, 512), Image.Resampling.LANCZOS)
        img_512.save(pwa512_path, "PNG", optimize=True)
        print(f"Generated optimized pwa-512x512.png at {pwa512_path}, Size: {os.path.getsize(pwa512_path)} bytes")

        # e) favicon.png: 32x32 extremely tiny PNG (standard favicon size)
        img_fav = img.resize((32, 32), Image.Resampling.LANCZOS)
        img_fav.save(source_path, "PNG", optimize=True)
        print(f"Overwrote favicon.png with optimized 32x32 version, New Size: {os.path.getsize(source_path)} bytes")

if __name__ == "__main__":
    resize_and_optimize()
