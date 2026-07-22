"""Generate TokoMart app icon (Concept A) at multiple sizes."""
import math
import os
from PIL import Image, ImageDraw, ImageFont

def draw_icon(size):
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    s = size

    # Rounded rectangle background (indigo gradient via two passes)
    radius = int(s * 0.225)

    def rounded_rect(draw, xy, radius, fill):
        x0, y0, x1, y1 = xy
        draw.rectangle([x0 + radius, y0, x1 - radius, y1], fill=fill)
        draw.rectangle([x0, y0 + radius, x1, y1 - radius], fill=fill)
        draw.ellipse([x0, y0, x0 + radius * 2, y0 + radius * 2], fill=fill)
        draw.ellipse([x1 - radius * 2, y0, x1, y0 + radius * 2], fill=fill)
        draw.ellipse([x0, y1 - radius * 2, x0 + radius * 2, y1], fill=fill)
        draw.ellipse([x1 - radius * 2, y1 - radius * 2, x1, y1], fill=fill)

    # Base color: indigo #4338CA
    rounded_rect(draw, [0, 0, s, s], radius, (67, 56, 202, 255))

    # Top-left highlight overlay for gradient feel
    overlay = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    ov_draw = ImageDraw.Draw(overlay)
    for i in range(int(s * 0.6)):
        alpha = int(55 * (1 - i / (s * 0.6)))
        ov_draw.ellipse(
            [-int(s * 0.2) + i // 4, -int(s * 0.2) + i // 4,
             int(s * 0.75) - i // 4, int(s * 0.75) - i // 4],
            fill=(99, 102, 241, alpha),
        )
    img = Image.alpha_composite(img, overlay)
    draw = ImageDraw.Draw(img)

    # --- Shopping bag ---
    pad = s * 0.22
    bag_l = int(pad)
    bag_r = int(s - pad)
    bag_t = int(s * 0.44)
    bag_b = int(s * 0.84)
    bag_r_corner = int(s * 0.09)
    stroke = max(2, int(s * 0.038))

    # Bag body fill (light overlay)
    rounded_rect(draw, [bag_l, bag_t, bag_r, bag_b], bag_r_corner, (255, 255, 255, 30))
    # Bag body stroke
    for i in range(stroke):
        o = i
        rounded_rect(draw, [bag_l + o, bag_t + o, bag_r - o, bag_b - o], max(1, bag_r_corner - o), None)
    # Draw stroke as outline via ImageDraw arc/lines workaround — use rectangle lines
    # Re-draw crisp stroke
    draw.rounded_rectangle([bag_l, bag_t, bag_r, bag_b], radius=bag_r_corner,
                            outline=(255, 255, 255, 230), width=stroke)

    # Handle
    handle_l = int(s * 0.36)
    handle_r = int(s * 0.64)
    handle_top = int(s * 0.22)
    ctrl_y = int(s * 0.14)
    # Draw handle as arc using ellipse crop
    arc_box = [handle_l, handle_top * 2 - bag_t, handle_r, bag_t]
    draw.arc(arc_box, start=200, end=340, fill=(255, 255, 255, 230), width=stroke)

    # --- T lettermark ---
    t_size = int(s * 0.27)
    cx = s // 2
    cy = int(s * 0.66)
    bar_h = max(2, int(t_size * 0.22))
    stem_w = max(2, int(t_size * 0.22))

    # Horizontal bar
    draw.rectangle([cx - t_size // 2, cy - t_size // 2,
                    cx + t_size // 2, cy - t_size // 2 + bar_h],
                   fill=(255, 255, 255, 245))
    # Vertical stem
    draw.rectangle([cx - stem_w // 2, cy - t_size // 2,
                    cx + stem_w // 2, cy + t_size // 2],
                   fill=(255, 255, 255, 245))

    # --- Amber dot (top right) ---
    dot_r = int(s * 0.095)
    dot_cx = int(s * 0.74)
    dot_cy = int(s * 0.30)
    draw.ellipse([dot_cx - dot_r, dot_cy - dot_r, dot_cx + dot_r, dot_cy + dot_r],
                 fill=(245, 158, 11, 255))

    return img


# Output paths: Android mipmap densities
SIZES = {
    "mdpi":   48,
    "hdpi":   72,
    "xhdpi":  96,
    "xxhdpi": 144,
    "xxxhdpi": 192,
}

base = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
android_res = os.path.join(base, "android", "app", "src", "main", "res")

for density, px in SIZES.items():
    folder = os.path.join(android_res, f"mipmap-{density}")
    os.makedirs(folder, exist_ok=True)
    icon = draw_icon(px)
    out = os.path.join(folder, "ic_launcher.png")
    icon.convert("RGB").save(out, "PNG")
    print(f"  {density} ({px}px) saved")

# Also save 1024px source to assets
assets_dir = os.path.join(base, "assets", "images")
os.makedirs(assets_dir, exist_ok=True)
src = draw_icon(1024)
src.convert("RGB").save(os.path.join(assets_dir, "app_icon.png"), "PNG")
print("  1024px source saved to assets/images/app_icon.png")

print("Done.")
