
"""
CloudPix - Image Processing Engine

Processes images by:
1. Resizing them
2. Generating thumbnails
3. Converting them to grayscale
"""

from pathlib import Path
from PIL import Image, ImageOps


def process_image(input_path, output_dir="output"):
    """
    Process an image and save three versions.

    Args:
        input_path: Path to the original image.
        output_dir: Directory where processed images are saved.

    Returns:
        Dictionary containing paths to processed images.
    """

    input_path = Path(input_path)
    output_dir = Path(output_dir)

    if not input_path.exists():
        raise FileNotFoundError(f"Image not found: {input_path}")

    output_dir.mkdir(parents=True, exist_ok=True)

    # Open image and correct its orientation
    with Image.open(input_path) as original:
        image = ImageOps.exif_transpose(original)

        # Convert to RGB for consistent JPEG output
        if image.mode in ("RGBA", "LA"):
            rgba = image.convert("RGBA")
            background = Image.new("RGB", rgba.size, "white")
            background.paste(rgba, mask=rgba.getchannel("A"))
            image = background
        else:
            image = image.convert("RGB")

        # 1. Resize image, maintaining aspect ratio
        resized = image.copy()
        resized.thumbnail((800, 800), Image.Resampling.LANCZOS)

        resized_path = output_dir / "resized.jpg"
        resized.save(resized_path, "JPEG", quality=85)

        # 2. Generate thumbnail
        thumbnail = image.copy()
        thumbnail.thumbnail((200, 200), Image.Resampling.LANCZOS)

        thumbnail_path = output_dir / "thumbnail.jpg"
        thumbnail.save(thumbnail_path, "JPEG", quality=85)

        # 3. Convert image to grayscale
        grayscale = ImageOps.grayscale(image)

        grayscale_path = output_dir / "grayscale.jpg"
        grayscale.save(grayscale_path, "JPEG", quality=85)

    results = {
        "resized": resized_path,
        "thumbnail": thumbnail_path,
        "grayscale": grayscale_path
    }

    print("\nCloudPix: Image processing completed!")
    for name, path in results.items():
        print(f"{name.capitalize()}: {path}")

    return results


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(
        description="CloudPix Image Processing Engine"
    )
    parser.add_argument("image", help="Path to the input image")
    args = parser.parse_args()

    process_image(args.image)
